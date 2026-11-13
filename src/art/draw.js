// Outils de dessin du pixel art généré par code.
// Pix est une petite toile en mémoire (pixels RGBA) avec des primitives « pixel art » :
// volumes ombrés par une lumière venant d'en haut à gauche, tramage, contours colorés, motifs raccordables.

// ───────────────────────── Couleurs ─────────────────────────

export function hex(c) {
  return typeof c === 'number' ? c : parseInt(c.replace('#', ''), 16);
}

export function rgb(c) {
  if (Array.isArray(c)) return c;
  const n = hex(c);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex([r, g, b]) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0')}`;
}

// Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur '#rrggbb'.
export function shade(color, amt) {
  const [r, g, b] = rgb(color);
  return toHex([r + 255 * amt, g + 255 * amt, b + 255 * amt]);
}

export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function toHsl(c) {
  const [r, g, b] = rgb(c).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

export function towardHue(h, target, t) {
  let d = target - h;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return h + d * t;
}

// Désature légèrement une couleur trop « criarde » (les looks des personnages sont écrits en couleurs vives).
export function mute(c, amt = 0.25) {
  const [h, s, l] = toHsl(c);
  return fromHsl(h, s * (1 - amt), l * (1 - amt * 0.25) + 0.04 * amt);
}

// Rampe de n teintes, de la plus sombre à la plus claire. Les ombres tirent vers le bleu-violet,
// les lumières vers le jaune chaud : c'est ce qui donne un rendu « peint » plutôt que plat.
export function ramp(base, n = 5, spread = 0.11) {
  const [h, s, l] = toHsl(base);
  const mid = (n - 1) / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = i - mid;
    const hh = k < 0 ? towardHue(h, 250, Math.min(0.5, -k * 0.09)) : towardHue(h, 50, Math.min(0.5, k * 0.07));
    const ss = Math.max(0, Math.min(1, s + (k < 0 ? -k * 0.03 : -k * 0.05)));
    const ll = Math.max(0.02, Math.min(0.97, l + k * spread));
    out.push(fromHsl(hh, ss, ll));
  }
  return out;
}

// ───────────────────────── Hasard reproductible ─────────────────────────

// Générateur pseudo-aléatoire reproductible (les textures sont identiques à chaque partie).
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bruit de valeur lissé et périodique (période w×h) : sert aux sols qui doivent se raccorder.
export function periodicNoise(w, h, cell, seed) {
  const r = rng(seed);
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const grid = Array.from({ length: gw * gh }, r);
  const at = (i, j) => grid[(((j % gh) + gh) % gh) * gw + (((i % gw) + gw) % gw)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const tx = sm(fx - i);
    const ty = sm(fy - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * tx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
    return a + (b - a) * ty;
  };
}

// Plusieurs octaves de bruit périodique, résultat dans [0, 1].
export function fbm(w, h, seed, cells = [32, 16, 8]) {
  const layers = cells.map((c, i) => periodicNoise(w, h, c, seed + i * 101));
  let total = 0;
  const weights = cells.map((_, i) => 1 / (i + 1));
  for (const wt of weights) total += wt;
  return (x, y) => layers.reduce((acc, f, i) => acc + f(x, y) * weights[i], 0) / total;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export function bayer(x, y) {
  return BAYER[(y & 3) * 4 + (x & 3)];
}

// Lumière : vient d'en haut à gauche et de face.
const LIGHT = (() => {
  const v = [-0.5, -0.62, 0.6];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();

// ───────────────────────── Toile ─────────────────────────

export class Pix {
  constructor(w, h, { wrap = false } = {}) {
    this.w = w;
    this.h = h;
    this.wrap = wrap;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  idx(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (this.wrap) {
      x = ((x % this.w) + this.w) % this.w;
      y = ((y % this.h) + this.h) % this.h;
    } else if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return (y * this.w + x) * 4;
  }

  // Pose un pixel, avec mélange si a < 1.
  set(x, y, c, a = 1) {
    const i = this.idx(x, y);
    if (i < 0 || a <= 0) return;
    const [r, g, b] = rgb(c);
    const d = this.d;
    if (a >= 1) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
      return;
    }
    const da = d[i + 3] / 255;
    const oa = a + da * (1 - a);
    d[i] = (r * a + d[i] * da * (1 - a)) / oa;
    d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / oa;
    d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }

  alpha(x, y) {
    const i = this.idx(x, y);
    return i < 0 ? 0 : this.d[i + 3];
  }

  color(x, y) {
    const i = this.idx(x, y);
    return i < 0 ? null : [this.d[i], this.d[i + 1], this.d[i + 2]];
  }

  // Assombrit (amt < 0) ou éclaircit les pixels déjà posés, sans toucher à la transparence.
  tone(x, y, amt) {
    const i = this.idx(x, y);
    if (i < 0 || !this.d[i + 3]) return;
    for (let k = 0; k < 3; k++) this.d[i + k] = this.d[i + k] + 255 * amt;
  }

  rect(x, y, w, h, c, a = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }

  hline(x, y, w, c, a = 1) {
    this.rect(x, y, w, 1, c, a);
  }

  vline(x, y, h, c, a = 1) {
    this.rect(x, y, 1, h, c, a);
  }

  line(x0, y0, x1, y1, c, a = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // Ellipse pleine d'une couleur (centre et rayons en pixels, demi-pixels acceptés).
  ellipse(cx, cy, rx, ry, c, a = 1) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, c, a);
      }
    }
  }

  // Ombre portée douce (ellipse tramée sur les bords).
  shadow(cx, cy, rx, ry, a = 0.32, c = '#10121c') {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        if (r2 > 0.62 && bayer(x, y) < (r2 - 0.62) / 0.38) continue;
        this.set(x, y, c, a);
      }
    }
  }

  // Volume ellipsoïdal ombré avec une rampe de couleurs (feuillage, rochers, têtes, nuages…).
  // opts.flat écrase le relief (0 = sphère, 1 = disque), opts.grain ajoute du bruit de texture.
  blob(cx, cy, rx, ry, pal, { flat = 0, grain = 0, r = Math.random, bias = 0, dither = 0.9 } = {}) {
    const n = pal.length;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        let nz = Math.sqrt(1 - r2);
        nz = nz + (1 - nz) * flat;
        const len = Math.hypot(nx * (1 - flat), ny * (1 - flat), nz);
        const I = (nx * (1 - flat) * LIGHT[0] + ny * (1 - flat) * LIGHT[1] + nz * LIGHT[2]) / len;
        let t = (I + 0.15) / 1.15 + bias;
        if (grain) t += (r() - 0.5) * grain;
        let k = Math.floor(t * n + (bayer(x, y) - 0.5) * dither);
        k = Math.max(0, Math.min(n - 1, k));
        this.set(x, y, pal[k]);
      }
    }
  }

  // Cylindre vertical vu de dessus (chaudière, toit bombé) : éclairé à gauche, sombre à droite.
  cylinderV(x, y, w, h, pal, { dither = 0.8 } = {}) {
    const n = pal.length;
    for (let i = 0; i < w; i++) {
      const nx = ((i + 0.5) / w) * 2 - 1;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
      const I = nx * LIGHT[0] + nz * LIGHT[2] + 0.1;
      for (let j = 0; j < h; j++) {
        let k = Math.floor(((I + 0.2) / 1.2) * n + (bayer(x + i, y + j) - 0.5) * dither);
        k = Math.max(0, Math.min(n - 1, k));
        this.set(x + i, y + j, pal[k]);
      }
    }
  }

  // Contour coloré : chaque pixel vide qui touche la forme prend une version très sombre de son voisin.
  // Bien plus doux qu'un contour noir uniforme.
  outline(dark = 0.55, { ink = '#14121a', sides = 'all' } = {}) {
    const { w, h } = this;
    const src = new Uint8ClampedArray(this.d);
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 100;
    const dirs = sides === 'bottom' ? [[0, -1], [-1, 0], [1, 0]] : [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (op(x, y)) continue;
        for (const [dx, dy] of dirs) {
          if (!op(x + dx, y + dy)) continue;
          const i = ((y + dy) * w + x + dx) * 4;
          this.set(x, y, mix([src[i], src[i + 1], src[i + 2]], ink, dark));
          break;
        }
      }
    }
  }

  // Crée (ou remplace) la texture Phaser correspondante.
  toTexture(scene, key) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, this.w, this.h);
    const ctx = tex.getContext();
    ctx.putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    tex.refresh();
    return key;
  }
}

// Raccourci : dessine une texture w×h avec draw(px) et l'enregistre sous `key`.
export function paint(scene, key, w, h, draw, opts) {
  const px = new Pix(w, h, opts);
  draw(px);
  return px.toTexture(scene, key);
}
