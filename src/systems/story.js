// Moteur narratif : conditions, effets des choix, arrêts, incidents et fins.
// Ne dépend pas de Phaser : les scènes l'appellent, tools/check-story.js le simule.

import { CHARACTERS } from '../data/characters.js';
import { STOPS } from '../data/stops.js';
import { INCIDENTS, JUNCTIONS } from '../data/incidents.js';
import { ENDINGS } from '../data/endings.js';
import { FINDS, ITEMS } from '../data/items.js';
import { CAPACITY, clampStats, passengerCount } from './state.js';

export const MAX_CHOICES = 3;
// Retard (en minutes) au-delà duquel la compagnie arrête le train, et fin d'un claquement de doigts raté.
export const MAX_DELAY = 60;
const SNAP_ENDING = 'poussiere';
const STAT_TERM = /^(sat|chaos|delay|aboard)\s*(>=|<=|>|<|==)\s*(-?\d+)$/;

function statValue(state, key) {
  return key === 'aboard' ? passengerCount(state) : state[key];
}

// "flag", "!flag", "has:objet", "!has:objet", "chaos>=50", combinés avec "&". Pas de condition = vrai.
export function evalCond(cond, state) {
  if (!cond) return true;
  return cond.split('&').every((raw) => {
    const term = raw.trim();
    const m = term.match(STAT_TERM);
    if (m) {
      const v = statValue(state, m[1]);
      const n = Number(m[3]);
      switch (m[2]) {
        case '>=': return v >= n;
        case '<=': return v <= n;
        case '>': return v > n;
        case '<': return v < n;
        default: return v === n;
      }
    }
    const negated = term.startsWith('!');
    const name = negated ? term.slice(1) : term;
    const value = name.startsWith('has:') ? state.items.includes(name.slice(4)) : state.flags.has(name);
    return negated ? !value : value;
  });
}

// Un champ peut être une valeur simple ou une liste [{ if, ... }, ..., défaut].
function pickVariant(value, state, key) {
  if (!Array.isArray(value)) return value;
  for (const v of value) {
    if (typeof v !== 'object') return v;
    if (evalCond(v.if, state)) return v[key];
  }
  return undefined;
}

export function getCharacter(id) {
  const c = CHARACTERS[id];
  if (!c) throw new Error(`Personnage inconnu : ${id}`);
  return c;
}

export function startNode(charId, state, forcedNode) {
  return forcedNode ?? pickVariant(getCharacter(charId).start, state, 'node');
}

export function nodeText(charId, nodeId, state) {
  const node = getCharacter(charId).nodes[nodeId];
  const text = pickVariant(node.text, state, 'text') ?? '';
  return text.replace(/\{(sat|chaos|delay)\}/g, (_, k) => String(state[k]));
}

// Choix visibles d'un nœud. Un nœud sans choix mais avec `end` affiche un bouton « Continuer ».
export function nodeChoices(charId, nodeId, state) {
  const node = getCharacter(charId).nodes[nodeId];
  if (!node.choices) return [{ text: 'Continuer', end: node.end, ending: node.ending, give: node.give, take: node.take, continue: true }];
  return node.choices.filter((c) => evalCond(c.if, state)).slice(0, MAX_CHOICES);
}

// Un passager quitte le train : il n'est plus à bord, et son drapeau `<id>_aboard` tombe.
function leaveTrain(state, id) {
  state.aboard = state.aboard.filter((x) => x !== id);
  state.flags.delete(`${id}_aboard`);
}

// Claquement de doigts : la moitié des passagers (arrondie au-dessus) disparaît, au hasard.
function snapHalf(state, rng) {
  const pool = [...state.aboard];
  const dusted = [];
  for (let n = Math.ceil(pool.length / 2); n > 0; n--) dusted.push(...pool.splice(Math.floor(rng() * pool.length), 1));
  for (const id of dusted) leaveTrain(state, id);
  state.extra = Math.floor(state.extra / 2);
  return dusted;
}

// Dernière phrase d'un passager qui part en fumée.
export function lastWords(charId) {
  return getCharacter(charId).dust ?? '…';
}

// Applique un choix. Renvoie ce qui s'est passé pour que la scène l'affiche.
// `rng` ne sert qu'aux choix `snap` (qui disparaît, et si le conducteur y passe aussi).
export function applyChoice(charId, choice, state, rng = Math.random) {
  const before = { sat: state.sat, chaos: state.chaos, delay: state.delay };
  for (const [k, v] of Object.entries(choice.fx ?? {})) state[k] += v;
  clampStats(state);
  for (const f of choice.set ?? []) state.flags.add(f);
  for (const f of choice.unset ?? []) state.flags.delete(f);
  if (choice.add) state.extra += choice.add;
  // drop : ces passagers descendent du train en route.
  for (const id of choice.drop ?? []) leaveTrain(state, id);
  // give : le conducteur reçoit l'objet ; take : il le remet.
  const lost = (choice.take ?? []).filter((id) => state.items.includes(id));
  state.items = state.items.filter((id) => !lost.includes(id));
  const gained = (choice.give ?? []).filter((id) => !state.items.includes(id));
  state.items.push(...gained);
  if (!choice.continue) {
    state.decisions++;
    state.history.push({ char: charId, choice: choice.text });
  }

  let outcome = null;
  if (choice.ending) outcome = { type: 'ending', ending: choice.ending };
  else if (choice.next) outcome = { type: 'next', node: choice.next };
  else outcome = { type: choice.end ?? 'leave' };

  if (outcome.type === 'board' && !state.aboard.includes(charId)) state.aboard.push(charId);

  // snap : la moitié du train disparaît (outcome.dusted), et une fois sur deux le conducteur aussi.
  if (choice.snap) {
    const dusted = snapHalf(state, rng);
    outcome = rng() < 0.5 ? { type: 'ending', ending: SNAP_ENDING, dusted } : { ...outcome, dusted };
  }

  const deltas = {
    sat: state.sat - before.sat,
    chaos: state.chaos - before.chaos,
    delay: state.delay - before.delay,
    gained,
    lost,
  };
  return { outcome, deltas };
}

const STOP_BY_ID = Object.fromEntries(STOPS.map((s) => [s.id, s]));

export function getStop(id) {
  const s = STOP_BY_ID[id];
  if (!s) throw new Error(`Arrêt inconnu : ${id}`);
  return s;
}

export function currentStop(state) {
  return getStop(state.stop);
}

// Arrêt suivant selon les drapeaux posés (null au terminus).
export function nextStop(stop, state) {
  const id = pickVariant(stop.next, state, 'stop');
  return id ? getStop(id) : null;
}

// Nombre d'arrêts après `stop` jusqu'au terminus inclus, sur l'itinéraire tel qu'il est maintenant.
export function stopsLeft(stop, state) {
  let n = 0;
  for (let s = nextStop(stop, state); s && n < 50; s = nextStop(s, state)) n++;
  return n;
}

// Le train quitte l'arrêt actuel pour le suivant.
export function advance(state) {
  const next = nextStop(currentStop(state), state);
  state.stop = next.id;
  state.route.push(next.id);
  state.stopIndex++;
  return next;
}

export const MAX_WAITING = 3;

// Tirage au sort sans remise : chaque entrée a une chance de `weight` sur la somme des poids encore en jeu.
function drawWeighted(pool, count, rng) {
  const left = [...pool];
  const drawn = [];
  while (drawn.length < count && left.length) {
    let r = rng() * left.reduce((sum, p) => sum + p.weight, 0);
    let i = left.findIndex((p) => (r -= p.weight) < 0);
    if (i < 0) i = left.length - 1;
    drawn.push(...left.splice(i, 1));
  }
  return drawn;
}

// Passagers qui attendent sur le quai (3 maximum, dans l'ordre du fichier). À appeler une seule fois par arrêt.
// Les entrées sans `weight` sont toujours là. Les entrées avec `weight` sont tirées au sort : `pick` passagers
// par arrêt, jamais un personnage déjà croisé à un arrêt précédent (state.met) : les poids des absents
// disparaissent du tirage et les autres se partagent les 100 %. Un passager à bord n'attend pas sur le quai,
// sauf si son entrée porte `aboard: true` : il descend alors parler au conducteur.
export function stopPassengers(stop, state, rng = Math.random) {
  const entries = stop.passengers
    .map((p) => (typeof p === 'string' ? { char: p } : p))
    .filter((p) => evalCond(p.if, state) && (p.aboard || !state.aboard.includes(p.char)));
  const fixed = entries.filter((p) => p.weight === undefined);
  const here = new Set(fixed.map((p) => p.char));
  const pool = entries.filter((p) => p.weight > 0 && !state.met.includes(p.char) && !here.has(p.char));
  const chosen = new Set([...fixed, ...drawWeighted(pool, stop.pick ?? pool.length, rng)]);
  const waiting = entries.filter((p) => chosen.has(p)).slice(0, MAX_WAITING);
  for (const p of waiting) if (!state.met.includes(p.char)) state.met.push(p.char);
  return waiting;
}

// Passagers arrivés à destination : ils descendent, petit bonus de satisfaction.
export function alightAt(stop, state) {
  const leaving = state.aboard.filter((id) => getCharacter(id).dest === stop.id);
  for (const id of leaving) leaveTrain(state, id);
  state.sat += leaving.length * 3;
  clampStats(state);
  return leaving;
}

// Au départ d'un arrêt : la surcharge fait monter le chaos.
export function departureEffects(state) {
  const over = passengerCount(state) - CAPACITY;
  if (over <= 0) return 0;
  const chaos = Math.min(20, over * 3);
  state.chaos += chaos;
  clampStats(state);
  return chaos;
}

// Un seul incident par trajet : le premier qui correspond, jamais deux fois le même.
function pickEvent(list, stopId, state) {
  return list.find((i) => [].concat(i.after).includes(stopId) && !state.flags.has(`incident:${i.id}`) && evalCond(i.if, state));
}

export function pickIncident(stopId, state) {
  return pickEvent(INCIDENTS, stopId, state);
}

// Aiguillage : rencontre sur la voie qui peut faire bifurquer la ligne.
export function pickJunction(stopId, state) {
  return pickEvent(JUNCTIONS, stopId, state);
}

// Ronde à bord : le conducteur fouille le train et choisit un objet.
export function pickFind(stopId, state) {
  return pickEvent(FINDS, stopId, state);
}

export function markIncident(incident, state) {
  state.flags.add(`incident:${incident.id}`);
}

// Clic sur un objet de l'inventaire. Renvoie { message, done, flag }, ou null si l'objet ne se clique pas.
// Un objet qui n'aurait aucun effet n'est pas consommé.
export function useItem(id, state) {
  const use = ITEMS[id]?.use;
  if (!use || !state.items.includes(id)) return null;
  const idle = { message: use.idle, done: false };
  if (use.flag && state.flags.has(use.flag)) return idle;
  if (use.fx) {
    const { deltas } = applyChoice(id, { fx: use.fx, continue: true }, state);
    if (!deltas.sat && !deltas.chaos && !deltas.delay) return idle;
  }
  if (use.flag) state.flags.add(use.flag);
  if (use.consume) state.items = state.items.filter((x) => x !== id);
  return { message: use.message, done: true, flag: use.flag };
}

// Train invisible : l'incident n'a pas lieu et l'invisibilité s'arrête là. Renvoie le message, sinon null.
export function dodgeIncident(state) {
  const { flag, dodged } = ITEMS.hologramme.use;
  if (!state.flags.delete(flag)) return null;
  return dodged;
}

// Fin anticipée si la situation devient impossible.
export function checkGameOver(state) {
  if (state.sat <= 0) return 'mutinerie';
  if (state.chaos >= 100) return 'chaos_total';
  if (state.delay >= MAX_DELAY) return 'retard';
  return null;
}

// La fin du terminus : il n'y en a qu'une, celle des parties menées jusqu'au bout.
export function terminusEnding(state) {
  return ENDINGS.find((e) => e.terminus && evalCond(e.if, state)).id;
}

export function getEnding(id) {
  const e = ENDINGS.find((x) => x.id === id);
  if (!e) throw new Error(`Fin inconnue : ${id}`);
  return e;
}
