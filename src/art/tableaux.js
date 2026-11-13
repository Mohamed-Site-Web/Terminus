// Images de fin et couverture du menu : petites scènes en pixel art assemblées par code, à partir des
// sprites (hero.js) et des bustes (bust.js). Une scène par id de fin (src/data/endings.js), en 216×120,
// affichée ×2 ; la couverture fait 320×180, affichée ×3.
import { Pix, rgb } from './draw.js';
import { heroOf, heroSmall } from './hero.js';
import { bustOf, dusted } from './bust.js';

export const TW = 216;
export const TH = 120;

const INK = '#14101a';
const RED = '#7a2f2f';
const GOLD = '#e8c860';
const LIT = '#f6d27a';
const STEEL = '#9a9aa6';

const NIGHT = { cols: ['#0c1024', '#141a3a', '#24305a', '#3a4a7a'], far: '#1c2244', near: '#141a30', soil: '#22242e', fg: '#1a1c26', night: true };
const DAY = { cols: ['#5aa0e0', '#7ab8e8', '#a8d4f0', '#d8ecf4'], far: '#7aa870', near: '#5a8a58', soil: '#8a8478', fg: '#5a9a52' };
const DUSK = { cols: ['#3a2a5a', '#7a3a6a', '#c8604a', '#f0a850'], far: '#4a2a4a', near: '#2e1c34', soil: '#2a2028', fg: '#241a26' };

// ───────── Outils ─────────
const rnd = (seed) => {
  let s = seed * 2654435761 >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};
const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const by = (x, y) => (BY[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

function put(p, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
  const o = (y * p.w + x) * 4;
  p.d[o] = r;
  p.d[o + 1] = g;
  p.d[o + 2] = b;
  p.d[o + 3] = 255;
}

// Colle les pixels opaques de `src` : miroir, pente (shear) ou quart de tour (rot) au choix.
function stamp(dst, src, x, y, { flip = false, shear = 0, rot = false } = {}) {
  for (let j = 0; j < src.h; j++)
    for (let i = 0; i < src.w; i++) {
      const o = (j * src.w + i) * 4;
      if (src.d[o + 3] < 128) continue;
      const u = flip ? src.w - 1 - i : i;
      const X = rot ? x + src.h - 1 - j : x + u;
      const Y = rot ? y + u : y + j + Math.round(u * shear);
      put(dst, X, Y, src.d[o], src.d[o + 1], src.d[o + 2]);
    }
}

const figs = new Map();
function fig(id) {
  if (!figs.has(id)) {
    const h = heroOf(id);
    figs.set(id, { big: h.big, small: heroSmall(h) });
  }
  return figs.get(id);
}
// Personnage en pied (56×78) ou en petit (28×39), les pieds posés à la hauteur `floor`.
const who = (p, id, x, floor, o) => stamp(p, fig(id).big, x, floor - 78, o);
const mini = (p, id, x, floor, o) => stamp(p, fig(id).small, x, floor - 39, o);

function sky(p, cols, y0 = 0, y1 = p.h) {
  const C = cols.map(rgb);
  const n = C.length - 1;
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < p.w; x++) {
      const v = ((y - y0) / Math.max(1, y1 - y0 - 1)) * n;
      const c = C[Math.min(n, Math.floor(v + by(x, y) * 0.999))];
      put(p, x, y, c[0], c[1], c[2]);
    }
}

function stars(p, seed, n, yMax) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) p.set(Math.floor(r() * p.w), Math.floor(r() * yMax), r() > 0.7 ? '#ffffff' : '#a8b0d0');
}

function hills(p, base, amp, c, seed, y1) {
  for (let x = 0; x < p.w; x++) {
    const top = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x * 0.045 + seed)) - amp * 0.4 * (0.5 + 0.5 * Math.sin(x * 0.11 + seed * 2.3)));
    if (y1 > top) p.rect(x, top, 1, y1 - top, c);
  }
}

function rails(p, y, x0 = 0, x1 = p.w) {
  for (let x = x0; x < x1; x++) if (x % 6 < 3) p.rect(x, y + 1, 1, 2, '#5a4030');
  p.rect(x0, y, x1 - x0, 1, STEEL);
}

// Décor d'extérieur : ciel, collines, ballast et rails, puis l'avant-plan où se tiennent les personnages.
function outdoor(p, { cols, far, near, soil, fg, night = false, railY = 92, seed = 3 }) {
  sky(p, cols, 0, railY);
  if (night) stars(p, seed, 40, railY - 30);
  if (far) hills(p, railY - 8, 22, far, seed, railY);
  if (near) hills(p, railY - 2, 10, near, seed + 4, railY);
  p.rect(0, railY - 1, p.w, p.h, soil);
  rails(p, railY);
  p.rect(0, railY + 5, p.w, p.h, fg);
}

function platform(p, y) {
  p.rect(0, y, p.w, p.h, '#6a6672');
  p.rect(0, y, p.w, 2, GOLD);
  p.rect(0, y + 2, p.w, 1, '#4a4650');
  for (let x = 10; x < p.w; x += 24) p.rect(x, y + 3, 1, p.h, '#5a5662');
}

function puff(p, x, y, r, c, a = 1) {
  p.ellipse(x, y, r, Math.round(r * 0.7), c, a);
  p.ellipse(Math.round(x - r * 0.8), y + 1, Math.round(r * 0.6), Math.round(r * 0.5), c, a);
  p.ellipse(Math.round(x + r * 0.8), y + 1, Math.round(r * 0.6), Math.round(r * 0.5), c, a);
}

function ring(p, cx, cy, r, c, a0 = 0, a1 = 360) {
  for (let a = a0; a <= a1; a += 3) {
    const t = (a * Math.PI) / 180;
    p.set(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}

function burst(p, x, y, r, c1, c2) {
  for (let k = 0; k < 8; k++) {
    const t = (k * Math.PI) / 4;
    const len = k % 2 ? r * 0.7 : r;
    p.line(Math.round(x + Math.cos(t) * r * 0.35), Math.round(y + Math.sin(t) * r * 0.35), Math.round(x + Math.cos(t) * len), Math.round(y + Math.sin(t) * len), k % 2 ? c2 : c1);
  }
  p.rect(x - 1, y - 1, 3, 3, c1);
}

function bitmap(p, x, y, rows, c, s = 1) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') p.rect(x + i * s, y + j * s, s, s, c);
  });
}
const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
const BANG = ['##', '##', '##', '##', '..', '##'];
const ZED = ['####', '..#.', '.#..', '####'];
const LETTERS = {
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
};

function confetti(p, seed, n, yMax, cols = ['#e8c860', '#d9675a', '#7fbf7a', '#58b0e0', '#f6f2ea']) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) p.rect(Math.floor(r() * p.w), Math.floor(r() * yMax), 1, 2, cols[Math.floor(r() * cols.length)]);
}

function bill(p, x, y) {
  p.rect(x, y, 9, 5, '#3e7a48');
  p.rect(x + 1, y + 1, 7, 3, '#7ab87a');
  p.rect(x + 4, y + 2, 1, 1, '#3e7a48');
}

function clock(p, cx, cy, r) {
  p.rect(cx - 1, cy - r - 4, 3, 4, INK);
  p.ellipse(cx, cy, r + 1, r + 1, INK);
  p.ellipse(cx, cy, r - 1, r - 1, '#f6f2ea');
  p.line(cx, cy, cx, cy - r + 3, INK);
  p.line(cx, cy, cx + r - 5, cy + 2, '#c03030');
  for (let k = 0; k < 4; k++) p.set(Math.round(cx + (r - 2) * Math.cos((k * Math.PI) / 2)), Math.round(cy + (r - 2) * Math.sin((k * Math.PI) / 2)), INK);
}

function lectern(p, x, y, c, light) {
  p.rect(x + 17, y - 7, 1, 7, STEEL);
  p.rect(x + 16, y - 9, 3, 3, INK);
  p.rect(x, y, 36, 34, INK);
  p.rect(x + 1, y + 1, 34, 33, c);
  p.rect(x + 1, y + 1, 34, 3, light);
  p.rect(x + 12, y + 10, 12, 8, light);
}

function bubble(p, x, y, w, h, c, dir) {
  p.rect(x + 1, y, w - 2, h, INK);
  p.rect(x, y + 1, w, h - 2, INK);
  p.rect(x + 1, y + 1, w - 2, h - 2, '#f6f2ea');
  const tx = dir < 0 ? x + 5 : x + w - 8;
  for (let k = 0; k < 4; k++) p.rect(tx + (dir < 0 ? 0 : k), y + h + k - 1, 4 - k, 1, k === 0 ? '#f6f2ea' : INK);
  for (let k = 0; k < 3; k++) p.rect(x + 4, y + 4 + k * 4, w - 8 - (k === 2 ? 8 : 0), 2, c);
}

function crowd(p, x, y, w, h, seed) {
  const r = rnd(seed);
  const cols = ['#d9675a', '#58b0e0', '#e8c860', '#f6f2ea', '#7fbf7a', '#a98ad8'];
  for (let j = y; j < y + h; j += 5)
    for (let i = x + ((j / 5) & 1) * 2; i < x + w; i += 4) {
      p.rect(i, j + 2, 3, 3, cols[Math.floor(r() * cols.length)]);
      p.rect(i + 1, j, 1, 2, r() > 0.5 ? '#e8c2a4' : '#8a5a3a');
    }
}

function rubble(p, x0, y, w, seed) {
  const r = rnd(seed);
  for (let i = 0; i < 22; i++) {
    const s = 3 + Math.floor(r() * 5);
    const x = x0 + Math.floor(r() * w);
    const yy = y - Math.floor(r() * 10) - s + 6;
    p.rect(x, yy, s + 2, s, INK);
    p.rect(x + 1, yy + 1, s, s - 2, r() > 0.5 ? '#8a8a98' : '#6a6672');
  }
}

function wavy(p, x, y0, y1, c) {
  for (let y = y0; y < y1; y++) p.rect(x + Math.round(Math.sin(y * 0.55) * 2), y, 2, 1, c);
}

function grayAll(p) {
  for (let o = 0; o < p.d.length; o += 4) {
    const l = Math.round(p.d[o] * 0.3 + p.d[o + 1] * 0.59 + p.d[o + 2] * 0.11);
    p.d[o] = p.d[o + 1] = p.d[o + 2] = l;
  }
}

function sepia(p) {
  for (let o = 0; o < p.d.length; o += 4) {
    const l = p.d[o] * 0.3 + p.d[o + 1] * 0.59 + p.d[o + 2] * 0.11;
    p.d[o] = Math.min(255, l * 1.05 + 24);
    p.d[o + 1] = Math.min(255, l * 0.88 + 14);
    p.d[o + 2] = l * 0.66 + 6;
  }
}

// ───────── Le train, vu de profil (il roule vers la droite) ─────────
function wheel(t, cx, cy, r) {
  t.ellipse(cx, cy, r, r, INK);
  t.rect(cx, cy, 1, 1, STEEL);
}

function car(t, x, y, body, lit) {
  t.rect(x, y - 24, 44, 20, INK);
  t.rect(x + 1, y - 23, 42, 18, body);
  t.rect(x + 1, y - 23, 42, 3, '#3a1c20');
  t.rect(x + 1, y - 9, 42, 2, GOLD);
  for (let i = 0; i < 4; i++) {
    t.rect(x + 3 + i * 10, y - 18, 8, 7, INK);
    t.rect(x + 4 + i * 10, y - 17, 6, 5, lit ? LIT : '#2a3348');
  }
  wheel(t, x + 9, y - 3, 3);
  wheel(t, x + 34, y - 3, 3);
  t.rect(x + 44, y - 8, 2, 2, INK);
}

function loco(t, x, y, body, lit) {
  t.rect(x, y - 26, 31, 22, INK);
  t.rect(x + 1, y - 25, 29, 20, body);
  for (let i = 0; i < 12; i++) {
    const h = 21 - i;
    t.rect(x + 30 + i, y - 4 - h, 1, h, body);
    t.rect(x + 30 + i, y - 5 - h, 1, 1, INK);
  }
  t.rect(x + 42, y - 15, 1, 11, INK);
  t.rect(x + 1, y - 25, 29, 3, '#3a1c20');
  t.rect(x + 1, y - 9, 41, 2, GOLD);
  t.rect(x + 6, y - 20, 10, 8, INK);
  t.rect(x + 7, y - 19, 8, 6, lit ? LIT : '#2a3348');
  t.rect(x + 9, y - 19, 4, 2, RED); // la casquette du conducteur
  t.rect(x + 20, y - 20, 1, 15, '#3a1c20');
  t.rect(x + 31, y - 21, 4, 6, '#bfe0f0');
  t.rect(x + 39, y - 12, 3, 3, '#fff0a8');
  t.rect(x, y - 5, 43, 1, INK);
  wheel(t, x + 8, y - 3, 3);
  wheel(t, x + 22, y - 3, 3);
  wheel(t, x + 35, y - 3, 3);
}

function steamLoco(t, x, y) {
  t.rect(x, y - 28, 16, 24, INK);
  t.rect(x + 1, y - 27, 14, 22, '#4a3a34');
  t.rect(x + 4, y - 23, 8, 7, LIT);
  t.rect(x + 16, y - 20, 26, 16, INK);
  t.rect(x + 16, y - 19, 25, 14, '#2a2630');
  t.rect(x + 16, y - 19, 25, 3, '#4a4650');
  t.rect(x + 32, y - 30, 6, 10, INK);
  t.rect(x + 33, y - 29, 4, 9, '#2a2630');
  t.rect(x + 31, y - 31, 8, 2, INK);
  t.rect(x + 22, y - 23, 5, 4, GOLD);
  for (let i = 0; i < 6; i++) t.rect(x + 42 + i, y - 10 + i, 1, 6 - i, INK);
  wheel(t, x + 8, y - 4, 4);
  wheel(t, x + 21, y - 4, 4);
  wheel(t, x + 34, y - 3, 3);
  t.rect(x + 8, y - 4, 14, 1, STEEL);
}

function makeTrain({ cars = 3, body = RED, lit = true, steam = false, engine = true } = {}) {
  const t = new Pix(cars * 46 + (engine ? 50 : 2), 40);
  const y = 38;
  for (let i = 0; i < cars; i++) car(t, i * 46 + 2, y, body, lit);
  if (engine) (steam ? steamLoco : loco)(t, cars * 46 + 2, y, body, lit);
  return t;
}
const putTrain = (p, x, railY, t, o) => stamp(p, makeTrain(t), x, railY - 38, o);

function interior(p) {
  p.rect(0, 0, p.w, p.h, '#3a3040');
  p.rect(0, 0, p.w, 8, '#2a222e');
  const w = new Pix(50, 38);
  sky(w, NIGHT.cols);
  stars(w, 6, 10, 30);
  for (const x of [14, 82, 150]) {
    p.rect(x, 16, 52, 40, INK);
    stamp(p, w, x + 1, 17);
  }
  p.rect(0, 62, p.w, 3, '#5a4a52');
  for (const x of [6, 74, 142]) {
    p.rect(x, 76, 60, 32, INK);
    p.rect(x + 1, 77, 58, 30, '#6a3038');
    p.rect(x + 1, 77, 58, 4, '#8a4048');
    p.rect(x + 1, 96, 58, 2, '#4a2028');
  }
  p.rect(0, 106, p.w, 14, '#5a4630');
  for (let x = 0; x < p.w; x += 18) p.rect(x, 106, 1, 14, '#3a2c1e');
  p.rect(0, 106, p.w, 1, '#7a6244');
}

// ───────── Les scènes ─────────
const SCENES = {
  // La chèvre a pris le volant ; le conducteur regarde par le hublot du local à balais.
  mutinerie(p) {
    interior(p);
    p.rect(168, 28, 40, 80, INK);
    p.rect(169, 29, 38, 78, '#6a5238');
    p.rect(169, 29, 38, 2, '#8a6e4c');
    p.rect(176, 38, 24, 18, INK);
    p.rect(177, 39, 22, 16, '#1c2030');
    p.rect(181, 41, 14, 4, RED);
    p.rect(180, 45, 16, 1, '#3a1416');
    p.rect(187, 42, 2, 2, GOLD);
    for (const x of [183, 190]) {
      p.rect(x, 48, 4, 4, '#f6f2ea');
      p.rect(x + 1, 49, 2, 2, INK);
    }
    for (const x of [182, 188, 194]) p.rect(x, 39, 1, 16, '#4a4650');
    p.rect(201, 70, 5, 6, GOLD);
    p.rect(202, 68, 3, 2, STEEL);
    mini(p, 'blonde', 6, 114);
    mini(p, 'toxico', 30, 115);
    mini(p, 'veteran', 134, 114);
    who(p, 'chevre', 70, 117);
    ring(p, 124, 86, 8, '#2a2228');
    ring(p, 124, 86, 7, '#2a2228');
    p.rect(123, 79, 3, 15, '#2a2228');
    p.rect(117, 85, 15, 3, '#2a2228');
    confetti(p, 5, 50, 70);
  },

  // Le train a déraillé vers le haut, droit dans une autre dimension.
  chaos_total(p) {
    sky(p, ['#1c0e30', '#4a1c6a', '#a83a8a', '#f08a6a', '#58d0d0'], 0, TH);
    stars(p, 11, 60, 90);
    for (let r = 26, k = 0; r > 2; r -= 4, k++) p.ellipse(178, 26, r, Math.round(r * 0.8), ['#f6f2ea', '#a98ad8', '#58d0d0', '#4a1c6a'][k % 4]);
    p.rect(0, 108, TW, 12, '#2a1c3a');
    rails(p, 108, 0, 46);
    p.line(46, 108, 58, 100, STEEL);
    p.line(58, 100, 64, 86, STEEL);
    putTrain(p, 22, 110, { cars: 2 }, { shear: -0.5 });
    for (const [x, y] of [[30, 30], [84, 96], [120, 100], [200, 84]]) clock(p, x, y, 6);
    confetti(p, 2, 40, 110, ['#f6f2ea', '#58d0d0', '#e8c860']);
  },

  // Assez de retard pour se marier sur le quai.
  retard(p) {
    outdoor(p, { ...DUSK, railY: 90 });
    putTrain(p, -24, 90, { cars: 3, lit: false });
    platform(p, 96);
    p.rect(168, 34, 3, 62, INK);
    clock(p, 169, 26, 15);
    p.line(154, 40, 168, 60, '#d8d8e0');
    p.line(160, 40, 168, 52, '#d8d8e0');
    p.line(157, 46, 167, 48, '#d8d8e0');
    mini(p, 'blonde', 60, 115);
    mini(p, 'toxico', 82, 115);
    bitmap(p, 82, 62, HEART, '#d9675a');
    // le gâteau d'anniversaire de la compagnie
    p.rect(120, 106, 18, 8, INK);
    p.rect(121, 107, 16, 6, '#f0c8d0');
    p.rect(121, 107, 16, 2, '#f6f2ea');
    for (const x of [124, 129, 134]) {
      p.rect(x, 102, 1, 4, '#58b0e0');
      p.rect(x, 100, 1, 2, '#f0a850');
    }
  },

  // Scrat, son gland, et un train en deux morceaux.
  coupe(p) {
    outdoor(p, { ...DAY, railY: 92 });
    // la fissure
    for (let y = 88; y < TH; y++) {
      const w = 14 - Math.round((y - 88) * 0.3) + ((y * 7) % 5);
      p.rect(108 - w + ((y * 3) % 4), y, w * 2, 1, y < 96 ? '#3a2c24' : '#1c1418');
    }
    stamp(p, makeTrain({ cars: 2, engine: false }), -8, 92 - 38, { shear: 0.13 });
    stamp(p, makeTrain({ cars: 1 }), 122, 92 - 38 + 12, { shear: -0.13 });
    for (const [x, y] of [[88, 70], [96, 62], [118, 66], [126, 74]]) p.line(x, y, x + 3, y - 4, '#e8c860');
    mini(p, 'joueur', 112, 110);
    ring(p, 142, 96, 5, '#2a2228');
    p.rect(138, 96, 9, 1, '#2a2228');
    who(p, 'scrat', 62, 117);
    bitmap(p, 100, 40, BANG, '#d9675a', 2);
  },

  // Thanos claque des doigts ; le conducteur s'en va en fumée.
  poussiere(p) {
    sky(p, ['#0a0614', '#1c0e30', '#3a1c50', '#5a2a5a'], 0, TH);
    stars(p, 9, 50, 100);
    p.rect(0, 112, TW, 8, '#140c1c');
    who(p, 'thanos', 4, 117);
    burst(p, 64, 84, 11, '#fff0a8', '#e8c040');
    const big = new Pix(160, 120);
    stamp(big, bustOf('joueur'), 0, 14);
    stamp(p, dusted(big, 5), 74, 0);
  },

  // Le Contrôleur embarque tout le wagon, conducteur compris.
  embarques(p) {
    outdoor(p, { ...NIGHT, railY: 86 });
    putTrain(p, -40, 86, { cars: 4 });
    platform(p, 92);
    p.rect(204, 30, 2, 62, INK);
    p.ellipse(205, 28, 5, 3, '#fff0a8');
    p.ellipse(205, 34, 14, 8, '#fff0a8', 0.18);
    ['shrek', 'zemmour', 'blonde', 'hoggy', 'toxico', 'joueur'].forEach((id, i) => mini(p, id, 2 + i * 23, 113 + (i % 2)));
    p.rect(14, 99, 150, 1, '#c8b890');
    who(p, 'controleur', 150, 118);
  },

  // Momo et sa pancarte bloquent la voie.
  greve(p) {
    outdoor(p, { ...DAY, railY: 94 });
    putTrain(p, 112, 94, { cars: 2 }, { flip: true });
    const sign = (x, y, w, h, pole) => {
      p.rect(x + (w >> 1), y + h, 2, pole, '#8a5e38');
      p.rect(x, y, w, h, INK);
      p.rect(x + 1, y + 1, w - 2, h - 2, '#f0ece0');
      for (let k = 0; k * 5 + 5 < h; k++) p.rect(x + 3, y + 3 + k * 5, w - 6 - (k % 2) * 6, 2, '#c03030');
    };
    sign(2, 60, 18, 12, 14);
    mini(p, 'momo', 0, 113);
    sign(88, 58, 18, 12, 14);
    mini(p, 'momo', 82, 114);
    sign(46, 12, 42, 24, 44);
    who(p, 'momo', 24, 116);
  },

  // Hoggy Rider a tout validé, jusqu'à la tribune nord.
  valide(p) {
    sky(p, DAY.cols, 0, 16);
    p.rect(0, 12, TW, 66, '#4a4e5c');
    crowd(p, 0, 14, TW, 60, 7);
    p.rect(74, 12, 96, 66, '#1c1a22');
    for (let y = 78; y < TH; y++) p.rect(0, y, TW, 1, Math.floor((y - 78) / 7) % 2 ? '#4a9a4a' : '#58aa52');
    p.rect(0, 78, TW, 1, '#f0f0f0');
    putTrain(p, 66, 100, { cars: 1 }, { shear: 0.07 });
    rubble(p, 66, 100, 112, 11);
    puff(p, 84, 70, 9, '#b8b0a8', 0.7);
    puff(p, 150, 62, 11, '#b8b0a8', 0.7);
    who(p, 'hoggy', 2, 118);
  },

  // Onze jours de débat en pleine voie.
  debat(p) {
    outdoor(p, { ...NIGHT, railY: 82 });
    putTrain(p, 8, 82, { cars: 3 });
    who(p, 'melenchon', 20, 114);
    who(p, 'zemmour', 140, 114);
    lectern(p, 30, 88, '#a83a30', '#d8584a');
    lectern(p, 150, 88, '#2e4a8a', '#5878b8');
    clock(p, 108, 60, 10);
    bubble(p, 60, 14, 34, 17, '#c03030', -1);
    bubble(p, 124, 14, 34, 17, '#2e4a8a', 1);
  },

  // Retour à la vapeur : un escargot double le train.
  vapeur(p) {
    outdoor(p, { ...DAY, railY: 92 });
    putTrain(p, 14, 92, { cars: 2, steam: true, body: '#6a4a3a', lit: false });
    for (const [x, y, r] of [[142, 52, 6], [132, 42, 9], [114, 32, 12], [90, 24, 14], [62, 20, 15]]) {
      puff(p, x + 1, y + 2, r, '#a8a098');
      puff(p, x, y, r, '#e8e4dc');
    }
    mini(p, 'zemmour', 34, 69);
    // l'escargot
    p.ellipse(190, 106, 5, 5, INK);
    p.ellipse(190, 106, 4, 4, '#c8843a');
    p.rect(190, 105, 2, 2, '#8a5a24');
    p.rect(186, 110, 16, 3, INK);
    p.rect(187, 110, 14, 2, '#d8c890');
    p.rect(200, 105, 1, 5, INK);
    p.rect(197, 106, 1, 4, INK);
    sepia(p);
  },

  // Bruno contre Shrek : le nuage se voit de loin.
  asphyxie(p) {
    outdoor(p, { cols: ['#3a4a1c', '#5a6a24', '#8a9a34', '#b8c060'], far: '#3a4a24', near: '#2a3a1c', soil: '#2e3420', fg: '#3a4426', railY: 84 });
    putTrain(p, 30, 84, { cars: 3, lit: false });
    for (const [x, y, r] of [[40, 60, 16], [84, 52, 20], [130, 58, 18], [176, 50, 16], [108, 76, 22], [20, 86, 14], [196, 84, 14]]) puff(p, x, y, r, '#9ac83a', 0.42);
    who(p, 'poilu', 14, 117);
    who(p, 'shrek', 140, 117);
    for (const x of [22, 34, 58]) wavy(p, x, 14, 36, '#c8e060');
    for (const x of [150, 174, 186]) wavy(p, x, 12, 34, '#6a9a2a');
    burst(p, 106, 72, 13, '#e8f080', '#6a9a2a');
    for (const [x, y] of [[92, 40], [120, 34], [100, 96], [126, 92]]) {
      p.rect(x, y, 2, 2, INK);
      p.rect(x - 1, y - 1, 1, 1, '#d8d8e0');
      p.rect(x + 2, y - 1, 1, 1, '#d8d8e0');
    }
  },

  // Jacky a racheté la compagnie, la ligne et ta casquette.
  licencie(p) {
    sky(p, ['#1c1830', '#2a2444', '#3a3058'], 0, TH);
    p.rect(100, 8, 110, 76, INK);
    const w = new Pix(106, 72);
    sky(w, DUSK.cols);
    const r = rnd(8);
    for (let x = 0; x < 106; x += 13) {
      const h = 20 + Math.floor(r() * 36);
      w.rect(x, 72 - h, 12, h, '#241a2e');
      for (let y = 72 - h + 3; y < 70; y += 5) for (let i = 2; i < 10; i += 4) if (r() > 0.4) w.rect(x + i, y, 2, 2, LIT);
    }
    stamp(p, w, 102, 10);
    p.rect(154, 8, 2, 76, INK);
    stamp(p, bustOf('riche'), -12, 6);
    p.rect(0, 98, TW, 22, INK);
    p.rect(0, 99, TW, 21, '#4a2e1c');
    p.rect(0, 99, TW, 2, '#7a5234');
    // la lettre de licenciement, écrite sur un billet
    p.rect(128, 90, 62, 26, INK);
    p.rect(129, 91, 60, 24, '#7ab87a');
    p.rect(132, 94, 54, 18, '#a8d8a0');
    for (let k = 0; k < 4; k++) p.rect(135, 96 + k * 4, 36 - (k === 3 ? 14 : 0), 1, '#3e7a48');
    p.ellipse(178, 106, 5, 5, '#c03030');
    p.ellipse(178, 106, 3, 3, '#a8d8a0');
    for (const [x, y] of [[112, 20], [136, 34], [170, 18], [196, 44], [150, 56], [118, 62], [188, 70]]) bill(p, x, y);
    // ta casquette, sur son bureau
    p.rect(196, 92, 16, 6, INK);
    p.rect(197, 93, 14, 4, RED);
    p.rect(194, 97, 20, 2, INK);
    p.rect(203, 94, 2, 2, GOLD);
  },

  // Personne ne touche au billet de Clara.
  picore(p) {
    outdoor(p, { ...DAY, railY: 82 });
    putTrain(p, -30, 82, { cars: 3 });
    for (const [x, y, r] of [[40, 108, 8], [58, 112, 6], [22, 112, 5]]) puff(p, x, y, r, '#d8d0c0');
    who(p, 'ronde', 68, 117);
    for (const [x, y] of [[62, 50], [128, 44], [140, 70], [76, 34]]) {
      p.ellipse(x, y, 3, 1, '#c8642a');
      p.rect(x - 3, y, 6, 1, '#8a3e14');
    }
    mini(p, 'joueur', 170, 113);
    for (const y of [86, 94, 102]) p.rect(150, y, 14, 1, '#f6f2ea');
    bitmap(p, 183, 58, BANG, '#d9675a', 2);
    p.rect(200, 80, 2, 3, '#58b0e0');
    p.rect(166, 78, 2, 3, '#58b0e0');
  },

  // Meeting à chaque gare : le wagon 2 a son président.
  president(p) {
    outdoor(p, { ...DUSK, railY: 78 });
    putTrain(p, 4, 78, { cars: 3 });
    p.line(0, 6, 108, 16, INK);
    p.line(108, 16, 215, 6, INK);
    for (let x = 6; x < TW; x += 14) {
      const y = 6 + Math.round((1 - Math.abs(x - 108) / 108) * 10);
      for (let k = 0; k < 6; k++) p.rect(x + (k >> 1), y + 1 + k, 6 - k, 1, ['#d9675a', '#e8c860', '#f6f2ea'][Math.floor(x / 14) % 3]);
    }
    p.rect(62, 98, 92, 22, INK);
    p.rect(63, 99, 90, 21, '#a83a30');
    p.rect(63, 99, 90, 3, '#d8584a');
    who(p, 'melenchon', 80, 100);
    lectern(p, 90, 76, '#5a4630', '#8a6e4c');
    ['blonde', 'toxico', 'momo'].forEach((id, i) => mini(p, id, i * 21 - 2, 131 + (i % 2) * 3));
    ['benjamin', 'veteran', 'chevre'].forEach((id, i) => mini(p, id, 152 + i * 21, 131 + (i % 2) * 3));
  },

  // Une souche dans le marais ; le train repart sans toi, et à l'heure.
  marais(p) {
    sky(p, ['#1c3a3a', '#2e5a4a', '#5a8a5a', '#a8b870'], 0, 72);
    hills(p, 68, 16, '#1c3a2e', 2, 72);
    p.rect(150, 60, 44, 6, INK);
    for (let x = 152; x < 186; x += 4) p.rect(x, 62, 2, 2, LIT);
    puff(p, 196, 54, 4, '#d8e0d0', 0.7);
    for (let y = 72; y < TH; y++) p.rect(0, y, TW, 1, y % 5 === 0 ? '#3a6a4a' : '#24443a');
    for (const [x, y] of [[170, 86], [196, 102], [150, 110]]) p.ellipse(x, y, 6, 2, '#5a9a4a');
    // arbre mort
    p.rect(200, 20, 4, 60, '#2a2420');
    p.line(202, 34, 190, 22, '#2a2420');
    p.line(202, 44, 213, 30, '#2a2420');
    p.line(194, 26, 190, 14, '#2a2420');
    // la berge et la cabane-souche
    p.ellipse(70, 120, 100, 18, '#3a4a24');
    p.ellipse(18, 84, 20, 24, INK);
    p.ellipse(18, 84, 19, 23, '#6a5238');
    p.rect(10, 86, 12, 20, INK);
    p.rect(11, 87, 10, 19, '#3a2c1e');
    p.rect(24, 74, 7, 7, LIT);
    who(p, 'shrek', 34, 116);
    p.rect(116, 100, 22, 14, INK);
    p.rect(117, 101, 20, 13, '#6a4a30');
    p.ellipse(127, 101, 10, 3, '#a8845a');
    mini(p, 'joueur', 113, 102);
    for (const [x, y] of [[96, 40], [150, 36], [176, 70], [60, 24], [128, 54]]) p.rect(x, y, 1, 1, '#f0f080');
  },

  // Tout passe en noir et blanc, et le mot FIN s'affiche dans le ciel.
  cinema(p) {
    outdoor(p, { ...NIGHT, railY: 88 });
    putTrain(p, 64, 88, { cars: 3 });
    ['F', 'I', 'N'].forEach((ch, i) => {
      bitmap(p, 113 + i * 26, 17, LETTERS[ch], INK, 4);
      bitmap(p, 112 + i * 26, 16, LETTERS[ch], '#ffffff', 4);
    });
    who(p, 'gabin', 12, 115);
    grayAll(p);
    p.rect(0, 0, TW, 8, '#0a0a0a');
    p.rect(0, TH - 8, TW, 8, '#0a0a0a');
    for (let x = 3; x < TW; x += 10) {
      p.rect(x, 2, 5, 4, '#d8d8d8');
      p.rect(x, TH - 6, 5, 4, '#d8d8d8');
    }
  },

  // Le train marque de la locomotive.
  mercato(p) {
    sky(p, DAY.cols, 0, 12);
    p.rect(0, 8, TW, 34, '#4a4e5c');
    crowd(p, 0, 10, TW, 30, 3);
    p.rect(0, 42, TW, 4, '#e8e8f0');
    for (let x = 0; x < TW; x++) p.rect(x, 46, 1, TH - 46, Math.floor(x / 18) % 2 ? '#4a9a4a' : '#58aa52');
    p.rect(0, 102, TW, 1, '#f0f0f0');
    for (let x = 152; x < 210; x += 5) p.rect(x, 54, 1, 48, '#d8d8e0');
    for (let y = 54; y < 102; y += 5) p.rect(150, y, 60, 1, '#d8d8e0');
    putTrain(p, 80, 102, { cars: 1 });
    p.rect(148, 50, 3, 53, '#f6f2ea');
    p.rect(148, 50, 64, 3, '#f6f2ea');
    p.rect(209, 50, 3, 53, '#f6f2ea');
    p.ellipse(196, 92, 4, 4, INK);
    p.ellipse(196, 92, 3, 3, '#f6f2ea');
    p.rect(195, 91, 2, 2, INK);
    who(p, 'lamine', 8, 118);
    confetti(p, 4, 50, 60);
  },

  // Roucoul III fait voler le train de toit en toit.
  roi_pigeon(p) {
    sky(p, ['#4a90d8', '#7ab8e8', '#a8d4f0', '#e0f0f8'], 0, TH);
    puff(p, 40, 20, 12, '#ffffff');
    puff(p, 186, 60, 10, '#ffffff');
    const r = rnd(5);
    for (let x = 0; x < TW; ) {
      const w = 20 + Math.floor(r() * 16);
      const top = 90 + Math.floor(r() * 14);
      p.rect(x, top, w, TH - top, INK);
      p.rect(x + 1, top + 1, w - 2, TH - top, r() > 0.5 ? '#c8b89a' : '#a89a8a');
      for (let k = 0; k < 6; k++) p.rect(x - 1 + k, top - k, w + 2 - k * 2, 1, k === 5 ? INK : '#a84a3a');
      p.rect(x + w - 8, top - 9, 4, 7, '#6a4a3a');
      for (let wx = x + 4; wx < x + w - 5; wx += 7) p.rect(wx, top + 6, 3, 4, '#3a4a6a');
      x += w;
    }
    const wing = (x, y) => {
      for (let k = 0; k < 5; k++) {
        p.ellipse(x + k * 5, y - k * 3, 9, 3, INK);
        p.ellipse(x + k * 5, y - k * 3, 8, 2, k % 2 ? '#d8d8e0' : '#b8b8c8');
      }
    };
    wing(96, 36);
    stamp(p, makeTrain({ cars: 2 }), 62, 30, { shear: -0.09 });
    wing(74, 52);
    for (let i = 0; i < 16; i++) p.rect(70 + Math.floor(r() * 120), 68 + Math.floor(r() * 20), 1, 1, '#c8a060');
    who(p, 'pigeon', 2, 118);
  },

  // Retour à Saint-Banal : Momo et Benjamin attendent sur le quai. Encore.
  boucle(p) {
    outdoor(p, { ...DAY, railY: 88 });
    p.rect(0, 40, 96, 48, INK);
    p.rect(0, 41, 95, 47, '#c8b89a');
    p.rect(0, 32, 102, 9, INK);
    p.rect(0, 33, 101, 7, '#a84a3a');
    p.rect(22, 46, 52, 11, INK);
    p.rect(23, 47, 50, 9, '#2e4a8a');
    p.rect(27, 50, 42, 2, '#f0f0f4');
    for (const x of [8, 78]) {
      p.rect(x, 62, 12, 18, INK);
      p.rect(x + 1, 63, 10, 16, '#3a4a6a');
    }
    putTrain(p, 112, 88, { cars: 2 }, { flip: true });
    platform(p, 94);
    who(p, 'momo', 6, 117);
    who(p, 'benjamin', 50, 117);
    // la flèche qui tourne en rond
    for (const rr of [13, 14]) ring(p, 176, 26, rr, '#f6f2ea', 30, 320);
    for (let k = 0; k < 6; k++) p.rect(184 + k, 10 + k, 1, 12 - k * 2, '#f6f2ea');
  },

  // Après le dernier rail, il n'y avait plus rien.
  neant(p) {
    sky(p, ['#1c1830', '#0e0c1c', '#06050c', '#000000'], 0, TH);
    stars(p, 4, 70, TH);
    for (let y = 30; y < TH; y++) {
      const w = 86 - Math.round((y - 30) * 0.55) + ((y * 5) % 4);
      if (w > 0) p.rect(0, y, w, 1, y < 34 ? '#6a6258' : y % 7 === 0 ? '#3a3438' : '#2a2630');
    }
    rails(p, 27, 0, 86);
    p.line(86, 27, 98, 20, STEEL);
    p.line(86, 28, 96, 38, STEEL);
    p.rect(60, 8, 2, 20, STEEL);
    p.rect(50, 0, 22, 12, INK);
    p.rect(51, 1, 20, 10, '#c03030');
    p.rect(54, 5, 14, 2, '#f0f0f4');
    stamp(p, makeTrain({ cars: 1 }), 132, 22, { rot: true });
    for (const [x, y] of [[136, 2], [146, 8], [158, 0], [168, 6], [126, 30], [180, 26]]) p.rect(x, y, 1, 12, '#6a6a8a');
    for (const [x, y] of [[104, 50], [112, 76], [98, 96], [120, 104]]) p.rect(x, y, 3, 2, '#5a4030');
  },

  // Tu t'es endormi au wagon 2. Au réveil, un jeune conducteur te regardait depuis le quai.
  retraite(p) {
    p.rect(0, 0, TW, TH, '#3a3040');
    p.rect(0, 0, TW, 8, '#2a222e');
    const w = new Pix(108, 66);
    sky(w, DAY.cols, 0, 48);
    hills(w, 44, 12, '#7aa870', 3, 48);
    w.rect(0, 48, 108, 18, '#6a6672');
    w.rect(0, 48, 108, 2, GOLD);
    stamp(w, fig('joueur').small, 62, 23);
    p.rect(98, 14, 112, 70, INK);
    stamp(p, w, 100, 16);
    p.line(108, 20, 122, 34, '#ffffff');
    p.line(112, 20, 120, 28, '#ffffff');
    p.rect(0, 86, TW, 34, INK);
    p.rect(0, 87, TW, 33, '#6a3038');
    p.rect(0, 87, TW, 4, '#8a4048');
    stamp(p, bustOf('vieux'), -10, 14);
    bitmap(p, 104, 2, ZED, '#e8e2d4', 1);
    bitmap(p, 112, 6, ZED, '#e8e2d4', 2);
  },

  // Pas de terminus : le train repart au lever du jour, et toi dans quarante ans salue depuis le quai.
  vraie_fin(p) {
    sky(p, ['#24305a', '#5a4a8a', '#c8607a', '#f0a850', '#fce08a'], 0, 90);
    stars(p, 7, 14, 24);
    p.ellipse(150, 72, 30, 30, '#fce08a', 0.5);
    p.ellipse(150, 72, 22, 22, '#fff0b0');
    p.ellipse(150, 72, 16, 16, '#fffbe0');
    hills(p, 86, 12, '#4a3a6a', 5, 90);
    hills(p, 89, 6, '#2e2a4a', 9, 90);
    p.rect(0, 89, TW, 31, '#2a2438');
    rails(p, 90);
    putTrain(p, 74, 90, { cars: 3 });
    for (const [x, y] of [[60, 30], [70, 26], [96, 38], [190, 22]]) {
      p.line(x, y, x + 2, y + 2, INK);
      p.line(x + 2, y + 2, x + 4, y, INK);
    }
    platform(p, 96);
    who(p, 'vieux', 12, 118);
    confetti(p, 12, 26, 60, ['#fff0b0', '#fce08a', '#f6f2ea']);
  },
};

function cover(p) {
  sky(p, ['#0c1024', '#141a3a', '#24305a', '#3a4a7a', '#6a5a8a'], 0, 124);
  stars(p, 3, 90, 90);
  p.ellipse(280, 28, 15, 15, '#f6f2ea', 0.25);
  p.ellipse(280, 28, 12, 12, '#f6f2ea');
  p.ellipse(276, 24, 3, 3, '#d8d4cc');
  p.ellipse(285, 33, 2, 2, '#d8d4cc');
  hills(p, 112, 30, '#1c2244', 2, 124);
  hills(p, 120, 14, '#141a30', 6, 124);
  p.rect(0, 123, p.w, p.h, '#22242e');
  rails(p, 124);
  putTrain(p, 14, 124, { cars: 5 });
  platform(p, 134);
  ['hoggy', 'zemmour', 'ronde', 'momo'].forEach((id, i) => who(p, id, -8 + i * 23, 172 - (i % 2)));
  ['benjamin', 'blonde', 'toxico', 'shrek'].forEach((id, i) => who(p, id, 204 + i * 22, 172 - (i % 2)));
}

export const TABLEAU_IDS = Object.keys(SCENES);

// Texture de l'image de fin `id`, créée à la première demande.
export function tableauKey(scene, id) {
  const key = `tableau_${id}`;
  if (!scene.textures.exists(key)) {
    const p = new Pix(TW, TH);
    (SCENES[id] ?? SCENES.retard)(p);
    p.toTexture(scene, key);
  }
  return key;
}

// Illustration du menu (320×180).
export function coverKey(scene) {
  if (!scene.textures.exists('cover')) {
    const p = new Pix(320, 180);
    cover(p);
    p.toTexture(scene, 'cover');
  }
  return 'cover';
}
