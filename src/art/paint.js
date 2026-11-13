// Outils de peinture partagés par les maisons (cottage.js) et les personnages (hero.js).

import { toHsl, fromHsl, towardHue } from './draw.js';

// Rampe « peinte » de n tons : ombres vers le violet (ou shadowHue), lumières vers le jaune chaud.
export function paintRamp(base, n = 7, { spread = 0.07, shadowHue = 262, sat = 0, shift = 1 } = {}) {
  const [h, s, l] = toHsl(base);
  const mid = (n - 1) / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = i - mid;
    const hh = k < 0 ? towardHue(h, shadowHue, Math.min(0.6, -k * 0.13 * shift)) : towardHue(h, 48, Math.min(0.45, k * 0.08 * shift));
    const ss = Math.max(0, Math.min(1, s + sat + (k < 0 ? -k * 0.03 : -k * 0.07)));
    const ll = Math.max(0.03, Math.min(0.88, l + k * spread * (k > 0 ? 0.8 : 1)));
    out.push(fromHsl(hh, ss, ll));
  }
  return out;
}

function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Bruit de valeur lissé, dans [0, 1].
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
