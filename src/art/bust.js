// Les personnages en gros plan des dialogues : bust_<id>, 128×106, affiché ×2 et posé sur la boîte de texte.
// Chaque forme est un masque peint en aplats : lumière en haut à gauche, ombre en bas à droite, contour sombre.
// Le buste se dessine dans l'ordre : dos, torse, cou, col, oreilles, tête, visage, cheveux, chapeau.

import { Pix, mix } from './draw.js';
import { paintRamp } from './paint.js';

const W = 128;
const H = 106;
const CX = 63.5;
const INK = '#14101a';
const WHITE = '#f6f2ea';

const tones = (base, spread = 0.09) => paintRamp(base, 5, { spread, shift: 0.7 }).reverse();
const ramp = (base, spread) => (Array.isArray(base) ? base : tones(base, spread));

// ───────── Masques ─────────
const at = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

const E = (cx, cy, rx, ry = rx) => (m, v) => {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(H - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(W - 1, Math.ceil(cx + rx)); x++) {
      if (((x + 0.5 - cx - 0.5) / rx) ** 2 + ((y + 0.5 - cy - 0.5) / ry) ** 2 <= 1) m[at(x, y)] = v;
    }
  }
};
const R = (x, y, w, h) => (m, v) => {
  for (let j = Math.max(0, Math.round(y)); j < Math.min(H, Math.round(y + h)); j++) {
    for (let i = Math.max(0, Math.round(x)); i < Math.min(W, Math.round(x + w)); i++) m[at(i, j)] = v;
  }
};
const P = (...pts) => (m, v) => {
  for (let y = 0; y < H; y++) {
    const yy = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if (ay <= yy !== by <= yy) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(W, Math.round(xs[k + 1])); x++) m[at(x, y)] = v;
    }
  }
};
const Cut = (prim) => (m) => prim(m, 0);
// La forme et son reflet par rapport à l'axe du visage.
const Both = (prim) => (m, v) => {
  const t = new Uint8Array(W * H);
  prim(t, 1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!t[at(x, y)]) continue;
      m[at(x, y)] = v;
      m[at(W - 1 - x, y)] = v;
    }
  }
};
const mask = (...prims) => {
  const m = new Uint8Array(W * H);
  for (const p of prims) p(m, 1);
  return m;
};
const hit = (m, x, y) => inside(x, y) && m[at(x, y)] === 1;
const and = (a, b) => a.map((v, i) => (v && b[i] ? 1 : 0));

// ───────── Toile ─────────
class Bust {
  constructor() {
    this.p = new Pix(W, H);
  }

  // Aplat, croissant de lumière, deux croissants d'ombre, contour.
  fill(m, base, { s = 3, l = 2, line = INK, clip = null, a = 1 } = {}) {
    const T = ramp(base);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!m[at(x, y)]) {
          if (line && !(clip && !clip[at(x, y)]) && (hit(m, x + 1, y) || hit(m, x - 1, y) || hit(m, x, y + 1) || hit(m, x, y - 1))) this.p.set(x, y, line);
          continue;
        }
        if (clip && !clip[at(x, y)]) continue;
        let t = 2;
        if (l && !hit(m, x - l, y - l)) t = 1;
        if (s && !hit(m, x + s, y + s)) t = 3;
        if (s && !hit(m, x + Math.ceil(s / 2), y + Math.ceil(s / 2))) t = 4;
        this.p.set(x, y, T[t], a);
      }
    }
    return m;
  }

  flat(m, c, a = 1) {
    for (let i = 0; i < m.length; i++) if (m[i]) this.p.set(i % W, Math.floor(i / W), c, a);
  }

  // Motif posé sur un masque : la fonction rend une couleur ou null.
  over(m, fn) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!m[at(x, y)]) continue;
        const c = fn(x, y);
        if (c) this.p.set(x, y, c);
      }
    }
  }

  // Ombre portée de `from` sur `on`, décalée vers le bas.
  cast(from, on, c, dx, dy) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (on[at(x, y)] && !from[at(x, y)] && hit(from, x - dx, y - dy)) this.p.set(x, y, c);
      }
    }
  }

  px(x, y, c, a = 1) {
    if (inside(Math.round(x), Math.round(y))) this.p.set(Math.round(x), Math.round(y), c, a);
  }

  rect(x, y, w, h, c, a = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a);
  }

  line(x0, y0, x1, y1, c, th = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n);
      this.rect(x, y, th, th, c);
    }
  }

  // Trait et son reflet.
  lines(x0, y0, x1, y1, c, th = 1) {
    this.line(x0, y0, x1, y1, c, th);
    this.line(W - 1 - x0, y0, W - 1 - x1, y1, c, th);
  }
}

// ───────── Pièces du corps ─────────
function torso(c, color, { sh = 56, top = 76, spread, s = 4 } = {}) {
  const m = mask(
    P(
      [CX - 14, top - 2],
      [CX + 14, top - 2],
      [CX + 24, top + 3],
      [CX + sh - 8, top + 8],
      [CX + sh, top + 16],
      [CX + sh + 2, H],
      [CX - sh - 2, H],
      [CX - sh, top + 16],
      [CX - sh + 8, top + 8],
      [CX - 24, top + 3],
    ),
  );
  c.body = m;
  c.b.fill(m, ramp(color, spread), { s, l: 2 });
  return m;
}

// Séparation du bras et du buste.
function armLines(c, color, sh = 56) {
  const T = ramp(color);
  c.b.lines(CX - sh + 16, 96, CX - sh + 18, H, T[4], 1);
}

// Le cou se fond dans ce qui est dessous : pas de trait en bas, seulement les côtés.
function neck(c, w = 13, skin = c.S) {
  const { b } = c;
  const m = mask(R(CX - w, 58, w * 2, 26));
  b.flat(m, skin[2]);
  b.rect(Math.round(CX + w) - 4, 58, 4, 26, skin[3]);
  b.rect(Math.round(CX - w) - 1, 58, 1, 19, INK);
  b.rect(Math.round(CX + w), 58, 1, 19, INK);
  c.neck = m;
  return m;
}

function head(c, { top = 12, bot = 70, hw = 29, jw = 15 } = {}) {
  const m = mask(
    E(CX, top + hw, hw, hw),
    P(
      [CX - hw, top + hw],
      [CX + hw, top + hw],
      [CX + hw - 2, bot - 16],
      [CX + jw, bot - 2],
      [CX + jw - 4, bot],
      [CX - jw + 4, bot],
      [CX - jw, bot - 2],
      [CX - hw + 2, bot - 16],
    ),
  );
  Object.assign(c, { head: m, top, bot, hw, jw });
  if (c.neck) c.b.cast(m, c.neck, c.S[4], 1, 5);
  c.b.fill(m, c.S, { s: 4, l: 2 });
  return m;
}

function ears(c, y = 44, { rx = 5, ry = 8, hw = 29 } = {}) {
  const m = mask(Both(E(CX - hw - 1, y, rx, ry)));
  c.b.fill(m, c.S, { s: 2, l: 1 });
  c.b.lines(CX - hw - 2, y - 3, CX - hw - 1, y + 3, c.S[4]);
}

// Yeux. kind : normal, wide, tired, calm. Le regard part vers le conducteur, à gauche.
function eye(c, ex, ey, { iris = '#3e2c20', kind = 'normal', w = 12, h = 9, gaze = -1, white = WHITE, lid = INK } = {}) {
  const b = c.b;
  const wide = kind === 'wide';
  const ww = wide ? w + 1 : w;
  const hh = wide ? h + 3 : kind === 'calm' ? h - 2 : h;
  const x0 = Math.round(ex - ww / 2);
  const y0 = Math.round(ey - hh / 2);
  const outerLeft = ex < CX;
  for (let j = 0; j < hh; j++) {
    const indent = j === 0 ? 2 : j === hh - 1 ? 2 : j === 1 ? 1 : 0;
    b.rect(x0 + indent, y0 + j, ww - indent * 2, 1, white);
  }
  // ombre de la paupière sur le blanc
  b.rect(x0 + 1, y0 + 1, ww - 2, 1, mix(white, '#7a7a98', 0.45));
  // iris, pupille, reflet
  const ix = Math.round(ex + gaze - (wide ? 2 : 3));
  const iw = wide ? 5 : 6;
  const ih = hh - 1;
  const T = tones(iris, 0.1);
  b.rect(ix, y0, iw, ih, T[3]);
  b.rect(ix + 1, y0 + ih - 2, iw - 2, 1, T[1]);
  b.rect(ix, y0, iw, 1, T[4]);
  b.rect(ix + 1, y0 + 1, iw - 2, Math.max(2, ih - 3), INK);
  b.rect(ix + 1, y0 + 1, 2, 2, '#ffffff');
  b.px(ix + iw - 2, y0 + ih - 2, T[0]);
  // paupières
  const lidW = ww - 2;
  b.rect(x0 + 1, y0 - 1, lidW, wide ? 1 : 2, lid);
  b.rect(outerLeft ? x0 - 1 : x0 + ww, y0, 1, 2, lid);
  b.px(outerLeft ? x0 : x0 + ww - 1, y0, lid);
  b.rect(x0 + 2, y0 + hh, ww - 4, 1, c.S[4]);
  if (kind === 'tired') {
    b.rect(x0, y0 - 1, ww, 3, c.S[3]);
    b.rect(x0 + 1, y0 + 2, ww - 2, 1, lid);
    b.rect(x0 + 2, y0 + hh + 2, ww - 3, 1, c.S[3]);
  }
  if (kind === 'calm') {
    b.rect(x0, y0 - 2, ww, 2, c.S[3]);
    b.rect(x0, y0 - 1, ww, 1, lid);
    // cils
    b.px(outerLeft ? x0 - 2 : x0 + ww + 1, y0 - 2, lid);
    b.px(outerLeft ? x0 - 1 : x0 + ww, y0 - 1, lid);
  }
}

function eyes(c, o = {}) {
  const dx = o.dx ?? 14;
  const y = o.y ?? 42;
  eye(c, CX - dx, y, o);
  eye(c, CX + dx, y, o);
  c.eyeY = y;
}

function brows(c, { dx = 14, y = 34, w = 14, th = 2, tilt = 0, color = '#3a2a1c' } = {}) {
  // tilt > 0 : sourcils froncés, tilt < 0 : étonnés
  c.b.line(CX - dx - w / 2, y - tilt, CX - dx + w / 2, y + tilt, color, th);
  c.b.line(CX + dx - w / 2, y + tilt, CX + dx + w / 2, y - tilt, color, th);
}

function nose(c, y = 53, w = 4) {
  const { b, S } = c;
  const x = Math.round(CX);
  b.rect(x + 2, y - 8, 2, 8, S[3]);
  b.rect(x - 1, y - 7, 2, 5, S[1]);
  b.rect(x - w, y, w * 2 + 1, 1, S[4]);
  b.px(x - w - 1, y - 1, S[4]);
  b.px(x + w + 1, y - 1, S[4]);
  b.rect(x + 1, y - 1, w, 1, S[3]);
}

function mouth(c, kind = 'smile', y = 60, w = 16) {
  const { b, S } = c;
  const x0 = Math.round(CX - w / 2);
  if (kind === 'grin') {
    const m = mask(P([x0 - 3, y - 3], [x0 + w + 4, y - 3], [x0 + w + 1, y + 6], [x0, y + 6]));
    b.fill(m, ['#ffffff', '#ffffff', '#ffffff', '#ded8d0', '#ded8d0'], { s: 0, l: 0, line: INK });
    b.rect(x0 - 1, y + 3, w + 3, 3, '#5a1e20');
    for (let x = x0 + 2; x < x0 + w; x += 5) b.rect(x, y - 3, 1, 6, '#b8b0a8');
    b.rect(x0 + 1, y + 8, w - 1, 1, S[3]);
    b.px(x0 - 4, y - 4, S[4]);
    b.px(x0 + w + 5, y - 4, S[4]);
  } else if (kind === 'smile') {
    b.rect(x0 + 2, y, w - 3, 1, '#4a2420');
    b.px(x0 + 1, y - 1, '#4a2420');
    b.px(x0, y - 2, '#4a2420');
    b.px(x0 + w - 1, y - 1, '#4a2420');
    b.px(x0 + w, y - 2, '#4a2420');
    b.rect(x0 + 5, y + 2, w - 9, 1, S[3]);
  } else if (kind === 'flat') {
    b.rect(x0 + 1, y, w - 2, 1, '#4a2420');
    b.rect(x0 + 4, y + 2, w - 8, 1, S[3]);
  } else if (kind === 'open') {
    const m = mask(E(CX, y + 1, w / 3, 4));
    b.fill(m, ['#5a1e20', '#5a1e20', '#5a1e20', '#3a1014', '#3a1014'], { s: 2, l: 0, line: INK });
  }
}

function blush(c, y = 53, dx = 20) {
  const col = mix(c.S[2], '#e0504a', 0.28);
  for (let j = -2; j <= 2; j++) {
    for (let i = -6; i <= 6; i++) {
      if ((i + j) % 2 === 0 && i * i + 6 * j * j < 34) {
        c.b.px(CX - dx + i, y + j, col);
        c.b.px(CX + dx + i, y + j, col);
      }
    }
  }
}

function glasses(c, { color = INK, y = 42, dx = 14, rw = 10, rh = 8, tint = 0.14 } = {}) {
  const { b } = c;
  for (const ex of [CX - dx, CX + dx]) {
    const x = Math.round(ex - rw);
    const yy = y - rh;
    b.rect(x + 2, yy + 2, rw * 2 - 2, rh * 2 - 2, '#dcecff', tint);
    b.rect(x + 1, yy, rw * 2, 2, color);
    b.rect(x + 1, yy + rh * 2, rw * 2, 2, color);
    b.rect(x, yy + 1, 2, rh * 2, color);
    b.rect(x + rw * 2, yy + 1, 2, rh * 2, color);
    b.line(x + 4, yy + rh * 2 - 3, x + 9, yy + 3, '#ffffff');
  }
  b.rect(Math.round(CX) - 4, y - 3, 9, 2, color);
  b.lines(CX - dx - rw - 1, y - 3, CX - 29, y - 4, color, 2);
}

// Casquette à visière : calotte, bandeau, visière, insigne.
function cap(c, color, { band, visor = '#14141c', badge = '#e8c860', hw = c.hw + 3, y = c.top } = {}) {
  const { b } = c;
  const T = tones(color);
  const crown = mask(P([CX - hw + 3, y + 14], [CX - hw - 4, y + 2], [CX - hw + 5, y - 8], [CX + hw - 5, y - 8], [CX + hw + 4, y + 2], [CX + hw - 3, y + 14]));
  b.fill(crown, T, { s: 4, l: 2 });
  const bandM = mask(R(CX - hw + 2, y + 11, hw * 2 - 4, 7));
  b.fill(bandM, band ?? T[3], { s: 1, l: 0 });
  const vis = mask(P([CX - hw + 1, y + 17], [CX + hw - 1, y + 17], [CX + hw - 7, y + 24], [CX - hw + 7, y + 24]));
  b.cast(vis, c.head, c.S[4], 0, 3);
  b.fill(vis, visor, { s: 0, l: 0 });
  b.rect(Math.round(CX - hw + 9), y + 18, 20, 1, '#5a5a70');
  b.rect(Math.round(CX) - 4, y + 5, 9, 9, INK);
  b.rect(Math.round(CX) - 3, y + 6, 7, 7, badge);
  b.rect(Math.round(CX) - 3, y + 6, 7, 2, '#fff4c0');
}

function shortHair(c, color, { line = 24, side = 12, spikes = 0 } = {}) {
  const { b, hw, top } = c;
  const m = mask(E(CX, top + hw - 1, hw + 2, hw + 1), Cut(R(0, line, W, H)), Both(R(CX - hw - 1, line - 1, 5, side)));
  for (let i = 0; i < spikes; i++) P([CX - hw + 4 + (i * (2 * hw - 8)) / spikes, top + 3], [CX - hw + 8 + (i * (2 * hw - 8)) / spikes, top - 5], [CX - hw + 14 + (i * (2 * hw - 8)) / spikes, top + 3])(m, 1);
  // frange cranée
  Cut(P([CX - 18, line + 1], [CX - 8, line - 5], [CX, line + 1]))(m);
  b.cast(m, c.head, c.S[3], 0, 2);
  b.fill(m, ramp(color, 0.07), { s: 3, l: 2 });
  return m;
}

// Assemble un humain. Les fonctions reçoivent le contexte { b, S, head, top, bot, hw, jw… }.
function human({ skin, spread, back, body, collar, face, hair, over, shape = {} }) {
  const c = { b: new Bust(), S: tones(skin, spread) };
  back?.(c);
  body?.(c);
  neck(c, shape.neck ?? 13);
  collar?.(c);
  if (shape.ears !== false) ears(c, 46, { hw: shape.hw ?? 29 });
  head(c, shape);
  face?.(c);
  hair?.(c);
  over?.(c);
  return c.b.p;
}

// Tout en niveaux de gris (Jean Gabin).
function gray(p) {
  const d = p.d;
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  return p;
}

// Version « à moitié partie en fumée » d'un buste : le côté droit se défait en cendres qui montent.
export function dusted(src, seed = 3) {
  const { w, h } = src;
  const out = new Pix(w, h);
  const noise = (x, y, k) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719 + seed) * 43758.5453;
    return n - Math.floor(n);
  };
  const ASH = ['#b8b0c0', '#8e879a', '#6a6478'];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (src.d[o + 3] < 128) continue;
      const t = Math.max(0, Math.min(1, (x / w - 0.3) * 1.5 + (1 - y / h) * 0.3));
      const c = [src.d[o], src.d[o + 1], src.d[o + 2]];
      if (noise(x >> 1, y >> 1, 1) > t * 1.2) {
        out.set(x, y, mix(c, '#8e879a', t * 0.8));
        continue;
      }
      if (noise(x, y, 2) < 0.3) {
        const lift = Math.round(3 + noise(x, y, 3) * 22 * t);
        out.set(x + Math.round(lift * 0.5), y - lift, ASH[(x + y) % 3]);
      }
    }
  }
  return out;
}

const BEARD = () =>
  mask(P([CX - 29, 44], [CX - 23, 52], [CX - 16, 57], [CX, 58], [CX + 16, 57], [CX + 23, 52], [CX + 29, 44], [CX + 28, 60], [CX + 18, 73], [CX + 6, 77], [CX - 6, 77], [CX - 18, 73], [CX - 28, 60]));

// Le conducteur (le joueur) et son double de quarante ans : même uniforme, la barbe blanche en plus.
function conductor(old) {
  return human({
    skin: old ? '#e6c0a4' : '#eebf98',
    shape: { jw: 15 },
    body(c) {
      const { b } = c;
      torso(c, '#7a2f2f');
      armLines(c, '#7a2f2f');
      b.rect(Math.round(CX), 90, 1, 16, '#4a1a1c');
      for (const y of [90, 98]) {
        b.rect(Math.round(CX) + 3, y, 6, 6, INK);
        b.rect(Math.round(CX) + 4, y + 1, 4, 4, '#e8c860');
        b.px(Math.round(CX) + 4, y + 1, '#fff0b0');
      }
      b.lines(CX - 46, 87, CX - 30, 82, '#e8c860', 2);
    },
    collar(c) {
      const col = mask(P([CX - 18, 74], [CX, 90], [CX + 18, 74], [CX + 24, 80], [CX, 98], [CX - 24, 80]));
      c.b.fill(col, '#f0ece0', { s: 2, l: 1 });
    },
    face(c) {
      const { b, S } = c;
      brows(c, { y: 36, th: 2, tilt: 0, color: old ? '#c8c8d0' : '#3a2414' });
      eyes(c, { iris: '#4a3018', kind: old ? 'calm' : 'normal', y: 44 });
      nose(c, 54);
      if (old) {
        b.lines(CX - 26, 41, CX - 23, 44, S[4]);
        b.lines(CX - 26, 47, CX - 23, 45, S[4]);
        b.lines(CX - 22, 49, CX - 8, 50, S[3]);
        b.fill(BEARD(), ['#ffffff', '#f4f4f6', '#e4e4ea', '#c0c0cc', '#9a9aa8'], { s: 2, l: 1 });
        mouth(c, 'smile', 64, 12);
      } else {
        mouth(c, 'smile', 65, 14);
      }
    },
    hair(c) {
      shortHair(c, old ? '#e8e8ec' : '#4a3020', { line: 30, side: 16 });
      cap(c, '#7a2f2f', { band: '#3a1416', badge: '#e8c860', y: 9 });
    },
  });
}

// ───────── Personnages ─────────
const BUSTS = {
  // Momo : 19 ans, survêtement sombre à bandes, sacoche en bandoulière, lunettes, duvet de moustache et petit bouc.
  momo: () =>
    human({
      skin: '#dcae84',
      body(c) {
        const { b } = c;
        torso(c, '#1a2030');
        armLines(c, '#1a2030');
        const stripe = (dy, col) =>
          b.over(and(c.body, mask(Both(P([CX - 24, 82 + dy], [CX - 48, 87 + dy], [CX - 54, 93 + dy], [CX - 54, 96 + dy], [CX - 48, 90 + dy], [CX - 24, 85 + dy])))), () => col);
        stripe(0, '#f0f0f4');
        stripe(4, '#58b0e0');
        b.rect(Math.round(CX), 92, 1, 14, '#c8c8d4');
      },
      collar(c) {
        const { b } = c;
        const col = mask(P([CX - 17, 72], [CX - 4, 88], [CX + 4, 88], [CX + 17, 72], [CX + 22, 80], [CX + 5, 96], [CX - 5, 96], [CX - 22, 80]));
        b.fill(col, '#242c40', { s: 2, l: 1 });
        b.lines(CX - 17, 73, CX - 5, 88, '#f0f0f4');
        // sangle et sacoche, sans logo
        b.line(CX - 30, 80, CX + 26, 103, INK, 5);
        b.line(CX - 29, 81, CX + 27, 104, '#3a3a46', 3);
        const bag = mask(R(CX + 22, 88, 26, 18));
        b.fill(bag, '#2a2a34', { s: 2, l: 1 });
        b.rect(Math.round(CX) + 25, 93, 20, 1, '#8a8a98');
        b.rect(Math.round(CX) + 42, 93, 3, 3, '#c8c8d4');
      },
      face(c) {
        const { b, S } = c;
        brows(c, { y: 33, th: 3, tilt: 0, color: '#1c1410' });
        eyes(c, { iris: '#3a2412', y: 44 });
        nose(c, 54);
        mouth(c, 'smile', 64, 12);
        const fuzz = mix(S[3], '#1c1410', 0.55);
        const dots = (m) => b.over(m, (x, y) => ((x + y) % 2 === 0 ? fuzz : null));
        dots(mask(P([CX - 11, 58], [CX, 59], [CX + 11, 58], [CX + 12, 61], [CX, 61], [CX - 12, 61])));
        dots(mask(P([CX - 5, 66.5], [CX + 5, 66.5], [CX + 3, 71], [CX - 3, 71])));
        glasses(c, { color: '#14141c', y: 44, dx: 14, rw: 10, rh: 7 });
      },
      hair(c) {
        shortHair(c, '#1c1410', { line: 28, side: 14 });
        for (const [x, y] of [[-16, 16], [-6, 13], [4, 13], [14, 16]]) c.b.lines(CX + x, y, CX + x + 6, y + 6, '#4a3a30');
      },
    }),

  // Benjamin : 19 ans, fin, cheveux bruns au-dessus des épaules, petite moustache, maillot bleu sans écusson.
  benjamin: () =>
    human({
      skin: '#eeb994',
      shape: { hw: 26, jw: 12, neck: 11 },
      back(c) {
        const m = mask(E(CX, 40, 33, 33), Both(P([CX - 33, 40], [CX - 14, 40], [CX - 12, 72], [CX - 34, 74])));
        c.b.fill(m, '#4a2e1a', { s: 3, l: 2 });
      },
      body(c) {
        torso(c, '#1f3f9a', { sh: 50 });
        armLines(c, tones('#1f3f9a'), 50);
        c.b.over(and(c.body, mask(R(0, 93, W, 3))), () => '#f0f0f4');
        c.b.over(and(c.body, mask(R(0, 96, W, 3))), () => '#c8202c');
      },
      collar(c) {
        const { b } = c;
        b.flat(mask(P([CX - 18, 76], [CX + 18, 76], [CX + 3, 90], [CX - 3, 90])), c.S[3]);
        b.lines(CX - 19, 76, CX - 2, 90, '#f0f0f4', 2);
        b.lines(CX + 19, 76, CX + 2, 90, '#f0f0f4', 2);
      },
      face(c) {
        const { b } = c;
        brows(c, { dx: 13, y: 35, th: 2, tilt: -1, color: '#3a2414' });
        eyes(c, { iris: '#4a3018', y: 44, dx: 13 });
        nose(c, 54);
        mouth(c, 'smile', 66, 10);
        const mo = mask(P([CX - 11, 57], [CX, 59], [CX + 11, 57], [CX + 13, 62], [CX + 6, 61], [CX, 60.5], [CX - 6, 61], [CX - 13, 62]));
        b.fill(mo, '#2e1c10', { s: 1, l: 1 });
      },
      hair(c) {
        const { b } = c;
        const m = mask(
          E(CX, c.top + c.hw - 1, c.hw + 3, c.hw + 1),
          Cut(P([CX - 21, 72], [CX - 22, 36], [CX - 5, 24], [CX + 7, 30], [CX + 22, 36], [CX + 21, 72])),
          Cut(R(0, 72, W, H)),
        );
        b.cast(m, c.head, c.S[3], 0, 2);
        b.fill(m, '#5a3a22', { s: 3, l: 2 });
        b.lines(CX - 12, 16, CX - 21, 36, '#3a2414');
        b.lines(CX - 4, 14, CX - 14, 28, '#3a2414');
        b.lines(CX - 25, 40, CX - 24, 62, '#3a2414');
      },
    }),

  // Boucles décolorées sur le dessus, côtés foncés en dégradé, sourcils épais, lèvres pincées.
  lamine: () =>
    human({
      skin: '#9c6840',
      shape: { jw: 15 },
      body(c) {
        const GARNET = '#8a1c3c';
        torso(c, GARNET, { sh: 56 });
        const stripes = (x) => ((x + 200) % 24 < 12 ? '#1c3a8a' : null);
        c.b.over(and(c.body, mask(R(0, 76, W, 30))), stripes);
        const T = tones(GARNET);
        armLines(c, T);
        // le 10
        const white = '#f6f2ea';
        const x = Math.round(CX) - 10;
        c.b.rect(x, 90, 4, 16, white);
        c.b.rect(x + 8, 90, 12, 16, white);
        c.b.rect(x + 12, 94, 4, 12, T[2]);
      },
      collar(c) {
        const col = mask(P([CX - 16, 76], [CX + 16, 76], [CX + 3, 90], [CX - 3, 90]));
        c.b.flat(col, c.S[3]);
        c.b.lines(CX - 18, 76, CX - 2, 90, '#e8b83a', 2);
        c.b.lines(CX + 18, 76, CX + 2, 90, '#e8b83a', 2);
      },
      face(c) {
        const { b, S } = c;
        brows(c, { y: 35, w: 15, th: 4, tilt: 1, color: '#17100c' });
        eyes(c, { iris: '#241208', y: 44 });
        nose(c, 54, 5);
        // les lèvres pincées
        const x = Math.round(CX);
        b.rect(x - 7, 61, 15, 2, '#6e3a30');
        b.px(x, 61, S[3]);
        b.rect(x - 9, 63, 19, 1, '#34181a');
        b.rect(x - 6, 64, 13, 3, '#8a4c42');
        b.rect(x - 3, 64, 7, 1, '#a86a5c');
        b.rect(x - 4, 68, 9, 1, S[3]);
      },
      hair(c) {
        const { b, head, S } = c;
        // les côtés : le noir s'éclaircit en descendant vers les oreilles
        const sides = and(head, mask(Both(R(CX - 32, 20, 12, 30))));
        b.over(sides, (x, y) => {
          const fade = 1 - (y - 20) / 30;
          return ((x * 3 + y * 5) % 7) / 7 < fade * 1.5 ? '#1e1410' : null;
        });
        // les boucles, du fond vers le front : [décalage, y, rayon]
        const CURLS = [
          [-14, 5, 5], [-5, 3, 5], [4, 3, 5], [13, 5, 5],
          [-23, 10, 5], [-14, 11, 5], [-5, 9, 5], [4, 9, 5], [13, 11, 5], [22, 10, 5],
          [-28, 18, 5], [-20, 17, 5], [-11, 16, 5], [-2, 15, 5], [7, 15, 5], [16, 17, 5], [25, 17, 5],
          [-25, 25, 4], [-17, 24, 5], [-8, 23, 5], [1, 23, 5], [10, 23, 5], [19, 25, 5], [26, 25, 4],
        ];
        const crown = mask(...CURLS.map(([dx, y, r]) => E(CX + dx, y, r)));
        b.cast(crown, head, S[4], 0, 3);
        b.fill(crown, '#2a1c14', { s: 0, l: 0 });
        const PLATINUM = ['#f6eec8', '#f2e6b8', '#dcc88e', '#b89c64', '#86693e'];
        for (const [dx, y, r] of CURLS) {
          const m = mask(E(CX + dx, y, r - 1));
          b.fill(m, PLATINUM, { s: 2, l: 2, line: '#54401f', clip: crown });
          // un tour de boucle et son reflet
          const x = Math.round(CX + dx);
          b.rect(x - 1, y + 1, 2, 1, '#a08858');
          b.px(x + 1, y, '#a08858');
          b.px(x - 1, y - 2, '#fffbe0');
        }
      },
    }),

  // Thanos : mâchoire striée, épaulières dorées, poing ganté levé (il manque les pierres).
  thanos: () =>
    human({
      skin: '#8a6ab0',
      shape: { top: 12, bot: 86, hw: 32, jw: 27, neck: 24 },
      body(c) {
        torso(c, '#2e3a7a', { sh: 62, top: 76 });
        const G = ['#fff0a8', '#f0c850', '#d8a830', '#b08420', '#886418'];
        const pads = and(mask(Both(P([CX - 66, H], [CX - 64, 88], [CX - 54, 82], [CX - 30, 78], [CX - 26, 92], [CX - 40, H]))), c.body);
        c.b.fill(pads, G, { s: 2, l: 1 });
        const plate = mask(P([CX - 22, 90], [CX + 22, 90], [CX + 16, H], [CX - 16, H]));
        c.b.fill(plate, G, { s: 2, l: 1 });
        c.b.rect(Math.round(CX) - 1, 92, 2, 14, G[4]);
      },
      face(c) {
        const { b, S } = c;
        brows(c, { y: 36, w: 16, th: 4, tilt: 3, color: '#4a3470' });
        eyes(c, { iris: '#3a6ab0', y: 45, w: 10, h: 7 });
        nose(c, 57, 6);
        b.rect(Math.round(CX) - 13, 66, 27, 2, '#3a2450');
        b.px(CX - 14, 67, '#3a2450');
        b.px(CX + 14, 67, '#3a2450');
        // menton strié
        for (let i = -2; i <= 2; i++) b.rect(Math.round(CX) + i * 6, 72 + Math.abs(i), 2, 12 - Math.abs(i) * 2, S[4]);
        b.lines(CX - 24, 56, CX - 20, 68, S[3]);
      },
      over(c) {
        const { b } = c;
        const G = ['#fff0a8', '#f0c850', '#d8a830', '#b08420', '#886418'];
        const fist = mask(P([6, H], [4, 86], [10, 76], [34, 76], [40, 86], [38, H]));
        b.fill(fist, G, { s: 3, l: 2 });
        for (let i = 0; i < 4; i++) {
          b.rect(9 + i * 7, 79, 5, 5, '#2a1c10');
          b.rect(15 + i * 7, 77, 1, 9, G[4]);
        }
        b.flat(mask(E(22, 95, 6, 6)), '#2a1c10');
        b.rect(19, 91, 3, 2, '#886418');
      },
    }),

  // Scrat : yeux exorbités qui louchent, dents de sabre, et son gland serré contre lui.
  scrat: () => {
    const c = { b: new Bust() };
    const { b } = c;
    const S = tones('#b9a184');
    c.S = S;
    // queue en panache
    const tail = mask(E(CX + 44, 62, 16, 40), E(CX + 38, 24, 13, 16));
    b.fill(tail, tones('#7a6248'), { s: 4, l: 2 });
    for (let i = 0; i < 6; i++) b.line(CX + 36 + (i % 2) * 8, 20 + i * 13, CX + 42 + (i % 2) * 8, 28 + i * 13, '#4a3a2a');
    torso(c, S, { sh: 30, top: 86 });
    const belly = and(mask(E(CX, 104, 14, 14)), c.body);
    b.fill(belly, ['#f4ecd8', '#e8dcc0', '#dccfae', '#c4b694', '#a89a7c'], { s: 0, l: 0, line: null });
    const nk = mask(R(CX - 8, 70, 16, 20));
    b.fill(nk, S, { s: 2, l: 0 });
    // oreilles
    const ear = mask(Both(E(CX - 18, 12, 6, 9)));
    b.fill(ear, S, { s: 2, l: 1 });
    b.flat(mask(Both(E(CX - 18, 13, 3, 5))), '#c89a90');
    // crâne et long museau
    const hd = mask(E(CX, 30, 24, 20), P([CX - 20, 36], [CX + 20, 36], [CX + 10, 62], [CX + 7, 78], [CX - 7, 78], [CX - 10, 62]));
    b.fill(hd, S, { s: 3, l: 2 });
    c.head = hd;
    b.rect(Math.round(CX) - 2, 48, 5, 22, S[1]);
    // trois poils sur le crâne
    b.line(CX - 1, 10, CX - 6, 1, '#7a6248');
    b.line(CX, 10, CX, 0, '#7a6248');
    b.line(CX + 1, 10, CX + 6, 2, '#7a6248');
    // yeux exorbités
    for (const ex of [CX - 13, CX + 13]) {
      const ye = mask(E(ex, 30, 14, 15));
      b.fill(ye, ['#ffffff', '#ffffff', '#f6f2ea', '#d8d4cc', '#b8b4ac'], { s: 2, l: 0 });
    }
    b.rect(Math.round(CX) - 9, 30, 4, 5, INK);
    b.px(CX - 9, 30, '#ffffff');
    b.rect(Math.round(CX) + 5, 27, 3, 4, INK);
    b.px(CX + 5, 27, '#ffffff');
    // dents de sabre
    const fangs = mask(Both(P([CX - 8, 76], [CX - 2, 76], [CX - 5, 97])));
    b.fill(fangs, ['#ffffff', '#ffffff', '#f6f2ea', '#d8d4cc', '#b8b4ac'], { s: 1, l: 0 });
    // truffe
    b.flat(mask(E(CX, 74, 6, 4)), INK);
    b.rect(Math.round(CX) - 3, 72, 3, 1, '#6a6a7a');
    // le gland
    const arm = mask(E(CX - 22, 99, 10, 4));
    b.fill(arm, S, { s: 1, l: 1 });
    const nut = mask(E(CX - 36, 94, 9, 11));
    b.fill(nut, '#c89a4a', { s: 3, l: 2 });
    const hat = mask(E(CX - 36, 85, 10, 5));
    b.fill(hat, '#6a4a2c', { s: 2, l: 1 });
    b.rect(Math.round(CX) - 37, 77, 2, 4, '#4a3020');
    for (let i = -3; i <= 3; i++) b.px(CX - 36 + i * 2, 85 + (Math.abs(i) % 2), '#4a3020');
    const paw = mask(E(CX - 29, 100, 5, 3));
    b.fill(paw, S, { s: 1, l: 1 });
    return b.p;
  },

  // Messi : tout petit, barbe rousse, rayures ciel et blanc, le 10.
  messi: () =>
    human({
      skin: '#e8b890',
      shape: { top: 24, bot: 76, hw: 26, jw: 14 },
      body(c) {
        torso(c, '#f4f4f4');
        c.b.over(and(c.body, mask(R(0, 76, W, 30))), (x) => ((x + 200) % 24 < 12 ? '#8cc8f0' : null));
        armLines(c, '#9ab8d0');
        const x = Math.round(CX) - 10;
        c.b.rect(x - 2, 89, 24, 17, '#f4f4f4');
        c.b.rect(x, 91, 4, 15, '#1c2a4a');
        c.b.rect(x + 8, 91, 12, 15, '#1c2a4a');
        c.b.rect(x + 12, 95, 4, 11, '#f4f4f4');
      },
      collar(c) {
        const v = mask(P([CX - 16, 76], [CX + 16, 76], [CX + 3, 88], [CX - 3, 88]));
        c.b.flat(v, c.S[3]);
        c.b.lines(CX - 18, 76, CX - 2, 88, '#1c2a4a', 2);
      },
      face(c) {
        const { b } = c;
        brows(c, { y: 42, th: 2, color: '#4a2c18', w: 13 });
        eyes(c, { iris: '#5a3a20', kind: 'calm', y: 50, dx: 12, w: 11 });
        nose(c, 60);
        const m = mask(P([CX - 25, 50], [CX - 21, 56], [CX - 12, 59], [CX - 6, 63], [CX + 6, 63], [CX + 12, 59], [CX + 21, 56], [CX + 25, 50], [CX + 25, 64], [CX + 14, 80], [CX + 4, 86], [CX - 4, 86], [CX - 14, 80], [CX - 25, 64]));
        Cut(E(CX, 69, 7, 3))(m);
        b.fill(m, '#8a4a26', { s: 3, l: 2 });
        for (const [x, y] of [[-18, 62], [-12, 70], [-5, 77], [5, 78], [12, 70], [18, 62], [-20, 56], [9, 75]]) b.line(CX + x, y, CX + x + 1, y + 4, '#5e3018');
        b.rect(Math.round(CX) - 6, 69, 13, 2, '#6e2a24');
      },
      hair(c) {
        shortHair(c, '#4a2c18', { line: 34, side: 14 });
      },
    }),

  // Jean Gabin : tout en noir et blanc, casquette plate, mégot au coin des lèvres.
  gabin: () =>
    gray(
      human({
        skin: '#c8c8c8',
        shape: { hw: 30, jw: 19 },
        body(c) {
          torso(c, '#6e6e6e');
          armLines(c, '#6e6e6e');
        },
        collar(c) {
          const shirt = mask(P([CX - 18, 74], [CX + 18, 74], [CX + 4, H], [CX - 4, H]));
          c.b.fill(shirt, '#e8e8e8', { s: 2, l: 0 });
          const tie = mask(P([CX - 5, 78], [CX + 5, 78], [CX + 3, 86], [CX + 6, H], [CX - 6, H], [CX - 3, 86]));
          c.b.fill(tie, '#2a2a2a', { s: 2, l: 1 });
          const lapels = mask(Both(P([CX - 30, 76], [CX - 18, 74], [CX - 3, 102], [CX - 8, H], [CX - 30, 96])));
          c.b.fill(lapels, '#868686', { s: 2, l: 1 });
        },
        face(c) {
          const { b, S } = c;
          brows(c, { y: 36, w: 16, th: 4, tilt: 1, color: '#f0f0f0' });
          eyes(c, { iris: '#a8a8a8', kind: 'tired', y: 45 });
          nose(c, 57, 6);
          // bouche tombante
          b.rect(Math.round(CX) - 8, 64, 16, 1, '#2a2a2a');
          b.rect(Math.round(CX) - 10, 65, 2, 1, '#2a2a2a');
          b.rect(Math.round(CX) + 8, 65, 2, 1, '#2a2a2a');
          b.px(CX - 11, 66, '#2a2a2a');
          b.rect(Math.round(CX) - 4, 67, 8, 1, S[3]);
          b.lines(CX - 22, 54, CX - 17, 66, S[3]);
          b.lines(CX - 12, 28, CX - 2, 29, S[3]);
          // le mégot et sa fumée
          b.rect(Math.round(CX) + 5, 63, 17, 4, INK);
          b.rect(Math.round(CX) + 6, 64, 13, 2, '#f4f4f4');
          b.rect(Math.round(CX) + 19, 64, 2, 2, '#8a8a8a');
          for (let i = 0; i < 14; i++) b.rect(Math.round(CX) + 22 + Math.round(Math.sin(i / 2) * 3), 60 - i * 3, 2, 2, '#d8d8d8', 0.7);
        },
        hair(c) {
          const { b } = c;
          const temples = mask(Both(E(CX - 29, 38, 6, 12)));
          b.fill(temples, ['#ffffff', '#ffffff', '#f0f0f0', '#c8c8c8', '#a0a0a0'], { s: 2, l: 1 });
          const T = tones('#4a4a4a');
          const crown = mask(P([CX - 30, 24], [CX - 37, 13], [CX - 25, 3], [CX + 25, 3], [CX + 37, 13], [CX + 30, 24]));
          b.fill(crown, T, { s: 4, l: 2 });
          b.over(crown, (x, y) => ((x + (y % 8 < 4 ? y : -y) + 400) % 6 === 0 ? T[4] : null));
          const vis = mask(P([CX - 34, 21], [CX + 34, 21], [CX + 27, 30], [CX - 27, 30]));
          b.cast(vis, c.head, c.S[4], 0, 3);
          b.fill(vis, '#2e2e2e', { s: 0, l: 0 });
          b.rect(Math.round(CX) - 22, 22, 40, 1, '#6a6a6a');
        },
      }),
    ),

  // Zoro : cheveux verts, œil balafré, trois boucles d'oreille, trois sabres.
  zoro: () =>
    human({
      skin: '#e0b088',
      shape: { jw: 16 },
      body(c) {
        torso(c, '#ece8dc', { sh: 58 });
        armLines(c, '#ece8dc', 58);
      },
      collar(c) {
        const { b } = c;
        const v = mask(P([CX - 18, 76], [CX + 18, 76], [CX + 5, 102], [CX - 5, 102]));
        b.flat(v, c.S[2]);
        b.rect(Math.round(CX), 86, 1, 16, c.S[4]);
        b.lines(CX - 20, 76, CX - 6, 103, '#8a8676', 2);
        // les trois poignées
        ['#f4f4f4', '#b82c2c', '#22222a'].forEach((col, i) => {
          const x = 97 + i * 9;
          const y = 74 + i * 3;
          b.rect(x, y, 6, 30, INK);
          b.rect(x + 1, y + 1, 4, 28, col);
          for (let j = y + 3; j < y + 20; j += 5) b.rect(x + 2, j, 2, 2, i === 0 ? '#b8b8c0' : '#e8c860');
          b.rect(x - 2, y + 20, 10, 4, INK);
          b.rect(x - 1, y + 21, 8, 2, '#e8c860');
        });
      },
      face(c) {
        const { b } = c;
        brows(c, { y: 35, th: 3, tilt: 2, color: '#2e6a2e' });
        eye(c, CX - 14, 44, { iris: '#3a3a3a', w: 11, h: 8 });
        // œil fermé, balafre
        b.rect(Math.round(CX) + 8, 45, 12, 2, INK);
        b.line(CX + 14, 33, CX + 13, 55, '#a85a4a', 2);
        for (const y of [37, 42, 49, 53]) b.rect(Math.round(CX) + 12, y, 5, 1, '#a85a4a');
        nose(c, 54);
        mouth(c, 'flat', 62, 14);
        b.px(CX + 8, 63, '#4a2420');
        // trois boucles d'oreille
        for (let i = 0; i < 3; i++) {
          b.rect(Math.round(CX) + 26 + i * 3, 54, 2, 7, '#e8c860');
          b.px(CX + 26 + i * 3, 61, INK);
          b.px(CX + 27 + i * 3, 61, INK);
        }
      },
      hair(c) {
        shortHair(c, '#4f9a4a', { line: 24, side: 10, spikes: 5 });
      },
    }),

  // Mélenchon : sourcils en colère, bouche grande ouverte, doigt levé, triangle rouge.
  melenchon: () =>
    human({
      skin: '#e8b898',
      shape: { jw: 17 },
      body(c) {
        torso(c, '#3a3a44');
        armLines(c, '#3a3a44');
      },
      collar(c) {
        const shirt = mask(P([CX - 18, 74], [CX + 18, 74], [CX + 4, H], [CX - 4, H]));
        c.b.fill(shirt, '#f0f0f4', { s: 2, l: 0 });
        const tie = mask(P([CX - 5, 78], [CX + 5, 78], [CX + 3, 86], [CX + 6, H], [CX - 6, H], [CX - 3, 86]));
        c.b.fill(tie, '#c8202c', { s: 2, l: 1 });
        const lapels = mask(Both(P([CX - 28, 76], [CX - 18, 74], [CX - 3, 102], [CX - 8, H], [CX - 26, 94])));
        c.b.fill(lapels, '#4a4a56', { s: 2, l: 1 });
        const tri = mask(P([20, 89], [34, 89], [27, 101]));
        c.b.fill(tri, ['#ff6a6a', '#e83a40', '#d8202c', '#b01420', '#b01420'], { s: 0, l: 1 });
      },
      face(c) {
        const { b, S } = c;
        brows(c, { y: 33, w: 16, th: 4, tilt: 3, color: '#8a8a8a' });
        eyes(c, { iris: '#5a4a3a', y: 44, w: 11, h: 8 });
        nose(c, 54, 5);
        b.lines(CX - 22, 52, CX - 17, 64, S[3]);
        b.lines(CX - 10, 25, CX - 2, 26, S[3]);
        // la bouche qui harangue
        const m = mask(E(CX, 63, 10, 5));
        b.fill(m, ['#5a1e20', '#5a1e20', '#5a1e20', '#3a1014', '#3a1014'], { s: 2, l: 0 });
        b.rect(Math.round(CX) - 6, 59, 13, 2, '#ffffff');
        b.rect(Math.round(CX) - 4, 65, 9, 2, '#c85a5a');
      },
      hair(c) {
        shortHair(c, '#b8b8b8', { line: 21, side: 14 });
        glasses(c, { color: '#2a2a30', y: 44, dx: 14, rw: 10, rh: 7 });
      },
      over(c) {
        const { b, S } = c;
        // l'index levé
        const finger = mask(R(104, 66, 8, 28), E(108, 66, 4, 4));
        b.fill(finger, S, { s: 2, l: 1 });
        b.rect(105, 64, 5, 3, S[0]);
        const fist = mask(E(108, 99, 14, 10));
        b.fill(fist, S, { s: 3, l: 2 });
        b.line(100, 94, 100, 102, S[4]);
        b.line(112, 93, 113, 101, S[4]);
        b.line(118, 95, 119, 102, S[4]);
      },
    }),

  // Bruno : une barbe jusqu'au nombril, un monosourcil, de la toison qui dépasse du marcel.
  poilu: () =>
    human({
      skin: '#c89870',
      shape: { top: 14, bot: 76, hw: 33, jw: 26, neck: 20, ears: false },
      back(c) {
        const m = mask(E(CX, 44, 42, 40));
        c.b.fill(m, '#3a2618', { s: 3, l: 2 });
      },
      body(c) {
        torso(c, '#3a6a8a', { sh: 62 });
        armLines(c, '#3a6a8a', 62);
        const tank = mask(P([CX - 28, 76], [CX + 28, 76], [CX + 32, H], [CX - 32, H]));
        c.b.fill(tank, '#ece6d6', { s: 2, l: 0 });
      },
      collar(c) {
        const chest = mask(P([CX - 20, 76], [CX + 20, 76], [CX + 14, 100], [CX, 104], [CX - 14, 100]));
        c.b.flat(chest, c.S[2]);
        c.b.over(chest, (x, y) => ((x * 7 + y * 13) % 5 < 2 ? '#2a1c14' : null));
        // la toison déborde du col
        c.b.over(mask(Both(R(CX - 27, 78, 6, 24))), (x, y) => ((x * 5 + y * 3) % 7 < 2 ? '#2a1c14' : null));
      },
      face(c) {
        const { b } = c;
        const brow = mask(P([CX - 28, 32], [CX, 36], [CX + 28, 32], [CX + 28, 39], [CX, 42], [CX - 28, 39]));
        b.fill(brow, '#3a2618', { s: 1, l: 1 });
        eyes(c, { iris: '#3a2a1c', y: 47, dx: 13, w: 10, h: 7 });
        nose(c, 59, 7);
        const m = mask(P([CX - 32, 46], [CX - 27, 53], [CX - 15, 57], [CX - 8, 62], [CX + 8, 62], [CX + 15, 57], [CX + 27, 53], [CX + 32, 46], [CX + 35, 70], [CX + 22, 92], [CX + 6, 101], [CX - 6, 101], [CX - 22, 92], [CX - 35, 70]));
        Cut(E(CX, 69, 9, 4))(m);
        b.fill(m, '#3a2618', { s: 3, l: 2 });
        for (const [x, y] of [[-24, 58], [-18, 68], [-10, 80], [-2, 88], [8, 86], [16, 74], [24, 60], [-28, 50], [28, 52], [-14, 90], [2, 76], [20, 84], [-6, 96]]) b.line(CX + x, y, CX + x + 1, y + 6, '#1c120c');
        b.rect(Math.round(CX) - 7, 67, 15, 3, '#ffffff');
        b.rect(Math.round(CX) - 7, 70, 15, 2, '#6e2a24');
      },
      hair(c) {
        const { b } = c;
        const m = mask(E(CX, c.top + c.hw - 1, c.hw + 4, c.hw + 2), Cut(R(0, 28, W, H)), Both(R(CX - c.hw - 3, 27, 7, 24)));
        for (let i = 0; i < 6; i++) E(CX - 28 + i * 11, 13 + (i % 2) * 2, 8, 7)(m, 1);
        b.cast(m, c.head, c.S[3], 0, 2);
        b.fill(m, '#3a2618', { s: 3, l: 2 });
        for (let i = 0; i < 7; i++) b.line(CX - 30 + i * 10, 12, CX - 27 + i * 10, 22, '#1c120c');
      },
    }),

  // Shrek : oreilles en trompette, nez écrasé, sourire jusqu'aux oreilles.
  shrek: () =>
    human({
      skin: '#7fa04a',
      spread: 0.08,
      shape: { top: 16, bot: 80, hw: 34, jw: 30, neck: 22, ears: false },
      body(c) {
        torso(c, '#d8cdb0', { sh: 62, top: 76 });
        const vest = and(mask(Both(P([CX - 66, H], [CX - 62, 90], [CX - 54, 84], [CX - 26, 78], [CX - 18, H]))), c.body);
        c.b.fill(vest, '#6a4a2c', { s: 2, l: 1 });
      },
      collar(c) {
        const { b, S } = c;
        // lacet du col
        b.line(CX - 6, 87, CX + 6, 94, '#6a4a2c');
        b.line(CX + 6, 87, CX - 6, 94, '#6a4a2c');
        b.line(CX - 6, 95, CX + 6, 102, '#6a4a2c');
        b.line(CX + 6, 95, CX - 6, 102, '#6a4a2c');
        // oreilles en trompette
        const ear = mask(Both(P([CX - 30, 34], [CX - 44, 24], [CX - 46, 14], [CX - 58, 12], [CX - 60, 30], [CX - 48, 32], [CX - 32, 46])));
        b.fill(ear, S, { s: 2, l: 1 });
        b.flat(mask(Both(E(CX - 54, 20, 3, 6))), S[4]);
      },
      face(c) {
        const { b, S } = c;
        brows(c, { dx: 15, y: 36, w: 14, th: 3, tilt: -1, color: '#4a5a24' });
        eyes(c, { dx: 15, y: 45, iris: '#6a4a20', w: 11, h: 8 });
        const nz = mask(P([CX - 6, 49], [CX + 6, 49], [CX + 11, 58], [CX - 11, 58]));
        b.fill(nz, S, { s: 2, l: 1, line: S[4] });
        b.rect(Math.round(CX) - 7, 56, 4, 2, S[4]);
        b.rect(Math.round(CX) + 4, 56, 4, 2, S[4]);
        mouth(c, 'grin', 68, 28);
        for (const [x, y] of [[-22, 26], [-14, 22], [18, 24], [24, 30], [-26, 60], [27, 58]]) b.rect(Math.round(CX) + x, y, 2, 2, S[3]);
      },
    }),

  // Hoggy Rider : supporter torse nu, crête et barbe noires, bracelet doré, pouce levé. Il valide tout.
  hoggy: () =>
    human({
      skin: '#6e4228',
      shape: { jw: 18 },
      body(c) {
        const { b, S } = c;
        torso(c, S, { sh: 58 });
        armLines(c, S, 58);
        b.lines(CX - 36, 99, CX - 8, 104, S[4]);
        b.lines(CX - 8, 104, CX - 3, 98, S[4]);
        b.lines(CX - 30, 85, CX - 12, 83, S[3]);
        b.rect(Math.round(CX), 90, 1, 16, S[3]);
      },
      face(c) {
        const { b } = c;
        brows(c, { y: 34, w: 15, th: 3, tilt: -1, color: '#141014' });
        eyes(c, { iris: '#2a1c14', y: 43 });
        nose(c, 54, 6);
        b.fill(BEARD(), '#16110f', { s: 2, l: 1 });
        mouth(c, 'grin', 64, 18);
      },
      hair(c) {
        const { b, S } = c;
        b.over(and(c.head, mask(R(0, 0, W, 29))), (x, y) => ((x + y) % 2 === 0 ? S[3] : null));
        const crest = mask(P([CX - 9, 27], [CX - 11, 8], [CX - 5, 1], [CX + 5, 1], [CX + 11, 8], [CX + 9, 27]));
        b.cast(crest, c.head, S[3], 0, 2);
        b.fill(crest, '#141014', { s: 2, l: 1 });
      },
      over(c) {
        const { b, S } = c;
        const X = CX + 4;
        b.fill(mask(P([X + 38, 88], [X + 56, 86], [X + 60, H], [X + 36, H])), S, { s: 3, l: 1 });
        b.fill(mask(P([X + 36, 86], [X + 58, 84], [X + 59, 91], [X + 36, 93])), ['#fff0a8', '#f2d060', '#e8c040', '#c09428', '#8a6a1c'], { s: 2, l: 1 });
        b.fill(mask(P([X + 37, 72], [X + 37, 52], [X + 40, 49], [X + 44, 50], [X + 45, 54], [X + 45, 72])), S, { s: 2, l: 1 });
        b.fill(mask(P([X + 35, 68], [X + 57, 66], [X + 60, 72], [X + 59, 86], [X + 37, 88], [X + 34, 80])), S, { s: 3, l: 1 });
        for (const y of [72, 77, 82]) b.rect(Math.round(X) + 45, y, 13, 1, S[4]);
        b.rect(Math.round(X) + 39, 52, 4, 3, S[1]);
      },
    }),

  controleur: () =>
    human({
      skin: '#eac6ae',
      shape: { jw: 16 },
      body(c) {
        torso(c, '#3a3e4a');
        armLines(c, '#3a3e4a');
      },
      collar(c) {
        const shirt = mask(P([CX - 18, 74], [CX + 18, 74], [CX + 4, H], [CX - 4, H]));
        c.b.fill(shirt, '#f0f0f4', { s: 2, l: 0 });
        const tie = mask(P([CX - 5, 78], [CX + 5, 78], [CX + 3, 86], [CX + 6, H], [CX - 6, H], [CX - 3, 86]));
        c.b.fill(tie, '#8e1c2c', { s: 2, l: 1 });
        const lapels = mask(Both(P([CX - 28, 76], [CX - 18, 74], [CX - 3, 102], [CX - 8, H], [CX - 26, 94])));
        c.b.fill(lapels, '#4a4f5c', { s: 2, l: 1 });
        c.b.rect(Math.round(CX) + 24, 90, 12, 3, '#e8c860');
        c.b.rect(Math.round(CX) + 24, 95, 12, 3, '#e8c860');
      },
      face(c) {
        const { b } = c;
        brows(c, { y: 35, th: 3, tilt: 2, color: '#444452', w: 15 });
        eyes(c, { iris: '#4a5a6a', y: 43, w: 11, h: 8 });
        nose(c, 54);
        // moustache en brosse
        const m = mask(P([CX - 15, 56], [CX + 15, 56], [CX + 18, 62], [CX + 8, 61], [CX, 59], [CX - 8, 61], [CX - 18, 62]));
        b.fill(m, '#555566', { s: 1, l: 1 });
        mouth(c, 'flat', 65, 12);
        b.lines(CX - 21, 54, CX - 18, 64, c.S[3]);
      },
      hair(c) {
        shortHair(c, '#555566', { line: 30, side: 18 });
        cap(c, '#262a33', { badge: '#c8c8d4' });
        glasses(c, { y: 43, dx: 14, rw: 10, rh: 7 });
      },
    }),

  // Zemmour : petit, crâne dégarni, grandes oreilles, sourcils froncés, costume sombre. Jamais d'accord.
  zemmour: () =>
    human({
      skin: '#e8c2a4',
      shape: { hw: 27, jw: 14, bot: 71, ears: false },
      body(c) {
        torso(c, '#23252e', { sh: 52 });
        armLines(c, '#23252e', 52);
      },
      collar(c) {
        const { b, S } = c;
        b.fill(mask(P([CX - 18, 74], [CX + 18, 74], [CX + 4, H], [CX - 4, H])), '#f0f0f4', { s: 2, l: 0 });
        b.fill(mask(P([CX - 5, 78], [CX + 5, 78], [CX + 3, 86], [CX + 6, H], [CX - 6, H], [CX - 3, 86])), '#6a3a9a', { s: 2, l: 1 });
        b.fill(mask(Both(P([CX - 28, 76], [CX - 18, 74], [CX - 3, 102], [CX - 8, H], [CX - 26, 94]))), '#2e313c', { s: 2, l: 1 });
        b.fill(mask(Both(E(CX - 30, 44, 7, 12))), S, { s: 2, l: 1 });
        b.lines(CX - 33, 39, CX - 31, 49, S[4]);
      },
      face(c) {
        const { b, S } = c;
        b.rect(Math.round(CX) - 12, 22, 24, 1, S[3]);
        b.rect(Math.round(CX) - 9, 26, 18, 1, S[3]);
        brows(c, { dx: 13, y: 35, w: 14, th: 3, tilt: 2, color: '#2a2422' });
        eyes(c, { iris: '#3a2a1c', y: 43, dx: 13, w: 11, h: 7 });
        b.flat(mask(Both(E(CX - 13, 50, 6, 2))), S[3]);
        nose(c, 56, 5);
        b.lines(CX - 12, 56, CX - 15, 64, S[4]);
        mouth(c, 'flat', 64, 16);
      },
      hair(c) {
        const { b } = c;
        b.fill(mask(Both(E(CX - 26, 30, 5, 12))), '#8a8a90', { s: 2, l: 1 });
        b.over(and(c.head, mask(R(0, 0, W, 20))), (x, y) => ((x * 3 + y * 5) % 7 === 0 ? '#8a8a90' : null));
      },
    }),

  // Jacky : capuche, cernes violets, une dent en or et une dent en moins.
  toxico: () =>
    human({
      skin: '#d8c4b0',
      shape: { hw: 26, jw: 13, bot: 73 },
      back(c) {
        const m = mask(E(CX, 40, 37, 38), P([CX - 37, 40], [CX + 37, 40], [CX + 30, 92], [CX - 30, 92]));
        c.b.fill(m, '#565664', { s: 3, l: 2 });
        c.b.flat(mask(E(CX, 42, 31, 32)), '#2e2e38');
      },
      body(c) {
        torso(c, '#6a6a7a');
        armLines(c, '#6a6a7a');
        c.b.rect(Math.round(CX) - 12, 84, 2, 18, '#d8d8e0');
        c.b.rect(Math.round(CX) + 10, 84, 2, 13, '#d8d8e0');
        c.b.rect(Math.round(CX) - 13, 102, 4, 3, '#d8d8e0');
        c.b.rect(Math.round(CX) + 9, 97, 4, 3, '#d8d8e0');
      },
      face(c) {
        const { b, S } = c;
        b.flat(mask(Both(E(CX - 13, 51, 8, 4))), mix(S[2], '#7a5a9a', 0.5));
        brows(c, { dx: 13, y: 35, th: 2, tilt: -2, color: '#5a4a3a' });
        eyes(c, { iris: '#6a7a5a', kind: 'tired', y: 44, dx: 13, white: '#f8dcd6' });
        nose(c, 55);
        b.over(and(c.head, mask(R(0, 57, W, 20))), (x, y) => ((x * 3 + y * 5) % 7 === 0 ? S[4] : null));
        mouth(c, 'grin', 63, 18);
        const x0 = Math.round(CX - 9);
        b.rect(x0 + 3, 60, 4, 6, '#e8c040');
        b.rect(x0 + 3, 60, 2, 2, '#fff0a0');
        b.rect(x0 + 13, 60, 4, 6, '#3a1014');
      },
      hair(c) {
        shortHair(c, '#5a4a3a', { line: 25, side: 9, spikes: 4 });
      },
    }),

  // Kimberley : crinière blonde, lèvres énormes, lunettes de soleil sur la tête, créoles.
  blonde: () =>
    human({
      skin: '#e2a67c',
      back(c) {
        const m = mask(E(CX, 40, 41, 37), Both(P([CX - 41, 40], [CX - 14, 40], [CX - 12, H], [CX - 48, H])));
        c.b.fill(m, '#f2df8a', { s: 3, l: 2 });
      },
      body(c) {
        torso(c, '#e04890', { sh: 48 });
      },
      collar(c) {
        const { b, S } = c;
        const v = mask(P([CX - 20, 76], [CX + 20, 76], [CX + 5, 100], [CX - 5, 100]));
        b.flat(v, S[2]);
        b.lines(CX - 21, 76, CX - 5, 101, tones('#e04890')[4], 2);
        b.rect(Math.round(CX), 93, 1, 7, S[4]);
        for (let i = -12; i <= 12; i += 2) b.px(CX + i, 90 - Math.abs(i), '#e8c040');
        b.rect(Math.round(CX) - 1, 91, 3, 3, '#e8c040');
      },
      face(c) {
        const { b, S } = c;
        brows(c, { y: 35, w: 13, th: 1, tilt: -1, color: '#8a6a3a' });
        b.flat(mask(Both(E(CX - 14, 40, 8, 4))), mix(S[2], '#d04890', 0.45));
        eyes(c, { iris: '#4a90c0', kind: 'calm', y: 44 });
        nose(c, 54, 3);
        blush(c, 55, 21);
        const lips = mask(E(CX - 5, 61, 8, 4), E(CX + 5, 61, 8, 4), E(CX, 64, 11, 5));
        b.fill(lips, ['#ff9ab8', '#f0508a', '#d83070', '#a81c50', '#801040'], { s: 2, l: 1 });
        b.rect(Math.round(CX) - 9, 63, 19, 1, '#801040');
        b.rect(Math.round(CX) - 7, 59, 3, 1, '#ffd0e0');
        b.rect(Math.round(CX) - 4, 66, 5, 1, '#ffd0e0');
      },
      hair(c) {
        const { b } = c;
        const m = mask(
          E(CX, c.top + c.hw - 1, c.hw + 4, c.hw + 2),
          Cut(P([CX - 24, 100], [CX - 25, 36], [CX - 6, 22], [CX + 8, 28], [CX + 25, 36], [CX + 24, 100])),
          Both(P([CX - 33, 40], [CX - 25, 40], [CX - 23, 98], [CX - 42, 102], [CX - 45, 70])),
        );
        b.cast(m, c.head, c.S[3], 0, 2);
        b.fill(m, '#f2df8a', { s: 3, l: 2 });
        b.lines(CX - 12, 16, CX - 24, 34, '#c8a850');
        b.lines(CX - 30, 44, CX - 34, 90, '#c8a850');
        b.lines(CX - 36, 50, CX - 39, 94, '#c8a850');
      },
      over(c) {
        const { b } = c;
        // lunettes de soleil relevées
        const sun = mask(Both(P([CX - 27, 6], [CX - 3, 6], [CX - 5, 17], [CX - 24, 17])));
        b.fill(sun, '#2a2a34', { s: 2, l: 1 });
        b.rect(Math.round(CX) - 3, 9, 7, 2, INK);
        b.lines(CX - 22, 14, CX - 16, 8, '#8a8aa0');
        // créoles
        const ring = mask(Both(E(CX - 33, 62, 6, 7)));
        Cut(Both(E(CX - 33, 62, 4, 5)))(ring);
        b.flat(ring, '#e8c040');
      },
    }),

  // Le sergent : béret rouge, moustache en guidon, médailles, regard d'acier.
  veteran: () =>
    human({
      skin: '#e0b090',
      shape: { jw: 18 },
      body(c) {
        const { b } = c;
        torso(c, '#5a6a3a');
        armLines(c, '#5a6a3a');
        const ep = and(mask(Both(R(CX - 58, 85, 22, 7))), c.body);
        b.fill(ep, '#8a7a3a', { s: 1, l: 1, clip: c.body });
        // les médailles
        ['#c8202c', '#2a5ab0', '#e8e8e8'].forEach((col, i) => {
          const x = 82 + i * 10;
          b.rect(x - 1, 89, 8, 15, INK);
          b.rect(x, 90, 6, 6, col);
          b.rect(x + 2, 90, 2, 6, '#f4f0e0');
          b.rect(x, 96, 6, 7, '#e8c860');
          b.rect(x + 1, 97, 2, 2, '#fff4c0');
        });
      },
      collar(c) {
        const { b } = c;
        const col = mask(P([CX - 19, 72], [CX + 19, 72], [CX + 21, 86], [CX - 21, 86]));
        b.fill(col, '#6a7a48', { s: 2, l: 1 });
        b.rect(Math.round(CX), 74, 1, 32, tones('#5a6a3a')[4]);
        for (const y of [89, 98]) {
          b.rect(Math.round(CX) - 2, y, 5, 5, INK);
          b.rect(Math.round(CX) - 1, y + 1, 3, 3, '#e8c860');
        }
      },
      face(c) {
        const { b, S } = c;
        brows(c, { y: 35, w: 15, th: 3, tilt: 2, color: '#f0f0f0' });
        eyes(c, { iris: '#4a6a88', y: 44, w: 11, h: 8 });
        nose(c, 56, 6);
        b.lines(CX - 23, 48, CX - 20, 54, S[3]);
        b.line(CX + 20, 26, CX + 26, 40, '#b87a6a');
        const m = mask(P([CX - 30, 54], [CX - 14, 58], [CX, 57], [CX + 14, 58], [CX + 30, 54], [CX + 31, 61], [CX + 20, 68], [CX + 6, 65], [CX, 67], [CX - 6, 65], [CX - 20, 68], [CX - 31, 61]));
        b.fill(m, ['#ffffff', '#ffffff', '#f0f0f0', '#c8c8d0', '#a0a0b0'], { s: 2, l: 1 });
        b.rect(Math.round(CX), 58, 1, 8, '#a0a0b0');
      },
      hair(c) {
        const { b } = c;
        const temples = mask(Both(E(CX - 28, 36, 6, 12)));
        b.fill(temples, ['#ffffff', '#ffffff', '#f0f0f0', '#c8c8d0', '#a0a0b0'], { s: 2, l: 1 });
        const beret = mask(P([CX - 31, 24], [CX - 36, 12], [CX - 22, 2], [CX + 22, -2], [CX + 46, 6], [CX + 48, 18], [CX + 31, 24]));
        b.cast(beret, c.head, c.S[3], 0, 3);
        b.fill(beret, '#9a2a2a', { s: 4, l: 2 });
        const band = mask(R(CX - 31, 21, 62, 5));
        b.fill(band, '#3a1c1c', { s: 1, l: 0 });
        b.rect(Math.round(CX) - 22, 9, 9, 9, INK);
        b.rect(Math.round(CX) - 21, 10, 7, 7, '#e8c860');
        b.rect(Math.round(CX) - 21, 10, 7, 2, '#fff4c0');
      },
    }),

  pigeon: () => {
    const c = { b: new Bust() };
    const { b } = c;
    const F = tones('#6e7f9e');
    c.S = F;
    // cape rouge et hermine
    torso(c, '#a8242c', { sh: 60, top: 78 });
    const erm = mask(P([CX - 44, 80], [CX + 44, 80], [CX + 34, 100], [CX - 34, 100]));
    b.fill(erm, ['#ffffff', '#ffffff', '#f6f4ec', '#d8d4cc', '#b8b4ac'], { s: 2, l: 0 });
    for (const [x, y] of [[-34, 84], [-20, 90], [-6, 85], [8, 92], [22, 85], [34, 86], [-12, 95], [16, 96]]) {
      b.rect(CX + x, y, 2, 4, INK);
    }
    // cou irisé
    const nk = mask(P([CX - 24, 56], [CX + 24, 56], [CX + 30, 84], [CX - 30, 84]));
    b.fill(nk, F, { s: 3, l: 1 });
    b.over(nk, (x, y) => {
      const k = (x + y * 2) % 22;
      if (y < 62) return null;
      return k < 7 ? '#6a4a9a' : k < 14 ? '#3a8a7a' : null;
    });
    // tête
    const hd = mask(E(CX, 38, 29, 28));
    b.fill(hd, F, { s: 4, l: 2 });
    c.head = hd;
    // yeux orange de côté
    for (const ex of [CX - 19, CX + 19]) {
      const y = mask(E(ex, 34, 8));
      b.fill(y, ['#ffb060', '#f08a2c', '#d86a18', '#a84a10', '#803408'], { s: 2, l: 1 });
      b.flat(mask(E(ex, 34, 4)), INK);
      b.rect(ex - 3, 31, 2, 2, '#ffffff');
      b.line(ex - 8, ex < CX ? 24 : 28, ex + 8, ex < CX ? 28 : 24, F[4], 2);
    }
    // cire et bec
    const cere = mask(Both(E(CX - 5, 38, 6, 4)));
    b.fill(cere, ['#ffffff', '#f4f0e8', '#e8e0d4', '#c8c0b8', '#a8a098'], { s: 1, l: 1 });
    const beak = mask(P([CX - 10, 42], [CX + 10, 42], [CX + 5, 54], [CX, 60], [CX - 5, 54]));
    b.fill(beak, ['#6a6470', '#544e5a', '#3e3a46', '#2c2832', '#1e1a24'], { s: 2, l: 1 });
    b.line(CX - 8, 48, CX + 8, 48, INK);
    // couronne
    const crown = mask(P([CX - 22, 18], [CX - 26, 2], [CX - 13, 10], [CX - 7, 0], [CX, 9], [CX + 7, 0], [CX + 13, 10], [CX + 26, 2], [CX + 22, 18]));
    b.fill(crown, ['#fff0a0', '#f0c040', '#d8a428', '#a87a18', '#805a10'], { s: 2, l: 1 });
    b.rect(Math.round(CX) - 2, 11, 5, 5, '#c8304a');
    b.rect(Math.round(CX) - 14, 12, 4, 4, '#3a74d0');
    b.rect(Math.round(CX) + 11, 12, 4, 4, '#3a9a5a');
    return b.p;
  },

  // Maître Biquette : robe noire, rabat blanc, lunettes, et le regard de qui facture à l'heure.
  chevre: () => {
    const c = { b: new Bust() };
    const { b } = c;
    c.S = tones('#d8d0b8');
    // cornes
    const horn = tones('#a89a80');
    const horns = mask(Both(P([CX - 14, 22], [CX - 20, 8], [CX - 36, 0], [CX - 26, 8], [CX - 24, 24])));
    b.fill(horns, horn, { s: 2, l: 1 });
    for (let i = 0; i < 3; i++) b.lines(CX - 22 - i * 3, 18 - i * 5, CX - 15 - i * 3, 16 - i * 5, horn[4]);
    // la robe
    torso(c, '#2a2834', { sh: 46, top: 84 });
    const T = tones('#2a2834');
    armLines(c, T, 46);
    b.lines(CX - 30, 92, CX - 34, H, T[1]);
    // cou long
    const nk = mask(R(CX - 11, 60, 22, 30));
    b.fill(nk, c.S, { s: 2, l: 0 });
    // le rabat
    const rabat = mask(Both(P([CX - 11, 87], [CX - 1, 87], [CX - 1, H], [CX - 13, H])));
    b.fill(rabat, ['#ffffff', '#fbf8f0', '#f0ece2', '#d0ccc4', '#b0aca8'], { s: 2, l: 1 });
    b.rect(Math.round(CX) - 12, 85, 25, 3, INK);
    b.rect(Math.round(CX) - 11, 86, 23, 1, '#f0ece2');
    // oreilles à l'horizontale
    const ear = mask(Both(P([CX - 24, 30], [CX - 54, 26], [CX - 57, 33], [CX - 48, 39], [CX - 24, 42])));
    b.fill(ear, c.S, { s: 2, l: 1 });
    b.flat(mask(Both(P([CX - 28, 33], [CX - 50, 31], [CX - 46, 36], [CX - 28, 39]))), '#c8a8a0');
    // barbichette
    const beard = mask(P([CX - 10, 74], [CX + 10, 74], [CX + 4, 92], [CX, 96], [CX - 4, 92]));
    // long visage
    const hd = mask(E(CX, 34, 25, 22), P([CX - 24, 34], [CX + 24, 34], [CX + 17, 62], [CX + 14, 76], [CX - 14, 76], [CX - 17, 62]));
    b.fill(hd, c.S, { s: 4, l: 2 });
    c.head = hd;
    b.fill(beard, ['#ffffff', '#f4f0e4', '#e4dcc8', '#c8c0a8', '#a8a088'], { s: 2, l: 1 });
    b.line(CX - 2, 78, CX - 2, 90, '#a8a088');
    // chanfrein
    b.rect(Math.round(CX) - 5, 24, 11, 36, c.S[1]);
    b.rect(Math.round(CX) + 5, 26, 2, 34, c.S[3]);
    // touffe
    const tuft = mask(P([CX - 14, 20], [CX - 6, 10], [CX - 2, 16], [CX + 4, 9], [CX + 8, 16], [CX + 14, 20], [CX, 28]));
    b.fill(tuft, ['#ffffff', '#f4f0e4', '#e4dcc8', '#c8c0a8', '#a8a088'], { s: 2, l: 1 });
    // yeux jaunes à pupille horizontale, paupière blasée
    for (const ex of [CX - 19, CX + 19]) {
      const yeM = mask(E(ex, 38, 8, 8));
      b.fill(yeM, ['#fff0a0', '#f6d84a', '#e8c030', '#c89a20', '#a07a18'], { s: 2, l: 1 });
      b.rect(ex - 4, 38, 8, 4, INK);
      b.rect(ex - 3, 38, 2, 1, '#ffffff');
      b.flat(and(mask(R(ex - 9, 29, 19, 6)), yeM), c.S[3]);
      b.rect(ex - 7, 35, 15, 1, INK);
      b.line(ex - 8, 27, ex + 8, 27 + (ex < CX ? 1 : -1), c.S[4]);
    }
    glasses(c, { color: '#4a3a30', y: 38, dx: 19, rw: 10, rh: 9, tint: 0.12 });
    // nez et bouche
    const nz = mask(P([CX - 12, 62], [CX + 12, 62], [CX + 14, 74], [CX + 8, 76], [CX - 8, 76], [CX - 14, 74]));
    b.fill(nz, tones('#d8a8a0'), { s: 2, l: 1, line: null });
    b.rect(Math.round(CX) - 8, 66, 4, 2, '#4a2830');
    b.rect(Math.round(CX) + 5, 66, 4, 2, '#4a2830');
    b.rect(Math.round(CX), 68, 1, 5, '#4a2830');
    b.rect(Math.round(CX) - 9, 73, 19, 1, '#4a2830');
    return b.p;
  },

  // Clara : poule rousse assise sur une paire de baskets noir et blanc, un billet sous l'aile.
  ronde: () => {
    const c = { b: new Bust() };
    const { b } = c;
    const F = tones('#c8642a');
    const D = tones('#a84e1e');
    const RED = tones('#d8302c');
    c.S = F;
    for (const s of [-1, 1]) {
      const cx = CX + s * 22;
      const shoe = mask(P([cx - 18, 84], [cx + 18, 84], [cx + 21, 98], [cx + 20, H], [cx - 20, H], [cx - 21, 98]));
      b.fill(shoe, '#f0f0f0', { s: 2, l: 1 });
      b.over(and(shoe, mask(R(0, 84, W, 11))), () => '#1c1c22');
      b.rect(Math.round(cx) - 19, 102, 39, 1, INK);
      for (const y of [88, 91]) b.rect(Math.round(cx) - 6, y, 13, 1, '#f0f0f0');
    }
    b.fill(mask(P([CX + 28, 52], [CX + 50, 24], [CX + 58, 36], [CX + 52, 62])), D, { s: 3, l: 2 });
    b.lines(CX - 50, 32, CX - 40, 48, D[4]);
    const body = mask(E(CX, 62, 40, 29));
    b.fill(body, F, { s: 4, l: 2 });
    b.over(body, (x, y) => (y > 46 && y % 6 === 0 && (x + (y / 6) * 4) % 8 < 3 ? F[3] : null));
    // le billet dépasse de l'aile gauche
    b.fill(mask(P([CX - 60, 62], [CX - 32, 56], [CX - 30, 68], [CX - 58, 74])), '#7ab87a', { s: 0, l: 0 });
    b.fill(mask(E(CX - 49, 66, 3, 3)), '#3e7a48', { s: 0, l: 0, line: null });
    for (const s of [-1, 1]) b.fill(mask(E(CX + s * 26, 64, 15, 13)), D, { s: 3, l: 2 });
    // crête, tête, barbillons, bec, yeux
    b.fill(mask(E(CX - 8, 10, 5, 6), E(CX, 7, 5, 7), E(CX + 8, 10, 5, 6)), RED, { s: 2, l: 1 });
    b.fill(mask(E(CX, 26, 17, 16)), F, { s: 3, l: 2 });
    b.fill(mask(E(CX - 4, 43, 3, 5), E(CX + 4, 43, 3, 5)), RED, { s: 1, l: 1 });
    b.fill(mask(P([CX - 6, 29], [CX + 6, 29], [CX, 40])), '#f0b030', { s: 2, l: 1 });
    for (const ex of [CX - 9, CX + 9]) {
      b.fill(mask(E(ex, 23, 5, 5)), ['#ffffff', '#ffffff', '#ffffff', '#d8d8e0', '#d8d8e0'], { s: 1, l: 0 });
      b.flat(mask(E(ex - 1, 23, 2, 2)), INK);
      b.px(ex - 2, 22, '#ffffff');
    }
    return b.p;
  },

  // Jacky, des années plus tard : costume noir, cravate dorée, cheveux plaqués, toujours sa dent en or.
  riche: () =>
    human({
      skin: '#e4c8b0',
      shape: { hw: 26, jw: 13, bot: 73 },
      body(c) {
        torso(c, '#1c1c22');
        armLines(c, '#1c1c22');
      },
      collar(c) {
        const { b } = c;
        b.fill(mask(P([CX - 18, 74], [CX + 18, 74], [CX + 4, H], [CX - 4, H])), '#f0f0f4', { s: 2, l: 0 });
        b.fill(mask(P([CX - 5, 78], [CX + 5, 78], [CX + 3, 86], [CX + 6, H], [CX - 6, H], [CX - 3, 86])), '#d8a830', { s: 2, l: 1 });
        b.fill(mask(Both(P([CX - 28, 76], [CX - 18, 74], [CX - 3, 102], [CX - 8, H], [CX - 26, 94]))), '#2a2a34', { s: 2, l: 1 });
        b.rect(Math.round(CX) + 26, 92, 10, 4, '#d8a830');
        b.rect(Math.round(CX) + 26, 92, 10, 1, '#fff0a8');
      },
      face(c) {
        const { b } = c;
        brows(c, { dx: 13, y: 35, th: 2, tilt: -1, color: '#4a3a2c' });
        eyes(c, { iris: '#6a7a5a', y: 44, dx: 13 });
        nose(c, 55);
        mouth(c, 'grin', 63, 18);
        const x0 = Math.round(CX - 9);
        b.rect(x0 + 3, 60, 4, 6, '#e8c040');
        b.rect(x0 + 3, 60, 2, 2, '#fff0a0');
      },
      hair(c) {
        shortHair(c, '#4a3a2c', { line: 23, side: 10 });
        c.b.line(CX - 16, 16, CX + 4, 13, '#7a6a58');
        c.b.line(CX - 8, 20, CX + 14, 16, '#7a6a58');
      },
    }),

  // « Moi à 40 ans » et le conducteur lui-même (pour les images de fin).
  vieux: () => conductor(true),
  joueur: () => conductor(false),
};

// Un passager sans dessin particulier : on le compose d'après son `look`.
function fromLook(L = {}) {
  const hairColor = L.hairColor ?? '#3a2e26';
  return human({
    skin: L.skin ?? '#d9a982',
    body(c) {
      torso(c, L.outfit ?? '#5f6e82');
      armLines(c, L.outfit ?? '#5f6e82');
    },
    collar(c) {
      const T = tones(L.outfit ?? '#5f6e82');
      c.b.flat(mask(P([CX - 17, 76], [CX + 17, 76], [CX + 12, 88], [CX - 12, 88])), c.S[3]);
      c.b.lines(CX - 18, 76, CX - 12, 89, T[4], 2);
      c.b.rect(Math.round(CX) - 12, 89, 25, 2, T[4]);
    },
    face(c) {
      brows(c, { color: hairColor, th: 3 });
      eyes(c, { kind: L.eyes === 'tired' ? 'tired' : L.eyes === 'wide' ? 'wide' : 'normal' });
      nose(c);
      mouth(c, L.mouth === 'grin' ? 'grin' : L.mouth === 'flat' ? 'flat' : 'smile');
    },
    hair(c) {
      if (L.hair !== 'bald') shortHair(c, hairColor, { line: 26, side: L.hair === 'long' ? 40 : 14 });
      if (L.hat === 'conductor') cap(c, L.hatColor ?? '#2f5fb3');
    },
  });
}

export const BUST_IDS = Object.keys(BUSTS);

export function bustOf(id, look) {
  return BUSTS[id] ? BUSTS[id]() : fromLook(look);
}
