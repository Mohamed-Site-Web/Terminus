// Vérifie l'histoire : liens cassés, drapeaux jamais posés, fins inatteignables.
// Puis simule des milliers de parties avec des choix au hasard.
// Usage : npm run check:story

import { CHARACTERS } from '../src/data/characters.js';
import { STOPS } from '../src/data/stops.js';
import { INCIDENTS, JUNCTIONS } from '../src/data/incidents.js';
import { ENDINGS } from '../src/data/endings.js';
import { ITEMS, FINDS, INVENTORY_SLOTS } from '../src/data/items.js';
import { createState } from '../src/systems/state.js';
import * as story from '../src/systems/story.js';

const errors = [];
const warnings = [];
const END_TYPES = ['board', 'leave', 'stay', 'terminus'];
const endingIds = new Set(ENDINGS.map((e) => e.id));
const stopIds = new Set(STOPS.map((s) => s.id));
const flagsSet = new Set();
const flagsRead = new Map(); // flag -> où il est lu
const itemsGiven = new Set();
const itemsRead = new Map(); // objet -> où il sert

function readCond(cond, where) {
  if (!cond) return;
  for (const raw of cond.split('&')) {
    const t = raw.trim().replace(/^!/, '');
    if (t.startsWith('has:')) {
      const id = t.slice(4);
      if (!ITEMS[id]) errors.push(`${where} : objet inconnu « ${id} »`);
      itemsRead.set(id, where);
      continue;
    }
    if (/^(sat|chaos|delay|aboard)\s*(>=|<=|>|<|==)/.test(t)) continue;
    if (!/^[\w:]+$/.test(t)) errors.push(`${where} : condition illisible « ${raw.trim()} »`);
    else if (!t.startsWith('incident:')) flagsRead.set(t, where);
  }
}

function variants(value) {
  return Array.isArray(value) ? value : [value];
}

// Objets donnés et repris par un choix ou une réplique. Reprendre un objet suppose de l'avoir.
function readItems(entry, where) {
  for (const id of [...(entry.give ?? []), ...(entry.take ?? [])]) {
    if (!ITEMS[id]) errors.push(`${where} : objet inconnu « ${id} »`);
  }
  for (const id of entry.give ?? []) itemsGiven.add(id);
  for (const id of entry.take ?? []) {
    if (!(entry.if ?? '').split('&').some((t) => t.trim() === `has:${id}`)) errors.push(`${where} : reprend « ${id} » sans condition has:${id}`);
    itemsRead.set(id, where);
  }
}

// Plus grand nombre de choix visibles en même temps, toutes situations confondues :
// on essaie chaque combinaison des objets, drapeaux et seuils cités par les conditions du nœud.
function maxVisible(choices) {
  const atoms = new Set();
  const levels = { sat: new Set([50]), chaos: new Set([0]), delay: new Set([0]), aboard: new Set([0]) };
  for (const ch of choices) {
    for (const raw of (ch.if ?? '').split('&')) {
      const t = raw.trim().replace(/^!/, '');
      const m = t.match(/^(sat|chaos|delay|aboard)\s*(?:>=|<=|>|<|==)\s*(-?\d+)$/);
      if (m) for (const d of [-1, 0, 1]) levels[m[1]].add(Number(m[2]) + d);
      else if (t) atoms.add(t);
    }
  }
  const list = [...atoms];
  let most = 0;
  for (let mask = 0; mask < 1 << list.length; mask++) {
    const on = list.filter((_, i) => mask & (1 << i));
    const base = { flags: new Set(on.filter((a) => !a.startsWith('has:'))), items: on.filter((a) => a.startsWith('has:')).map((a) => a.slice(4)), aboard: [] };
    for (const sat of levels.sat) for (const chaos of levels.chaos) for (const delay of levels.delay) for (const extra of levels.aboard) {
      const state = { ...base, sat, chaos, delay, extra };
      most = Math.max(most, choices.filter((ch) => story.evalCond(ch.if, state)).length);
    }
  }
  return most;
}

// ── Validation statique ──
for (const [id, c] of Object.entries(CHARACTERS)) {
  if (!c.name || !c.look || !c.nodes) errors.push(`${id} : name/look/nodes manquant`);
  if (c.dest && !stopIds.has(c.dest)) errors.push(`${id} : dest inconnue « ${c.dest} »`);
  for (const v of variants(c.start)) {
    const node = typeof v === 'object' ? v.node : v;
    if (typeof v === 'object') readCond(v.if, `${id}.start`);
    if (!c.nodes[node]) errors.push(`${id} : start pointe vers « ${node} » qui n'existe pas`);
  }
  for (const [nid, n] of Object.entries(c.nodes)) {
    const where = `${id}.${nid}`;
    for (const v of variants(n.text)) {
      if (typeof v === 'object') readCond(v.if, where);
      const t = typeof v === 'object' ? v.text : v;
      if (!t) errors.push(`${where} : texte vide`);
      else if (t.length > 230) warnings.push(`${where} : texte long (${t.length} car.), risque de débordement`);
    }
    if (n.show && !ITEMS[n.show]) errors.push(`${where} : show « ${n.show} » n'est pas un objet`);
    if (!n.choices) {
      if (n.take) errors.push(`${where} : une réplique sans choix ne peut pas reprendre d'objet`);
      readItems(n, where);
      if (!n.end && !n.ending) errors.push(`${where} : ni choix ni fin`);
      if (n.end && !END_TYPES.includes(n.end)) errors.push(`${where} : end inconnu « ${n.end} »`);
      continue;
    }
    const most = maxVisible(n.choices);
    if (most > story.MAX_CHOICES) errors.push(`${where} : jusqu'à ${most} choix visibles à la fois (maximum ${story.MAX_CHOICES})`);
    n.choices.forEach((ch, i) => {
      const w = `${where}[${i + 1}]`;
      readCond(ch.if, w);
      readItems(ch, w);
      (ch.set ?? []).forEach((f) => flagsSet.add(f));
      for (const who of ch.drop ?? []) if (!CHARACTERS[who]) errors.push(`${w} : drop « ${who} » n'est pas un personnage`);
      if (ch.end === 'board' && !c.dust) errors.push(`${id} : peut monter à bord mais n'a pas de dernière phrase (dust)`);
      const targets = ['next', 'end', 'ending'].filter((k) => ch[k]);
      if (targets.length !== 1) errors.push(`${w} : il faut exactement un de next / end / ending`);
      if (ch.next && !c.nodes[ch.next]) errors.push(`${w} : next « ${ch.next} » n'existe pas`);
      if (ch.end && !END_TYPES.includes(ch.end)) errors.push(`${w} : end inconnu « ${ch.end} »`);
      if (ch.ending && !endingIds.has(ch.ending)) errors.push(`${w} : fin « ${ch.ending} » inconnue`);
      if (ch.text.length > 60) warnings.push(`${w} : choix long (${ch.text.length} car.)`);
      for (const k of Object.keys(ch.fx ?? {})) {
        if (!['sat', 'chaos', 'delay'].includes(k)) errors.push(`${w} : effet inconnu « ${k} »`);
      }
    });
  }
}

const ends = STOPS.filter((s) => !s.next);
if (ends.length !== 1) errors.push(`il faut exactement un arrêt sans « next » (le terminus), trouvé : ${ends.map((s) => s.id).join(', ')}`);
for (const s of STOPS) {
  for (const v of variants(s.next ?? [])) {
    const target = typeof v === 'object' ? v.stop : v;
    if (typeof v === 'object') readCond(v.if, `arrêt ${s.id}.next`);
    if (!stopIds.has(target)) errors.push(`arrêt ${s.id} : next « ${target} » inconnu`);
  }
  if (s.next && Array.isArray(s.next) && typeof s.next.at(-1) === 'object') errors.push(`arrêt ${s.id} : next doit finir par un arrêt par défaut`);
  for (const p of s.passengers) {
    const e = typeof p === 'string' ? { char: p } : p;
    readCond(e.if, `arrêt ${s.id}`);
    if (!CHARACTERS[e.char]) errors.push(`arrêt ${s.id} : personnage « ${e.char} » inconnu`);
    else if (e.node && !CHARACTERS[e.char].nodes[e.node]) errors.push(`arrêt ${s.id} : nœud ${e.char}.${e.node} inconnu`);
    if (e.weight !== undefined && !(typeof e.weight === 'number' && e.weight >= 0)) errors.push(`arrêt ${s.id} : weight de ${e.char} doit être un nombre positif`);
    // Un personnage qui descend ici ne peut pas y monter.
    if (e.weight && CHARACTERS[e.char]?.dest === s.id) errors.push(`arrêt ${s.id} : ${e.char} est tiré au sort dans la gare où il descend`);
  }
  const pool = s.passengers.filter((p) => p.weight > 0);
  const doubles = pool.map((p) => p.char).filter((c, i, all) => all.indexOf(c) !== i);
  if (doubles.length) errors.push(`arrêt ${s.id} : ${doubles.join(', ')} en double dans le tirage`);
  if (s.pick !== undefined && !(Number.isInteger(s.pick) && s.pick >= 1)) errors.push(`arrêt ${s.id} : pick doit être un entier d'au moins 1`);
  if (pool.length && s.pick === undefined) errors.push(`arrêt ${s.id} : il y a des weight mais pas de pick`);
  if (s.pick > pool.length) errors.push(`arrêt ${s.id} : pick ${s.pick} mais seulement ${pool.length} personnage(s) à tirer`);
}

for (const inc of [...INCIDENTS, ...FINDS, ...JUNCTIONS]) {
  readCond(inc.if, `incident ${inc.id}`);
  for (const after of [].concat(inc.after)) {
    if (!stopIds.has(after)) errors.push(`incident ${inc.id} : arrêt « ${after} » inconnu`);
  }
  if (!CHARACTERS[inc.char]?.nodes[inc.node]) errors.push(`incident ${inc.id} : ${inc.char}.${inc.node} introuvable`);
}

const terminusEndings = ENDINGS.filter((e) => e.terminus);
if (terminusEndings.at(-1)?.if) errors.push('la dernière fin du terminus doit être sans condition (fin par défaut)');
terminusEndings.forEach((e) => readCond(e.if, `fin ${e.id}`));

for (const [flag, where] of flagsRead) {
  if (!flagsSet.has(flag)) errors.push(`${where} : le drapeau « ${flag} » n'est jamais posé`);
}
for (const [id, item] of Object.entries(ITEMS)) if (item.use) itemsRead.set(id, 'clic dans l\'inventaire');
for (const [id, where] of itemsRead) {
  if (!itemsGiven.has(id)) errors.push(`${where} : l'objet « ${id} » n'est jamais donné`);
}
for (const id of Object.keys(ITEMS)) {
  if (!itemsGiven.has(id)) warnings.push(`objet « ${id} » jamais donné`);
  if (!itemsRead.has(id)) warnings.push(`objet « ${id} » ne sert à rien`);
}

// ── Simulation ──
// Stratégies de joueur : au hasard, ou qui maximise un score (avec un peu de hasard pour départager).
const STRATEGIES = {
  hasard: () => 0,
  gentil: (c) => (c.fx?.sat ?? 0) - (c.fx?.chaos ?? 0) - risk(c),
  mechant: (c) => -(c.fx?.sat ?? 0) - risk(c),
  chaotique: (c) => (c.fx?.chaos ?? 0) - risk(c),
  lent: (c) => (c.fx?.delay ?? 0) - risk(c),
};

// Les joueurs qui suivent une stratégie évitent les choix qui arrêtent la partie.
function risk(c) {
  return c.ending || c.snap ? 50 : 0;
}

let maxItems = 0;

function runDialogue(charId, node, state, rng, strategy) {
  for (let guard = 0; guard < 50; guard++) {
    const choices = story.nodeChoices(charId, node, state);
    if (!choices.length) throw new Error(`${charId}.${node} : aucun choix disponible`);
    story.nodeText(charId, node, state);
    const scored = choices.map((c) => ({ c, s: strategy(c) + rng() * 4 }));
    const choice = scored.sort((a, b) => b.s - a.s)[0].c;
    for (const id of choice.take ?? []) {
      if (!state.items.includes(id)) throw new Error(`${charId}.${node} : reprend « ${id} » que le conducteur n'a pas`);
    }
    const { outcome } = story.applyChoice(charId, choice, state, rng);
    maxItems = Math.max(maxItems, state.items.length);
    if (state.items.length > INVENTORY_SLOTS) throw new Error(`inventaire plein : ${state.items.join(', ')}`);
    if (outcome.type === 'next') { node = outcome.node; continue; }
    return outcome;
  }
  throw new Error(`${charId} : boucle infinie dans le dialogue`);
}

function playOnce(rng, strategy) {
  const state = createState();
  for (let stop = story.currentStop(state); ; stop = story.advance(state)) {
    if (state.route.length > 30) throw new Error(`itinéraire sans fin : ${state.route.join(' → ')}`);
    story.alightAt(stop, state);
    const waiting = story.stopPassengers(stop, state, rng);
    const seen = (presence[stop.id] ??= { visits: 0, quai: [], chars: {} });
    seen.visits++;
    seen.quai[waiting.length] = (seen.quai[waiting.length] ?? 0) + 1;
    for (const p of waiting) {
      // Les retours (kevin.sprint…) sont comptés à part des tirages au sort.
      const key = p.weight === undefined && p.node ? `${p.char}.${p.node}` : p.char;
      seen.chars[key] = (seen.chars[key] ?? 0) + 1;
    }
    for (const p of waiting) {
      const out = runDialogue(p.char, story.startNode(p.char, state, p.node), state, rng, strategy);
      if (out.type === 'ending') return { ending: out.ending, state };
      if (out.type === 'terminus') return { ending: story.terminusEnding(state), state };
      const over = story.checkGameOver(state);
      if (over) return { ending: over, state };
    }
    if (!story.nextStop(stop, state)) return { ending: story.terminusEnding(state), state };
    story.departureEffects(state);
    let over = story.checkGameOver(state);
    if (over) return { ending: over, state };
    // Incident à bord, ronde, puis aiguillage, comme dans Ride.js
    for (const pick of [story.pickIncident, story.pickFind, story.pickJunction]) {
      const ev = pick(stop.id, state);
      if (!ev) continue;
      story.markIncident(ev, state);
      const out = runDialogue(ev.char, ev.node, state, rng, strategy);
      if (out.type === 'ending') return { ending: out.ending, state };
      if (out.type === 'terminus') return { ending: story.terminusEnding(state), state };
      over = story.checkGameOver(state);
      if (over) return { ending: over, state };
    }
  }
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RUNS = 1000;
const presence = {}; // arrêt -> { visits, quai: [nombre de fois avec n passagers], chars: { perso: nombre de fois sur le quai } }
const results = {}; // stratégie -> { fin: nombre }
const counts = {};
const visited = new Set();
const stopsSeen = {};
const routeLengths = new Set();
let crashes = 0;
if (!errors.length) {
  for (const [name, strategy] of Object.entries(STRATEGIES)) {
    results[name] = {};
    for (let i = 0; i < RUNS; i++) {
      try {
        const { ending, state } = playOnce(mulberry32(i + 1), strategy);
        results[name][ending] = (results[name][ending] ?? 0) + 1;
        counts[ending] = (counts[ending] ?? 0) + 1;
        state.history.forEach((h) => visited.add(h.char));
        state.route.forEach((id) => (stopsSeen[id] = (stopsSeen[id] ?? 0) + 1));
        if (state.route.at(-1) === 'terminus') routeLengths.add(state.route.length);
      } catch (e) {
        crashes++;
        if (crashes <= 3) errors.push(`simulation ${name} #${i} : ${e.message}`);
      }
    }
  }
  for (const e of ENDINGS) if (!counts[e.id]) warnings.push(`fin « ${e.id} » jamais atteinte`);
  for (const id of Object.keys(CHARACTERS)) if (!visited.has(id)) warnings.push(`personnage « ${id} » jamais rencontré`);
  for (const s of STOPS) if (!stopsSeen[s.id]) warnings.push(`arrêt « ${s.id} » jamais atteint`);
  for (const s of STOPS) {
    const empty = presence[s.id]?.quai[0] ?? 0;
    if (empty) warnings.push(`arrêt « ${s.id} » : quai vide dans ${empty} partie(s)`);
  }
}

// ── Rapport ──
const nodes = Object.values(CHARACTERS).reduce((n, c) => n + Object.keys(c.nodes).length, 0);
console.log(`Histoire : ${Object.keys(CHARACTERS).length} personnages, ${nodes} répliques, ${STOPS.length} arrêts, ${INCIDENTS.length} incidents, ${JUNCTIONS.length} aiguillages, ${ENDINGS.length} fins.`);
const total = RUNS * Object.keys(STRATEGIES).length;
if (Object.keys(stopsSeen).length) {
  console.log(`  arrêts      → ${STOPS.map((s) => `${s.id} ${Math.round(((stopsSeen[s.id] ?? 0) / total) * 100)}%`).join(', ')}`);
  console.log(`  trajets complets de ${[...routeLengths].sort().join(' ou ')} arrêts`);
  console.log(`  inventaire  → ${Object.keys(ITEMS).length} objets, jusqu'à ${maxItems} à la fois sur ${INVENTORY_SLOTS} cases`);
}
// Qui attend sur le quai : fréquence observée de chaque personnage, sur les parties qui passent par l'arrêt.
if (Object.keys(presence).length) {
  console.log('  sur le quai (poids → fréquence observée) :');
  for (const s of STOPS) {
    const seen = presence[s.id];
    if (!seen) continue;
    const weights = Object.fromEntries(s.passengers.filter((p) => p.weight > 0).map((p) => [p.char, p.weight]));
    const line = Object.entries(seen.chars)
      .sort((x, y) => y[1] - x[1])
      .map(([id, n]) => `${id} ${weights[id] ? `${weights[id]}→` : ''}${Math.round((n / seen.visits) * 100)}%`)
      .join(', ');
    const sizes = seen.quai.map((n, k) => (n ? `${k} : ${Math.round((n / seen.visits) * 100)}%` : null)).filter(Boolean).join(', ');
    console.log(`    ${s.id.padEnd(12)} ${line}`);
    console.log(`    ${''.padEnd(12)} passagers sur le quai → ${sizes}`);
  }
}
for (const [name, res] of Object.entries(results)) {
  const line = Object.entries(res)
    .sort((x, y) => y[1] - x[1])
    .map(([id, n]) => `${id} ${Math.round((n / RUNS) * 100)}%`)
    .join(', ');
  console.log(`  ${name.padEnd(10)} → ${line}`);
}
warnings.forEach((w) => console.log(`⚠  ${w}`));
errors.forEach((e) => console.log(`✖  ${e}`));
console.log(errors.length ? `\n${errors.length} erreur(s).` : '\nOK : aucune erreur.');
process.exit(errors.length ? 1 : 0);
