// Petits sons synthétisés (WebAudio) : blips de voix, sifflet, clics.
// Remplaçable plus tard par les vraies voix enregistrées (champ `voiceFile` des personnages).

let ctx = null;
let master = null;
let muted = false;
try {
  muted = localStorage.getItem('traintrain_muted') === '1';
} catch {
  /* stockage indisponible : son actif par défaut */
}

// Les navigateurs exigent un geste de l'utilisateur avant de jouer du son.
export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.35;
  master.connect(ctx.destination);
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('traintrain_muted', muted ? '1' : '0');
  } catch {
    /* rien */
  }
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

function tone(freq, dur, { type = 'square', vol = 0.15, slide = 0, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Un blip par lettre affichée, légèrement varié pour imiter une voix.
export function blip(voice = 240) {
  tone(voice * (0.9 + Math.random() * 0.25), 0.05, { vol: 0.07 });
}

export function click() {
  tone(660, 0.06, { vol: 0.1 });
  tone(990, 0.06, { vol: 0.08, delay: 0.05 });
}

export function hover() {
  tone(520, 0.03, { vol: 0.04 });
}

export function whistle() {
  tone(880, 0.35, { type: 'triangle', vol: 0.12, slide: 40 });
  tone(1100, 0.5, { type: 'triangle', vol: 0.1, slide: -30, delay: 0.3 });
}

export function statUp() {
  tone(523, 0.08, { vol: 0.08 });
  tone(784, 0.12, { vol: 0.08, delay: 0.08 });
}

export function statDown() {
  tone(330, 0.1, { vol: 0.08 });
  tone(220, 0.16, { vol: 0.08, delay: 0.09 });
}

export function brake() {
  tone(300, 0.6, { type: 'sawtooth', vol: 0.03, slide: -120 });
}

export function ending(good) {
  const notes = good ? [523, 659, 784, 1046] : [392, 349, 311, 262];
  notes.forEach((n, i) => tone(n, 0.25, { type: 'triangle', vol: 0.12, delay: i * 0.18 }));
}
