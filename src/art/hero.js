// Personnages en pied, vus de face : silhouette trapue, grosse tête, larges épaules, gros poings
// et grosses chaussures. Aplats en peu de tons, lignes intérieures sombres, contour presque noir.
// Le même dessin sert aux dialogues (78 px de haut) et, réduit de moitié, aux voyageurs sur les quais.

import { Pix, rgb } from './draw.js';
import { paintRamp } from './paint.js';

const INK = '#14101a';
const W = 56;
const H = 78;
const CX = 28;

const tones = (base, spread = 0.085) => paintRamp(base, 5, { spread, shift: 0.7 });
const SKIN_RAMP = (base) => paintRamp(base, 5, { spread: 0.075, shift: 0.5 });

// ───────────────────────── Formes ─────────────────────────

// Lignes interpolées : [[y, x0, x1], …]
function col(ks) {
  const rows = new Map();
  for (let i = 0; i < ks.length - 1; i++) {
    const [y0, a0, b0] = ks[i];
    const [y1, a1, b1] = ks[i + 1];
    for (let y = y0; y <= y1; y++) {
      const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      rows.set(y, [Math.round(a0 + (a1 - a0) * t), Math.round(b0 + (b1 - b0) * t)]);
    }
  }
  return [...rows].map(([y, [a, b]]) => [y, a, b]);
}
// Symétrique autour de l'axe : [[y, demi-largeur], …]
const sym = (ks, cx = CX) => col(ks.map(([y, h]) => [y, cx - h, cx + h]));
// Miroir d'un membre gauche.
const mir = (rows) => rows.map(([y, a, b]) => [y, 2 * CX - b, 2 * CX - a]);

const box = (x, y, w, h) => col([[y, x, x + w - 1], [y + h - 1, x, x + w - 1]]);
const disc = (cx, cy, rx, ry = rx) => {
  const rows = [];
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const d = Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
    rows.push([y, Math.round(cx - rx * d), Math.round(cx + rx * d)]);
  }
  return rows;
};

// Ombre par défaut : flanc droit dans l'ombre, flanc gauche éclairé.
const sideShade = (u) => (u > 0.72 ? 1 : u < 0.2 ? 3 : 2);
const flatShade = () => 2;
const checks = (a, b, c) => (x, y) => {
  const on = (Math.floor((x + 1) / 3) + Math.floor(y / 3)) % 2 === 0;
  return Math.floor((x + 1) / 3) % 2 === 0 ? (on ? a : b) : on ? b : c;
};

// ───────────────────────── Le gabarit ─────────────────────────

class Fig {
  constructor(o = {}) {
    this.p = new Pix(W, H);
    this.headW = o.headW ?? 9;
    this.sw = o.sw ?? 20;
    this.tw = o.tw ?? 12;
    this.armW = o.armW ?? 8;
    this.foot = 76;
    this.bootH = o.bootH ?? 10;
    this.legH = o.legH ?? 18;
    this.torsoH = o.torsoH ?? 20;
    this.bootTop = this.foot - this.bootH + 1;
    this.legTop = this.bootTop - this.legH;
    this.beltY = this.legTop - 3;
    this.sY = this.beltY - this.torsoH;
    this.yH = this.sY - 24;
    this.ey = this.yH + 12;
    this.stamps = [];
    this.faceBox = null;
  }

  px(x, y, c) {
    if (x >= 0 && y >= 0 && x < W && y < H) this.p.set(x, y, c);
  }
  h(x, y, n, c) {
    for (let i = 0; i < n; i++) this.px(x + i, y, c);
  }
  v(x, y, n, c) {
    for (let i = 0; i < n; i++) this.px(x, y + i, c);
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) this.h(x, y + j, w, c);
  }
  // Dessine des deux côtés de l'axe.
  sh(dx, y, n, c) {
    this.h(CX + dx, y, n, c);
    this.h(CX - dx - n + 1, y, n, c);
  }
  sv(dx, y, n, c) {
    this.v(CX + dx, y, n, c);
    this.v(CX - dx, y, n, c);
  }
  spx(dx, y, c) {
    this.px(CX + dx, y, c);
    this.px(CX - dx, y, c);
  }

  // Une pièce : aplats, plus une ligne sombre sur son bord.
  part(rows, pal, { shade = sideShade, line = pal[0], keep, top = true } = {}) {
    const mask = new Uint8Array(W * H);
    const span = new Map();
    for (const [y, a, b] of rows) {
      if (y < 0 || y >= H) continue;
      span.set(y, [a, b]);
      for (let x = Math.max(0, a); x <= Math.min(W - 1, b); x++) if (!keep || keep(x, y)) mask[y * W + x] = 1;
    }
    const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!at(x, y)) continue;
        const edge = line && (!at(x - 1, y) || !at(x + 1, y) || !at(x, y + 1) || (top && !at(x, y - 1)));
        if (edge) {
          this.p.set(x, y, line);
          continue;
        }
        const [a, b] = span.get(y);
        const u = b > a ? (x - a) / (b - a) : 0.5;
        const t = shade(u, x, y);
        this.p.set(x, y, typeof t === 'string' ? t : pal[Math.max(0, Math.min(pal.length - 1, t))]);
      }
    return this;
  }

  // ── Jambes et pieds ──
  legs(c, { cuff = true, seam = true, shade } = {}) {
    const P = tones(c);
    const t = this.tw;
    const { legTop, bootTop, beltY } = this;
    this.part(sym([[beltY, t], [legTop + 6, t]]), P, { shade });
    const leg = col([[legTop + 5, CX - t, CX - 1], [legTop + 7, CX - t, CX - 2], [bootTop + 1, CX - t + 1, CX - 2]]);
    this.part(leg, P, { shade: shade ?? ((u) => (u > 0.74 ? 1 : u < 0.2 ? 3 : 2)), top: false });
    this.part(mir(leg), P, { shade: shade ?? ((u) => (u > 0.68 ? 1 : 2)), top: false });
    if (cuff) {
      this.part(box(CX - t, bootTop - 2, t - 1, 4), P, { shade: () => 3 });
      this.part(box(CX + 2, bootTop - 2, t - 1, 4), P, { shade: () => 2 });
    }
    if (seam) {
      this.v(CX, legTop, 5, P[0]);
      this.h(CX - t + 2, legTop + 2, 3, P[0]);
      this.h(CX + t - 4, legTop + 2, 3, P[0]);
      this.spx(t - 4, legTop + 3, P[0]);
    }
    return this;
  }

  // Jambes nues avec short ou slip, et chaussettes.
  bareLegs(S, { sock, sockBand, tw } = {}) {
    const t = tw ?? this.tw - 1;
    const { legTop, bootTop } = this;
    const leg = col([[legTop + 3, CX - t, CX - 2], [legTop + 10, CX - t, CX - 2], [bootTop + 1, CX - t + 2, CX - 3]]);
    this.part(leg, S, { shade: (u) => (u > 0.72 ? 1 : u < 0.22 ? 3 : 2) });
    this.part(mir(leg), S, { shade: (u) => (u > 0.68 ? 1 : 2) });
    this.sh(4, legTop + 12, 3, S[1]);
    if (sock) {
      const Q = tones(sock);
      const h = this.legH - 8;
      const sk = col([[bootTop - h + 2, CX - t + 1, CX - 3], [bootTop + 1, CX - t + 2, CX - 3]]);
      this.part(sk, Q, { top: false });
      this.part(mir(sk), Q, { top: false, shade: (u) => (u > 0.68 ? 1 : 2) });
      if (sockBand) this.sh(3, bootTop - h + 4, t - 4, sockBand);
    }
    return this;
  }

  // Chaussures : montantes par défaut, plus basses si `low`.
  boots(c, { low = false, sole, lace, toe } = {}) {
    const B = tones(c);
    const t = this.tw;
    const { bootTop, foot } = this;
    const out = CX - t - 2;
    const leftB = col([
      [low ? bootTop + 2 : bootTop, CX - t + 1, CX - 3],
      [foot - 5, CX - t, CX - 3],
      [foot - 3, out, CX - 2],
      [foot, out, CX - 2],
    ]);
    const right = mir(leftB);
    this.part(leftB, B, { shade: (u, x, y) => (y > foot - 5 && u < 0.5 ? 3 : u > 0.7 ? 1 : 2) });
    this.part(right, B, { shade: (u, x, y) => (y > foot - 5 && u > 0.45 && u < 0.85 ? 3 : u > 0.72 ? 1 : 2) });
    const So = sole ?? B[0];
    this.h(out, foot, CX - 2 - out + 1, So);
    this.h(CX + 2, foot, CX - 2 - out + 1, So);
    if (lace !== false) {
      for (let i = 0; i < 2; i++) {
        this.sh(5, foot - 7 + i * 2 + (low ? 1 : 0), 4, lace ?? B[0]);
      }
    }
    if (toe) {
      this.h(out + 1, foot - 2, 6, toe);
      this.h(2 * CX - out - 6, foot - 2, 6, toe);
    }
    return this;
  }

  // Pieds nus griffus ou sabots.
  hooves(c) {
    const B = tones(c);
    const { bootTop, foot } = this;
    const leg = col([[bootTop + 2, CX - 10, CX - 4], [foot, CX - 11, CX - 3]]);
    this.part(leg, B);
    this.part(mir(leg), B);
    this.v(CX - 7, foot - 3, 4, B[0]);
    this.v(CX + 7, foot - 3, 4, B[0]);
    return this;
  }

  // Robe ou manteau long qui descend sur les jambes.
  skirt(c, { to, flare = 3, shade, hem } = {}) {
    const P = tones(c);
    const end = to ?? this.bootTop - 3;
    this.part(sym([[this.beltY - 1, this.tw], [end, this.tw + flare]]), P, { shade });
    if (hem) this.h(CX - this.tw - flare + 1, end - 1, (this.tw + flare) * 2 - 1, hem);
    // plis
    for (const dx of [-5, 3]) this.v(CX + dx, this.beltY + 5, end - this.beltY - 7, P[1]);
    return this;
  }

  // ── Buste ──
  torso(c, { shade } = {}) {
    const P = typeof c === 'string' ? tones(c) : c;
    const t = this.tw;
    const { sY, beltY } = this;
    this.part(sym([[sY + 1, 8], [sY + 3, t + 2], [sY + 11, t + 1], [beltY, t]]), P, { shade: shade ?? ((u) => (u > 0.8 ? 1 : u < 0.12 ? 3 : 2)) });
    this.P = P;
    return this;
  }

  belt(c = '#4a2e1c', buckle = '#9a9aa6') {
    const B = tones(c);
    const t = this.tw;
    const y = this.beltY;
    this.rect(CX - t, y - 1, t * 2 + 1, 4, B[1]);
    this.h(CX - t, y - 1, t * 2 + 1, B[0]);
    this.h(CX - t, y + 2, t * 2 + 1, B[0]);
    this.h(CX - t + 1, y, t * 2 - 1, B[2]);
    if (buckle) {
      this.rect(CX - 3, y - 1, 7, 4, INK);
      this.rect(CX - 2, y, 5, 2, buckle);
      this.h(CX - 1, y, 3, '#d8d8e4');
    }
    return this;
  }

  // Col en V ouvert, sur la peau.
  collar(S, c) {
    const P = tones(c);
    const y = this.sY;
    for (let j = 0; j < 7; j++) this.h(CX - 3 + Math.floor(j / 2), y + j - 1, 7 - Math.floor(j / 2) * 2, j < 2 ? S[1] : S[2]);
    // pans du col
    for (let j = 0; j < 5; j++) {
      this.sh(4 - Math.floor(j / 3), y + j - 1, 4, P[3]);
      this.spx(3 - Math.floor(j / 3), y + j - 1, P[0]);
      this.spx(8 - Math.floor(j / 3), y + j - 1, P[0]);
    }
    this.sh(4, y + 4, 4, P[0]);
    return this;
  }

  buttons(c, from = 7) {
    const P = this.P;
    this.v(CX, this.sY + from, this.beltY - this.sY - from, P[1]);
    for (let y = this.sY + from + 1; y < this.beltY - 1; y += 4) this.px(CX + 1, y, c ?? P[0]);
    return this;
  }

  pocket(dx, y, w = 6, h = 6, flap = true) {
    const P = this.P;
    const x = CX + dx;
    this.h(x, y, w, P[0]);
    this.h(x, y + h, w, P[0]);
    this.v(x, y, h, P[0]);
    this.v(x + w - 1, y, h, P[0]);
    if (flap) this.h(x + 1, y + 2, w - 2, P[1]);
    return this;
  }

  tie(c) {
    const T = tones(c);
    const y = this.sY;
    this.rect(CX - 1, y + 2, 3, 2, T[1]);
    for (let j = 0; j < 11; j++) this.h(CX - 1 - (j > 1 && j < 9 ? 1 : 0), y + 4 + j, 3 + (j > 1 && j < 9 ? 2 : 0), j % 3 === 0 ? T[1] : T[2]);
    this.spx(2, y + 8, T[0]);
    return this;
  }

  // Bretelles (de sac ou de pantalon).
  straps(c) {
    const T = tones(c);
    const t = this.tw;
    for (const s of [-1, 1]) {
      const x = s < 0 ? CX - t + 1 : CX + t - 5;
      this.rect(x, this.sY + 1, 5, this.beltY - this.sY - 1, T[2]);
      this.v(x, this.sY + 1, this.beltY - this.sY - 1, T[0]);
      this.v(x + 4, this.sY + 1, this.beltY - this.sY - 1, T[0]);
      this.v(x + 1, this.sY + 2, this.beltY - this.sY - 3, T[3]);
      this.rect(x, this.sY + 12, 5, 3, T[0]);
      this.rect(x + 1, this.sY + 13, 3, 1, T[1]);
    }
    return this;
  }

  // ── Bras ──
  // sleeve : couleur de manche ; `short` : manche courte retroussée ; `hand` : rampe des mains.
  arms(S, { sleeve, short = false, hand, cuff } = {}) {
    const t = this.tw;
    const sw = this.sw;
    const aw = this.armW;
    const { sY, beltY } = this;
    const Q = sleeve ? tones(sleeve) : null;
    const handEnd = beltY + 11;
    const wrist = beltY + 4;
    const ox = CX - sw;
    const ix = ox + aw;

    // bras complet (peau ou manche longue)
    const skin = col([
      [sY + 3, CX - t - 6, CX - t + 2],
      [sY + 8, ox + 1, CX - t],
      [wrist, ox, ix],
      [handEnd - 2, ox, ix],
      [handEnd, ox + 2, ix - 1],
    ]);
    const L = (u) => (u > 0.74 ? 1 : u < 0.25 ? 3 : 2);
    const Rr = (u) => (u > 0.62 ? 1 : 2);
    this.part(skin, S, { shade: L });
    this.part(mir(skin), S, { shade: Rr });
    this.hL = { x: ox + Math.floor(aw / 2), y: handEnd };
    this.hR = { x: 2 * CX - ox - Math.floor(aw / 2), y: handEnd };

    if (sleeve) {
      const end = short ? sY + 13 : wrist - 1;
      const sl = col([
        [sY + 1, CX - 12, CX - 7],
        [sY + 3, CX - t - 6, CX - t + 2],
        [sY + 8, ox + 1, CX - t],
        [end, ox - (short ? 1 : 0), ix + (short ? 1 : 0)],
      ]);
      this.part(sl, Q, { shade: L });
      this.part(mir(sl), Q, { shade: Rr });
      // revers
      const c = cuff ?? Q[3];
      this.h(ox - (short ? 0 : 0) + 1, end - 2, aw - 1 + (short ? 1 : 0), c);
      this.h(2 * CX - ix - (short ? 1 : 0), end - 2, aw - 1 + (short ? 1 : 0), Q[2]);
      this.h(ox, end - 3, aw + 1, Q[0]);
      this.h(2 * CX - ix, end - 3, aw + 1, Q[0]);
    }

    // poings : articulations et pouce
    const Hd = hand ?? S;
    if (hand) {
      const fist = col([[wrist + 2, ox, ix], [handEnd - 2, ox, ix], [handEnd, ox + 2, ix - 1]]);
      this.part(fist, Hd, { shade: L });
      this.part(mir(fist), Hd, { shade: Rr });
    }
    for (const s of [0, 1]) {
      const x0 = s ? 2 * CX - ix : ox;
      this.v(x0 + 2, handEnd - 3, 3, Hd[0]);
      this.v(x0 + 4, handEnd - 3, 3, Hd[0]);
      if (aw > 6) this.v(x0 + 6, handEnd - 3, 3, Hd[0]);
      this.h(s ? x0 : x0 + aw - 3, handEnd - 5, 4, Hd[0]);
    }
    return this;
  }

  // ── Tête ──
  neck(S) {
    this.part(sym([[this.yH + 20, 5], [this.sY + 4, 5]]), S, { shade: () => 1, line: S[0] });
    return this;
  }

  head(S, { ear = 'round' } = {}) {
    const y = this.yH;
    const hw = this.headW;
    this.part(sym([[y + 2, hw - 3], [y + 4, hw - 1], [y + 6, hw], [y + 17, hw], [y + 20, hw - 1], [y + 22, hw - 3], [y + 24, hw - 6]]), S, {
      shade: (u, x, yy) => (u > 0.8 ? 1 : yy > y + 15 && (u < 0.2 || u > 0.72) ? 1 : 2),
    });
    // reflet du front et de la pommette
    this.h(CX - 6, y + 8, 5, S[3]);
    this.h(CX - 7, y + 15, 3, S[3]);
    if (ear === 'round') {
      this.part(box(CX - hw - 2, y + 11, 3, 5), S);
      this.part(box(CX + hw, y + 11, 3, 5), S, { shade: () => 1 });
    } else if (ear === 'pointy') {
      for (const s of [-1, 1]) {
        for (let j = 0; j < 9; j++) {
          const w = Math.max(1, Math.round((8 - j) * 0.7));
          for (let i = 0; i < w; i++) this.px(CX + s * (hw + 1 + i), y + 9 - Math.floor(j / 2) + j, j === 0 ? S[3] : S[2]);
        }
        this.px(CX + s * (hw + 1), y + 12, S[1]);
      }
    } else if (ear === 'ogre') {
      for (const s of [-1, 1]) {
        const e = s < 0 ? box(CX - hw - 5, y + 9, 6, 7) : box(CX + hw, y + 9, 6, 7);
        this.part(e, S);
        this.h(s < 0 ? CX - hw - 3 : CX + hw + 1, y + 12, 3, S[0]);
      }
    }
    return this;
  }

  // Sourcils, yeux, nez, bouche.
  face(S, { eyes = 'normal', brow = '#2a1810', mouth = 'flat', nose = true, iris = INK, lip } = {}) {
    const ey = this.ey;
    this.faceBox = { x0: CX - this.headW + 1, x1: CX + this.headW - 1, y0: ey - 3, y1: ey + 11 };
    if (eyes === 'normal' || eyes === 'tired' || eyes === 'stern') {
      // sourcils
      this.sh(3, ey - 2, 5, brow);
      this.spx(3, ey - 1, brow);
      if (eyes === 'stern') this.spx(2, ey - 1, brow);
      // œil
      this.sh(3, ey, 4, INK);
      this.sh(3, ey + 1, 4, '#f4f0e8');
      this.sh(4, ey + 1, 2, iris);
      this.sh(3, ey + 2, 4, S[1]);
      if (eyes === 'tired') {
        this.sh(3, ey + 1, 4, S[0]);
        this.sh(4, ey + 1, 2, iris);
        this.sh(3, ey + 3, 4, S[1]);
      }
    } else if (eyes === 'wide') {
      this.sh(3, ey - 3, 5, brow);
      this.sh(3, ey - 1, 4, INK);
      this.sh(3, ey, 4, '#f4f0e8');
      this.sh(3, ey + 1, 4, '#f4f0e8');
      this.sh(4, ey, 2, iris);
      this.sh(4, ey + 1, 2, iris);
      this.spx(4, ey, '#ffffff');
      this.sh(3, ey + 2, 4, S[1]);
    } else if (eyes === 'calm') {
      this.sh(3, ey - 2, 4, brow);
      this.sh(3, ey, 4, INK);
      this.sh(3, ey + 1, 3, iris);
      this.spx(4, ey + 1, '#f4f0e8');
    }
    this.stamps.push([CX - 5, ey + 1, INK], [CX + 5, ey + 1, INK]);
    if (nose) {
      this.v(CX, ey + 1, 4, S[3]);
      this.v(CX + 1, ey + 1, 4, S[1]);
      this.h(CX - 1, ey + 5, 3, S[1]);
      this.px(CX, ey + 5, S[0]);
    }
    const my = ey + 8;
    const L = lip ?? '#7a2a2a';
    if (mouth === 'flat') {
      this.h(CX - 3, my, 7, L);
      this.h(CX - 2, my + 1, 5, S[1]);
    } else if (mouth === 'smile') {
      this.h(CX - 3, my, 7, L);
      this.spx(4, my - 1, L);
      this.h(CX - 2, my + 1, 5, S[1]);
    } else if (mouth === 'grin') {
      this.h(CX - 4, my - 1, 9, INK);
      this.h(CX - 4, my, 9, '#f8f6ee');
      this.h(CX - 3, my + 1, 7, '#f8f6ee');
      this.h(CX - 3, my + 2, 7, INK);
      this.spx(5, my - 1, INK);
      this.spx(5, my, INK);
      this.spx(4, my + 1, INK);
    }
    return this;
  }

  beard(c, { kind = 'full' } = {}) {
    const B = tones(c);
    const y = this.yH;
    const hw = this.headW;
    const ey = this.ey;
    if (kind === 'goatee') {
      // moustache reliée à un bouc, la bouche au milieu
      const my = ey + 6;
      this.rect(CX - 5, my, 11, 2, B[1]);
      this.h(CX - 4, my, 9, B[2]);
      this.v(CX - 5, my + 2, 3, B[1]);
      this.v(CX + 5, my + 2, 3, B[1]);
      this.rect(CX - 4, ey + 10, 9, 2, B[1]);
      this.h(CX - 2, ey + 12, 5, B[0]);
      this.h(CX - 2, ey + 8, 5, '#b05a48');
      return this;
    }
    if (kind === 'mexican') {
      // moustache épaisse dont les pointes tombent sous la bouche
      const my = ey + 6;
      this.rect(CX - 7, my, 15, 2, B[1]);
      this.h(CX - 6, my, 13, B[2]);
      for (const s of [-1, 1]) {
        this.v(CX + s * 7, my + 1, 5, B[1]);
        this.v(CX + s * 6, my + 2, 3, B[1]);
      }
      this.h(CX - 2, ey + 9, 5, '#7a3030');
      return this;
    }
    if (kind === 'mustache') {
      const my = ey + 6;
      this.rect(CX - 5, my, 11, 2, B[1]);
      this.h(CX - 5, my, 11, B[3]);
      this.spx(6, my + 1, B[1]);
      this.spx(6, my + 2, B[0]);
      return this;
    }
    this.part(sym([[y + 12, hw + 1], [y + 21, hw + 1], [y + 25, hw - 2], [y + 27, hw - 5]]), B, {
      shade: (u, x, yy) => (u > 0.74 ? 0 : (x * 3 + yy * 5) % 7 === 0 ? 3 : (x + yy) % 5 === 0 ? 1 : 2),
      keep: (x, yy) => yy >= ey + 6 || Math.abs(x - CX) >= hw - 1,
      line: B[0],
      top: false,
    });
    // moustache et bouche dans la barbe
    this.rect(CX - 5, ey + 6, 11, 2, B[1]);
    this.h(CX - 4, ey + 6, 9, B[3]);
    this.h(CX - 3, ey + 8, 7, '#b05a48');
    this.h(CX - 2, ey + 9, 5, '#7a3030');
    return this;
  }

  // Coiffures : une calotte, puis des variantes.
  hair(style, c) {
    const Hc = tones(c);
    const y = this.yH;
    const hw = this.headW;
    const shade = (u, x, yy) => ((x * 2 + yy) % 7 === 0 ? 3 : (x + yy * 3) % 9 === 0 ? 1 : u > 0.75 ? 1 : 2);
    const cap = (fringe, side = 10) =>
      this.part(sym([[y, hw - 3], [y + 2, hw], [y + 5, hw + 1], [y + 13, hw + 1]]), Hc, {
        shade,
        keep: (x, yy) => yy < y + fringe(x) || (Math.abs(x - CX) >= hw && yy < y + side),
      });
    switch (style) {
      case 'short':
        cap((x) => 6 + (Math.abs(x - CX + 1) < 2 ? 2 : 0) + ((x * 7) % 5 === 0 ? 1 : 0), 11);
        break;
      case 'wavy':
        for (const dx of [-7, -2, 3, 8]) this.part(disc(CX + dx, y + 1, 3), Hc, { shade });
        cap((x) => 6 + (x % 4 < 2 ? 1 : 0), 12);
        break;
      case 'long':
        cap((x) => 6 + (x % 4 === 0 ? 1 : 0), 21);
        break;
      case 'bun':
        this.part(disc(CX, y - 2, 5, 4), Hc, { shade });
        cap((x) => 5 + (Math.abs(x - CX) < 2 ? -1 : 0), 9);
        break;
      case 'curly':
        for (const [dx, yy, r] of [[-9, 4, 4], [-5, 0, 4], [0, -1, 4], [5, 0, 4], [9, 4, 4], [-11, 10, 3], [11, 10, 3], [-11, 15, 3], [11, 15, 3]])
          this.part(disc(CX + dx, y + yy, r), Hc, { shade: (u, x, yy2) => ((x + yy2) % 4 === 0 ? 3 : u > 0.7 ? 1 : 2) });
        cap((x) => 5 + (x % 3 === 0 ? 2 : 0), 8);
        break;
      case 'platinum_curls': {
        // côtés foncés en dégradé, boucles claires sur le dessus
        for (let j = 5; j < 13; j++) {
          if (j > 9 && j % 2) continue;
          this.spx(hw, y + j, '#241810');
          this.spx(hw - 1, y + j, '#241810');
        }
        cap(() => 4, 4);
        for (const [dx, yy, r] of [[-8, 3, 4], [-3, 0, 4], [3, 0, 4], [8, 3, 4], [-6, 5, 3], [0, 5, 3], [6, 5, 3]])
          this.part(disc(CX + dx, y + yy, r), Hc, { shade: (u, x, yy2) => ((x + yy2) % 4 === 0 ? 3 : u > 0.7 ? 1 : 2) });
        break;
      }
      case 'bald':
        this.spx(hw - 1, y + 9, Hc[1]);
        this.spx(hw, y + 10, Hc[1]);
        break;
      default:
        break;
    }
    return this;
  }

  // Cheveux longs, derrière le corps.
  hairBack(c, len = 22) {
    const Hc = tones(c);
    const y = this.yH;
    const hw = this.headW;
    this.part(sym([[y + 3, hw + 1], [y + 8, hw + 3], [y + len, hw + 3], [y + len + 3, hw]]), Hc, {
      shade: (u, x) => (x % 3 === 0 ? 1 : u > 0.72 ? 1 : x % 3 === 1 ? 3 : 2),
    });
    return this;
  }

  // ── Coiffes ──
  cap(c, { badge = '#e8c860', visor } = {}) {
    const P = tones(c);
    const y = this.yH;
    const hw = this.headW;
    this.part(sym([[y - 1, hw - 1], [y + 2, hw + 2], [y + 5, hw + 1], [y + 7, hw]]), P, { shade: (u) => (u > 0.76 ? 1 : u < 0.2 ? 3 : 2) });
    this.rect(CX - hw, y + 6, hw * 2 + 1, 2, P[0]);
    const V = tones(visor ?? '#1c1c26');
    this.part(sym([[y + 8, hw], [y + 10, hw - 2]]), V, { shade: () => 2 });
    this.h(CX - hw + 2, y + 8, hw, V[4]);
    this.rect(CX - 2, y + 2, 5, 4, INK);
    this.rect(CX - 1, y + 3, 3, 2, badge);
    return this;
  }

  beanie(c) {
    const P = tones(c);
    const y = this.yH;
    const hw = this.headW;
    this.part(sym([[y - 2, hw - 5], [y + 1, hw], [y + 4, hw + 1], [y + 7, hw + 1]]), P, { shade: (u, x) => (x % 3 === 0 ? 1 : u > 0.75 ? 1 : 2) });
    this.part(sym([[y + 6, hw + 2], [y + 9, hw + 2]]), P, { shade: (u, x) => (x % 2 === 0 ? 3 : 2) });
    this.part(disc(CX, y - 4, 3), tones('#e8e4d4'), {});
    return this;
  }

  band(c) {
    const P = tones(c);
    const y = this.yH + 5;
    const hw = this.headW;
    this.rect(CX - hw - 1, y, hw * 2 + 3, 3, P[2]);
    this.h(CX - hw - 1, y, hw * 2 + 3, P[3]);
    this.h(CX - hw - 1, y + 2, hw * 2 + 3, P[1]);
    // nœud qui flotte
    this.h(CX + hw + 2, y + 1, 3, P[2]);
    this.h(CX + hw + 3, y + 2, 4, P[1]);
    this.h(CX + hw + 4, y + 3, 3, P[1]);
    return this;
  }

  glasses(c = '#d8d8e8') {
    const ey = this.ey;
    for (const s of [-1, 1]) {
      const x = s < 0 ? CX - 8 : CX + 2;
      this.h(x, ey - 1, 7, INK);
      this.h(x, ey + 3, 7, INK);
      this.v(x, ey - 1, 5, INK);
      this.v(x + 6, ey - 1, 5, INK);
      this.px(x + 1, ey, c);
    }
    this.h(CX - 1, ey, 3, INK);
    // Version réduite : seul le haut de la monture reste, sinon le visage vire au masque.
    for (let x = CX - 8; x <= CX + 8; x += 2) if (Math.abs(x - CX) > 1) this.stamps.push([x, ey - 1, INK]);
    return this;
  }

  done(alpha) {
    const raw = new Pix(W, H);
    raw.d.set(this.p.d);
    this.p.outline(1, { ink: INK });
    if (alpha) alpha(this.p);
    return { big: this.p, raw, stamps: this.stamps, alpha, faceBox: this.faceBox };
  }
}

// Un sac à dos vu de face, derrière le corps.
function backpack(f, c, roll = '#a89a70') {
  const P = tones(c);
  const { sY } = f;
  f.part(col([[sY - 6, CX - 18, CX - 6], [sY + 2, CX - 22, CX - 5], [sY + 14, CX - 20, CX - 8]]), P, { shade: (u) => (u < 0.3 ? 3 : u > 0.7 ? 1 : 2) });
  f.part(col([[sY - 6, CX + 6, CX + 18], [sY + 2, CX + 5, CX + 22], [sY + 14, CX + 8, CX + 20]]), P, { shade: (u) => (u > 0.6 ? 1 : 2) });
  // duvet roulé
  const R = tones(roll);
  f.part(disc(CX + 21, sY - 2, 5), R, { shade: (u, x, y) => ((x + y) % 4 === 0 ? 1 : 2) });
  f.part(disc(CX + 21, sY - 2, 2), R, { shade: () => 1 });
}

// Un personnage ordinaire, d'après sa fiche.
function person(o, build = {}) {
  const f = new Fig(build);
  const S = SKIN_RAMP(o.skin);
  o.back?.(f);
  if (o.hairBack) f.hairBack(o.hairColor, o.hairBack);
  if (o.bare) f.bareLegs(S, o.bare);
  else if (o.pants) f.legs(o.pants, o.legsOpt);
  if (o.shoes) f.boots(o.shoes, o.shoesOpt);
  o.under?.(f, S);
  f.torso(o.top, o.torsoOpt);
  o.deco?.(f, S);
  f.neck(S);
  f.arms(S, o.armsOpt);
  o.front?.(f, S);
  f.head(S, { ear: o.ear ?? 'round' });
  f.face(S, { brow: tones(o.hairColor ?? '#2a1810')[1], ...o.faceOpt });
  if (o.beard) f.beard(o.beard, o.beardOpt);
  if (o.hair) f.hair(o.hair, o.hairColor);
  o.over?.(f, S);
  return f.done();
}

// Tout en niveaux de gris (Jean Gabin).
function grayscale(fig) {
  for (const p of [fig.big, fig.raw]) {
    const d = p.d;
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
      d[i] = d[i + 1] = d[i + 2] = g;
    }
  }
  return fig;
}

// Le conducteur (le joueur) et son double de quarante ans.
function conductorFig(old) {
  return person({
    skin: old ? '#e6c0a4' : '#eebf98',
    pants: '#2a2630',
    shoes: '#1c1a20',
    shoesOpt: { low: true, lace: false },
    top: '#7a2f2f',
    deco(f, S) {
      f.collar(S, '#f0ece0');
      f.buttons('#e8c860');
      f.belt('#1c1c26', '#e8c860');
    },
    armsOpt: { sleeve: '#7a2f2f', cuff: '#e8c860' },
    faceOpt: { mouth: old ? 'none' : 'smile', eyes: old ? 'calm' : 'normal' },
    ...(old ? { beard: '#e8e8ec', beardOpt: { kind: 'full' } } : {}),
    hair: 'short',
    hairColor: old ? '#e8e8ec' : '#4a3020',
    over: (f) => f.cap('#7a2f2f', { badge: '#e8c860' }),
  });
}

// ───────────────────────── Les voyageurs ─────────────────────────

const ROSTER = {
  // Momo : tout petit, 19 ans, survêtement sombre à bandes, baskets, sacoche, lunettes et duvet au menton.
  momo: () =>
    person(
      {
        skin: '#dcae84',
        pants: '#1a2030',
        legsOpt: { cuff: false },
        shoes: '#1c1c22',
        shoesOpt: { low: true, lace: false, sole: '#58b0e0', toe: '#f0f0f4' },
        under(f) {
          f.sv(f.tw - 1, f.legTop + 1, f.legH, '#f0f0f4');
        },
        top: '#1a2030',
        deco(f) {
          f.sh(5, f.sY + 3, 6, '#f0f0f4');
          f.sh(5, f.sY + 4, 6, '#58b0e0');
          f.v(CX, f.sY + 3, f.beltY - f.sY - 3, '#c8c8d4');
        },
        armsOpt: { sleeve: '#1a2030', cuff: '#f0f0f4' },
        front(f) {
          // col montant, sangle et sacoche (sans logo)
          f.rect(CX - 4, f.sY, 9, 3, '#2a3348');
          f.h(CX - 4, f.sY, 9, '#f0f0f4');
          const y0 = f.sY + 3;
          const y1 = f.beltY - 5;
          for (let x = CX - 9; x <= CX + 6; x++) {
            const y = Math.round(y0 + ((x - CX + 9) / 15) * (y1 - y0));
            f.px(x, y, '#5a5a6a');
            f.px(x, y + 1, INK);
          }
          f.rect(CX + 3, f.beltY - 6, 10, 9, INK);
          f.rect(CX + 4, f.beltY - 5, 8, 7, '#2e2e3a');
          f.h(CX + 4, f.beltY - 3, 8, '#8a8a98');
          f.px(CX + 10, f.beltY - 2, '#c8c8d4');
        },
        faceOpt: { mouth: 'smile', eyes: 'normal' },
        hair: 'wavy',
        hairColor: '#1c1410',
        over(f) {
          f.glasses();
          const fuzz = '#7a543c';
          for (const dx of [-4, -2, 0, 2, 4]) f.px(CX + dx, f.ey + 6, fuzz);
          f.px(CX - 1, f.ey + 11, fuzz);
          f.px(CX + 1, f.ey + 11, fuzz);
          f.px(CX, f.ey + 10, fuzz);
        },
      },
      { legH: 9, torsoH: 15, bootH: 8 },
    ),

  // Benjamin : 19 ans, fin, cheveux bruns au-dessus des épaules, petite moustache, maillot bleu sans écusson.
  benjamin: () =>
    person(
      {
        skin: '#eebf98',
        pants: '#2a3350',
        shoes: '#c8c0b0',
        shoesOpt: { low: true, sole: '#e8e4d8' },
        hairBack: 17,
        top: '#1f3f9a',
        deco(f) {
          f.sh(1, f.sY + 2, 6, '#f0f0f4');
          f.sh(1, f.sY + 3, 4, '#f0f0f4');
          f.h(CX - f.tw + 1, f.sY + 9, f.tw * 2 - 1, '#f0f0f4');
          f.h(CX - f.tw + 1, f.sY + 10, f.tw * 2 - 1, '#c8202c');
          f.belt('#1c1c26', '#c8a860');
        },
        armsOpt: { sleeve: '#1f3f9a', short: true, cuff: '#f0f0f4' },
        faceOpt: { mouth: 'smile', eyes: 'normal' },
        hair: 'long',
        hairColor: '#5a3a22',
        over(f) {
          f.h(CX - 4, f.ey + 6, 9, '#3a2414');
          f.h(CX - 3, f.ey + 7, 7, '#2a180c');
        },
      },
      { sw: 18, tw: 10, armW: 7 },
    ),

  // Lamine Yamal : maillot rayé bleu et grenat n° 10, short, crampons, boucles décolorées.
  lamine: () =>
    person(
      {
        skin: '#9c6840',
        bare: { sock: '#1c3a8a', sockBand: '#f0f0f4' },
        shoes: '#f0e040',
        shoesOpt: { low: true, sole: '#1c1a20', lace: '#2a2a30' },
        under(f) {
          const P = tones('#1c3a8a');
          const s = col([[f.beltY, CX - f.tw, CX - 1], [f.legTop + 8, CX - f.tw - 1, CX - 2]]);
          f.part(s, P);
          f.part(mir(s), P, { shade: (u) => (u > 0.68 ? 1 : 2) });
          f.sh(10, f.legTop + 5, 2, '#f0f0f4');
        },
        top: '#8a1c3c',
        torsoOpt: { shade: (u, x) => (Math.floor((x + 1) / 5) % 2 === 0 ? '#1c3a8a' : '#8a1c3c') },
        deco(f) {
          // col et numéro 10
          f.sh(1, f.sY + 2, 6, '#f0f0f4');
          f.sh(1, f.sY + 3, 4, '#f0f0f4');
          f.v(CX - 5, f.sY + 8, 8, '#f8f4e8');
          f.v(CX - 4, f.sY + 8, 8, '#f8f4e8');
          f.rect(CX, f.sY + 8, 6, 8, '#f8f4e8');
          f.rect(CX + 2, f.sY + 10, 2, 4, '#8a1c3c');
        },
        armsOpt: { sleeve: '#1c3a8a', short: true, cuff: '#f0f0f4' },
        front(f) {
          // ballon au pied
          const x = CX + 19;
          const y = f.foot - 5;
          f.part(disc(x, y, 5), tones('#f4f4f4'), { line: INK, shade: () => 3 });
          f.rect(x - 1, y - 1, 3, 3, INK);
          f.px(x - 4, y, INK);
          f.px(x + 3, y + 3, INK);
        },
        faceOpt: { mouth: 'flat', eyes: 'normal', brow: '#17100c' },
        hair: 'platinum_curls',
        hairColor: '#e8dcae',
      },
      { tw: 11, sw: 18, armW: 7, legH: 20 },
    ),

  // Thanos : titan violet, armure bleu et or, menton strié, gant doré aux cinq trous vides.
  thanos: () => {
    const f = new Fig({ tw: 17, sw: 25, armW: 9, headW: 11, legH: 13, torsoH: 22, bootH: 9 });
    const S = SKIN_RAMP('#8a6ab0');
    const G = tones('#d8a830');
    f.legs('#2e3a7a');
    f.boots('#b88a24', { lace: false });
    f.torso('#2e3a7a');
    const P = f.P;
    // plastron doré et plaques du ventre
    f.part(sym([[f.sY + 3, 11], [f.sY + 8, 13], [f.sY + 13, 8]]), G, { shade: (u) => (u > 0.75 ? 1 : u < 0.2 ? 3 : 2) });
    f.v(CX, f.sY + 4, 9, G[0]);
    for (let yy = f.sY + 15; yy < f.beltY - 1; yy += 3) f.h(CX - 7, yy, 15, P[0]);
    f.belt('#b88a24', '#f0d870');
    f.neck(S);
    f.arms(S, { sleeve: '#2e3a7a', short: true, cuff: '#d8a830' });
    // épaulières
    f.part(disc(CX - 19, f.sY + 5, 7, 4), G, { shade: (u) => (u < 0.4 ? 3 : 2) });
    f.part(disc(CX + 19, f.sY + 5, 7, 4), G, { shade: (u) => (u > 0.6 ? 1 : 2) });
    // le gant : cinq trous, zéro pierre
    const gx = CX + f.sw - f.armW;
    f.part(col([[f.beltY - 1, gx - 1, gx + 10], [f.beltY + 9, gx, gx + 9], [f.beltY + 11, gx + 1, gx + 8]]), G, { shade: (u) => (u > 0.7 ? 1 : u < 0.25 ? 3 : 2) });
    f.h(gx, f.beltY + 1, 10, G[0]);
    for (let i = 0; i < 4; i++) f.px(gx + 2 + i * 2, f.beltY + 8, INK);
    f.rect(gx + 3, f.beltY + 3, 3, 3, INK);
    // tête à mâchoire carrée
    const y = f.yH;
    f.head(S);
    f.part(sym([[y + 16, 11], [y + 23, 11], [y + 26, 8]]), S, { top: false, shade: (u) => (u > 0.8 ? 1 : 2) });
    f.face(S, { eyes: 'stern', mouth: 'flat', brow: '#3a2a5a', lip: '#4a2a6a' });
    for (const dx of [-4, -2, 0, 2, 4]) f.v(CX + dx, y + 23, 3, S[0]);
    f.hair('bald', '#6a4a8a');
    return f.done();
  },

  // Scrat : écureuil à dents de sabre, yeux exorbités, queue en panache, gland serré contre lui.
  scrat: () => {
    const f = new Fig({ tw: 7, sw: 11, armW: 4, headW: 8, torsoH: 16, legH: 10, bootH: 6 });
    const Fur = tones('#b9a184');
    const Dark = tones('#7a6248');
    const y = f.yH;
    // queue en panache
    f.part(col([[y + 2, CX + 13, CX + 19], [y + 8, CX + 10, CX + 24], [f.sY + 8, CX + 9, CX + 25], [f.beltY + 4, CX + 7, CX + 21], [f.foot - 3, CX + 3, CX + 12]]), Dark, {
      shade: (u, x, yy) => ((x + yy * 2) % 5 === 0 ? 3 : (x * 2 + yy) % 7 === 0 ? 0 : u > 0.7 ? 1 : 2),
    });
    // pattes et grands pieds
    const leg = col([[f.beltY, CX - 7, CX - 2], [f.foot - 3, CX - 7, CX - 3]]);
    f.part(leg, Fur);
    f.part(mir(leg), Fur, { shade: (u) => (u > 0.6 ? 1 : 2) });
    const paw = col([[f.foot - 3, CX - 12, CX - 2], [f.foot, CX - 13, CX - 2]]);
    f.part(paw, Fur);
    f.part(mir(paw), Fur);
    f.torso(Fur);
    f.part(sym([[f.sY + 5, 3], [f.sY + 9, 5], [f.beltY - 1, 5]]), tones('#e4d8bc'), { line: null, shade: () => 2 });
    f.neck(Fur);
    // oreilles
    f.part(disc(CX - 7, y + 2, 3), Fur);
    f.part(disc(CX + 7, y + 2, 3), Fur, { shade: () => 1 });
    // crâne étroit et long museau
    f.part(sym([[y + 2, 5], [y + 5, 8], [y + 13, 8], [y + 17, 5], [y + 22, 4], [y + 24, 2]]), Fur, { shade: (u) => (u > 0.78 ? 1 : 2) });
    // yeux exorbités, qui louchent
    for (const s of [-1, 1]) {
      f.part(disc(CX + s * 5, y + 8, 5), tones('#f4f0e8'), { line: INK, shade: () => 3 });
      f.rect(s < 0 ? CX - 3 : CX + 2, y + 8, 2, 2, INK);
    }
    f.stamps.push([CX - 3, y + 8, INK], [CX + 3, y + 8, INK]);
    // truffe et dents de sabre
    for (const x of [CX - 4, CX + 3]) {
      f.rect(x, y + 23, 2, 7, '#f8f6ee');
      f.v(x - 1, y + 23, 7, INK);
      f.v(x + 2, y + 23, 7, INK);
      f.h(x, y + 30, 2, INK);
    }
    f.rect(CX - 2, y + 20, 5, 3, INK);
    f.px(CX - 1, y + 20, '#6a6070');
    // bras repliés sur le gland
    const arm = col([[f.sY + 3, CX - 11, CX - 7], [f.sY + 9, CX - 12, CX - 8], [f.sY + 13, CX - 9, CX - 3]]);
    f.part(arm, Fur);
    f.part(mir(arm), Fur, { shade: (u) => (u > 0.6 ? 1 : 2) });
    f.part(disc(CX, f.sY + 12, 3, 4), tones('#b07a3a'), { line: INK, shade: (u) => (u < 0.4 ? 3 : 2) });
    f.part(col([[f.sY + 7, CX - 3, CX + 3], [f.sY + 9, CX - 4, CX + 4]]), tones('#6a4a2a'), { line: INK, shade: () => 2 });
    f.px(CX, f.sY + 6, INK);
    return f.done();
  },

  // Messi : tout petit, barbe rousse, rayures ciel et blanc, n° 10, un Ballon d'or au pied.
  messi: () =>
    person(
      {
        skin: '#e8b890',
        bare: { sock: '#f4f4f4', sockBand: '#8cc8f0' },
        shoes: '#2a2a30',
        shoesOpt: { low: true, sole: '#e8e8ec', lace: '#e8e8ec' },
        under(f) {
          const P = tones('#1c1c26');
          const s = col([[f.beltY, CX - f.tw, CX - 1], [f.legTop + 6, CX - f.tw - 1, CX - 2]]);
          f.part(s, P);
          f.part(mir(s), P, { shade: (u) => (u > 0.68 ? 1 : 2) });
        },
        top: '#8cc8f0',
        torsoOpt: { shade: (u, x) => (Math.floor((x + 1) / 4) % 2 === 0 ? '#8cc8f0' : '#f4f4f4') },
        deco(f) {
          // col et numéro 10
          const c = '#1c1c26';
          f.sh(1, f.sY + 2, 6, '#f4f4f4');
          f.sh(1, f.sY + 3, 4, '#f4f4f4');
          f.v(CX - 5, f.sY + 7, 8, c);
          f.v(CX - 4, f.sY + 7, 8, c);
          f.rect(CX, f.sY + 7, 6, 8, c);
          f.rect(CX + 2, f.sY + 9, 2, 4, '#f4f4f4');
        },
        armsOpt: { sleeve: '#8cc8f0', short: true, cuff: '#f4f4f4' },
        front(f) {
          // Ballon d'or au pied
          const x = CX + 18;
          const y = f.foot - 5;
          f.part(disc(x, y, 5), tones('#e8b830'), { line: INK, shade: (u) => (u < 0.4 ? 3 : u > 0.75 ? 1 : 2) });
          f.px(x - 2, y - 2, '#fff4c0');
          f.px(x - 1, y - 3, '#fff4c0');
        },
        faceOpt: { mouth: 'none', eyes: 'calm' },
        beard: '#8a4a26',
        hair: 'short',
        hairColor: '#4a2c18',
      },
      { tw: 11, sw: 17, armW: 7, legH: 13, torsoH: 17 },
    ),

  // Jean Gabin : casquette, pardessus, cravate, clope au bec. En noir et blanc, évidemment.
  gabin: () =>
    grayscale(
      person({
        skin: '#c8c8c8',
        pants: '#4a4a4a',
        shoes: '#1e1e1e',
        shoesOpt: { low: true },
        top: '#6e6e6e',
        deco(f) {
          const P = f.P;
          for (let j = 0; j < 9; j++) f.h(CX - 4 + Math.floor(j / 2), f.sY + 1 + j, 9 - Math.floor(j / 2) * 2, '#f0f0f0');
          f.tie('#2a2a2a');
          for (let j = 0; j < 9; j++) f.spx(5 - Math.floor(j / 2), f.sY + 1 + j, P[0]);
          f.buttons('#bdbdbd', 13);
          f.pocket(-10, f.sY + 13, 7, 5);
          f.pocket(4, f.sY + 13, 7, 5);
        },
        armsOpt: { sleeve: '#6e6e6e' },
        faceOpt: { eyes: 'tired', mouth: 'flat', brow: '#f0f0f0', lip: '#5a5a5a' },
        hair: 'short',
        hairColor: '#e4e4e4',
        over(f) {
          const y = f.yH;
          const hw = f.headW;
          // casquette plate
          f.part(sym([[y - 1, hw - 2], [y + 1, hw + 2], [y + 5, hw + 2], [y + 6, hw + 1]]), tones('#4a4a4a'), {
            shade: (u, x, yy) => ((x + yy) % 4 === 0 ? 3 : u > 0.75 ? 1 : 2),
          });
          f.part(sym([[y + 7, hw + 1], [y + 9, hw - 2]]), tones('#2e2e2e'), { shade: () => 2 });
          // cigarette
          const my = f.ey + 8;
          f.h(CX + 2, my, 5, '#f4f4f4');
          f.px(CX + 7, my, '#8a8a8a');
        },
      }),
    ),

  // Zoro : cheveux verts, cicatrice sur l'œil, ceinture verte, bandana au bras et trois sabres.
  zoro: () =>
    person(
      {
        skin: '#e0b088',
        pants: '#26302c',
        shoes: '#1c1a1e',
        top: '#ece8dc',
        deco(f, S) {
          f.collar(S, '#ece8dc');
          // large ceinture verte
          const G = tones('#4a8a4a');
          const t = f.tw;
          f.rect(CX - t, f.beltY - 6, t * 2 + 1, 9, G[2]);
          f.h(CX - t, f.beltY - 6, t * 2 + 1, G[0]);
          f.h(CX - t, f.beltY + 2, t * 2 + 1, G[0]);
          f.sv(t, f.beltY - 6, 9, G[0]);
          for (let x = CX - t + 3; x < CX + t; x += 3) f.v(x, f.beltY - 5, 7, G[1]);
        },
        armsOpt: { sleeve: '#ece8dc', short: true },
        front(f) {
          // bandana noir noué au bras
          f.rect(CX - f.sw, f.sY + 14, f.armW + 1, 3, '#1c1c22');
          f.rect(CX - f.sw - 1, f.sY + 16, 2, 3, '#1c1c22');
          // trois sabres à la hanche
          [['#f4f0e8', '#e8e4d8'], ['#b02828', '#7a1c1c'], ['#3a3a44', '#2a2a32']].forEach(([grip, sheath], i) => {
            for (let t = 0; t < 30; t++) {
              const x = CX + 13 + i * 3 + Math.round(t * 0.2);
              const y = f.beltY - 9 + t;
              f.px(x, y, t < 7 ? grip : sheath);
              f.px(x + 1, y, INK);
              if (t === 7) f.h(x - 1, y, 4, '#e8c040');
            }
          });
        },
        faceOpt: { eyes: 'stern', mouth: 'flat' },
        hair: 'short',
        hairColor: '#4f9a4a',
        over(f, S) {
          // œil balafré, trois boucles d'oreille
          f.h(CX + 3, f.ey + 1, 4, S[2]);
          f.v(CX + 5, f.ey - 3, 8, '#9a4a40');
          f.v(CX + f.headW + 1, f.yH + 16, 3, '#f0c840');
        },
      },
      { sw: 21 },
    ),

  // Mélenchon : veste sombre, cravate rouge, lunettes, triangle rouge au revers, en plein discours.
  melenchon: () =>
    person({
      skin: '#e8b898',
      pants: '#2e2e38',
      shoes: '#1c1a1e',
      shoesOpt: { low: true },
      top: '#3a3a44',
      deco(f) {
        const P = f.P;
        // chemise, cravate rouge, revers
        for (let j = 0; j < 9; j++) f.h(CX - 4 + Math.floor(j / 2), f.sY + 1 + j, 9 - Math.floor(j / 2) * 2, '#f0f0f4');
        f.tie('#c8202c');
        for (let j = 0; j < 9; j++) f.spx(5 - Math.floor(j / 2), f.sY + 1 + j, P[0]);
        f.buttons(undefined, 14);
        f.px(CX - 8, f.sY + 8, '#e02828');
        f.h(CX - 9, f.sY + 9, 3, '#e02828');
      },
      armsOpt: { sleeve: '#3a3a44' },
      faceOpt: { eyes: 'stern', mouth: 'none' },
      hair: 'short',
      hairColor: '#b8b8b8',
      over(f) {
        const { ey } = f;
        f.glasses();
        // bouche grande ouverte
        f.rect(CX - 3, ey + 7, 7, 4, INK);
        f.rect(CX - 2, ey + 8, 5, 2, '#8a2a2a');
        f.h(CX - 2, ey + 8, 5, '#f4f0e8');
      },
    }),

  // Bruno : énorme, brun, poilu comme un ours. Marcel sous le manteau, monosourcil, pot de miel.
  poilu: () =>
    person(
      {
        skin: '#c89870',
        pants: '#3a3a4a',
        shoes: '#2a2420',
        top: '#ece8dc',
        deco(f, S) {
          const HAIR = '#2a1c14';
          // échancrure du marcel et toison
          f.part(sym([[f.sY + 2, 7], [f.sY + 10, 4]]), S, { line: null, shade: () => 2 });
          for (let y = f.sY + 2; y <= f.sY + 10; y++)
            for (let x = CX - 7; x <= CX + 7; x++) if ((x * 3 + y * 5) % 4 < 2 && Math.abs(x - CX) <= 7 - (y - f.sY - 2) * 0.4) f.px(x, y, HAIR);
          // manteau ouvert
          const V = tones('#3a6a8a');
          const side = col([[f.sY + 2, CX - 10, CX - 8], [f.sY + 4, CX - 17, CX - 8], [f.beltY + 6, CX - 17, CX - 9]]);
          f.part(side, V);
          f.part(mir(side), V, { shade: (u) => (u > 0.6 ? 1 : 2) });
          // poils qui dépassent du marcel
          for (const dx of [-6, -3, 0, 3, 6]) f.px(CX + dx, f.beltY - 1 - (Math.abs(dx) % 2), HAIR);
        },
        armsOpt: { sleeve: '#3a6a8a' },
        front(f) {
          const HAIR = '#2a1c14';
          // mains velues
          for (const h of [f.hL, f.hR]) for (const [dx, dy] of [[-2, -7], [0, -8], [2, -7], [-1, -5], [1, -6]]) f.px(h.x + dx, h.y + dy, HAIR);
          // pot de miel
          const x = f.hR.x - 4;
          const y = f.hR.y - 1;
          f.part(box(x, y, 9, 9), tones('#e8a820'), { line: INK, shade: (u) => (u < 0.35 ? 3 : 2) });
          f.h(x + 1, y + 1, 7, '#f6f0dc');
          f.rect(x + 2, y + 4, 5, 2, '#fff4c0');
        },
        faceOpt: { eyes: 'normal', mouth: 'none' },
        beard: '#2a1c14',
        hair: 'curly',
        hairColor: '#2a1c14',
        over(f) {
          // monosourcil
          f.rect(CX - 8, f.ey - 3, 17, 2, '#1c120c');
        },
      },
      { tw: 16, sw: 24, armW: 8, headW: 11, legH: 14, torsoH: 22 },
    ),

  // Shrek : ogre vert, tunique claire, gilet brun, oreilles en trompette, oignon à la main.
  shrek: () => {
    const f = new Fig({ tw: 17, sw: 25, armW: 8, headW: 11, legH: 13, torsoH: 22, bootH: 9 });
    const S = SKIN_RAMP('#7fa04a');
    f.legs('#5a4634', { shade: (u, x, y) => ((Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0 ? 2 : 1) });
    f.boots('#3a2a20', { lace: false });
    f.torso('#d8cdb0');
    // lacet du col
    for (let y = f.sY + 4; y < f.sY + 12; y += 2) f.h(CX - 1, y, 3, '#8a7a5a');
    // gilet brun ouvert
    const V = tones('#6a4a2c');
    const side = col([[f.sY + 2, CX - 10, CX - 6], [f.sY + 4, CX - 18, CX - 6], [f.beltY - 1, CX - 16, CX - 9]]);
    f.part(side, V);
    f.part(mir(side), V, { shade: (u) => (u > 0.6 ? 1 : 2) });
    f.belt('#2a1a14', '#c8a860');
    f.neck(S);
    f.arms(S, { sleeve: '#d8cdb0' });
    // oignon dans la main
    const ox = f.hR.x;
    const oy = f.hR.y - 8;
    f.part(disc(ox, oy, 4), tones('#c89a5a'), { line: INK, shade: (u) => (u < 0.4 ? 3 : 2) });
    f.v(ox, oy - 7, 3, '#6a9a3a');
    f.px(ox + 1, oy - 8, '#6a9a3a');
    // oreilles en trompette
    const y = f.yH;
    const hw = f.headW;
    f.part(box(CX - hw - 4, y + 5, 6, 4), S);
    f.part(box(CX + hw - 1, y + 5, 6, 4), S, { shade: () => 1 });
    f.part(box(CX - hw - 7, y + 2, 4, 8), S);
    f.part(box(CX + hw + 4, y + 2, 4, 8), S, { shade: () => 1 });
    f.v(CX - hw - 6, y + 4, 4, S[0]);
    f.v(CX + hw + 6, y + 4, 4, S[0]);
    f.head(S, { ear: 'none' });
    f.face(S, { eyes: 'normal', mouth: 'none', brow: '#3a4a20' });
    // large sourire
    const my = f.ey + 8;
    f.h(CX - 6, my, 13, S[0]);
    f.spx(7, my - 1, S[0]);
    f.h(CX - 4, my + 1, 9, '#f4f0e0');
    f.h(CX - 4, my + 2, 9, S[0]);
    f.hair('bald', '#3a4a20');
    return f.done();
  },

  // Hoggy Rider : supporter torse nu, crête et barbe noires, short bleu-vert, bracelet doré, pouce levé.
  hoggy: () =>
    person(
      {
        skin: '#6e4228',
        bare: {},
        shoes: '#2a2228',
        shoesOpt: { low: true, lace: false },
        under(f) {
          const P = tones('#1f8a7a');
          const sh = col([[f.beltY, CX - f.tw, CX - 1], [f.legTop + 9, CX - f.tw - 1, CX - 2]]);
          f.part(sh, P);
          f.part(mir(sh), P, { shade: (u) => (u > 0.68 ? 1 : 2) });
        },
        top: '#6e4228',
        deco(f, S) {
          f.sh(2, f.sY + 8, 8, S[1]);
          f.v(CX, f.sY + 4, 5, S[1]);
          f.sh(2, f.sY + 13, 4, S[1]);
          f.px(CX, f.beltY - 4, S[0]);
          f.belt('#16605a', '#e8c040');
        },
        armsOpt: {},
        front(f, S) {
          // le bras droit se lève : on efface celui du gabarit sous l'épaule, puis coude, avant-bras, poing et pouce
          const d = f.p.d;
          for (let y = f.sY + 10; y <= f.beltY + 12; y++) {
            for (let x = CX + f.tw + (y < f.beltY ? 1 : 2); x < W; x++) d[(y * W + x) * 4 + 3] = 0;
          }
          const x0 = CX + f.tw + 4;
          const Rr = (u) => (u > 0.62 ? 1 : 2);
          f.part(col([[f.sY + 7, x0 - 3, x0 + 4], [f.sY + 14, x0 + 1, x0 + 8]]), S, { shade: Rr });
          f.part(box(x0 + 2, f.sY - 3, 7, 15), S, { shade: Rr });
          f.rect(x0 + 2, f.sY - 1, 7, 2, '#e8c040');
          f.h(x0 + 2, f.sY + 1, 7, '#8a6a1c');
          f.part(box(x0 + 3, f.sY - 14, 4, 7), S, { shade: () => 3 });
          f.part(box(x0 + 1, f.sY - 9, 9, 7), S, { shade: Rr });
          f.h(x0 + 5, f.sY - 7, 4, S[1]);
          f.h(x0 + 5, f.sY - 5, 4, S[1]);
        },
        faceOpt: { mouth: 'none', eyes: 'normal', brow: '#141014' },
        beard: '#16110f',
        beardOpt: { kind: 'full' },
        hair: 'bald',
        hairColor: '#141014',
        over(f) {
          f.part(sym([[0, 1], [3, 2], [f.yH + 6, 2]]), tones('#141014'), { shade: () => 2 });
          f.h(CX - 3, f.ey + 8, 7, '#f8f6ee');
        },
      },
      { sw: 21, tw: 13 },
    ),

  // Le contrôleur : costume gris, casquette, moustache, porte-bloc.
  controleur: () =>
    person({
      skin: '#f6d7c3',
      pants: '#3a3e4a',
      legsOpt: { cuff: false },
      shoes: '#1c1a20',
      shoesOpt: { low: true, lace: false, toe: '#4a4650' },
      top: '#4a4f5c',
      deco(f) {
        const y0 = f.sY;
        for (let j = 0; j < 14; j++) f.h(CX - 5 + Math.floor(j / 3), y0 + j, 11 - Math.floor(j / 3) * 2, '#e8e8f0');
        f.tie('#8a2030');
        for (let j = 0; j < 14; j++) {
          f.px(CX - 6 + Math.floor(j / 3), y0 + j, INK);
          f.px(CX + 6 - Math.floor(j / 3), y0 + j, INK);
        }
        f.v(CX, y0 + 14, f.beltY - y0 - 14, f.P[0]);
        for (let y = y0 + 16; y < f.beltY; y += 4) f.px(CX + 1, y, '#c8a860');
        // galons
        f.h(CX + 5, y0 + 7, 6, '#c8a860');
        f.h(CX + 5, y0 + 9, 6, '#c8a860');
      },
      armsOpt: { sleeve: '#4a4f5c', cuff: '#c8a860' },
      front(f) {
        // porte-bloc
        const x = f.hL.x - 5;
        const y = f.hL.y - 14;
        f.part(box(x, y, 12, 15), tones('#8a5e38'), { line: INK, shade: () => 2 });
        f.rect(x + 2, y + 2, 8, 11, '#f0ece0');
        f.rect(x + 4, y - 1, 4, 3, '#a8a8b4');
        for (let i = 0; i < 4; i++) f.h(x + 3, y + 4 + i * 2, 6, '#7a7a86');
      },
      faceOpt: { mouth: 'flat', eyes: 'stern', brow: '#555566' },
      beard: '#555566',
      beardOpt: { kind: 'mustache' },
      hair: 'short',
      hairColor: '#555566',
      over: (f) => {
        f.glasses();
        f.cap('#262a33', { badge: '#c8a860' });
      },
    }),

  // Zemmour : petit, dégarni, costume sombre et cravate, sourcils froncés.
  zemmour: () =>
    person(
      {
        skin: '#e8c2a4',
        pants: '#23252e',
        legsOpt: { cuff: false },
        shoes: '#1c1a20',
        shoesOpt: { low: true, lace: false, toe: '#4a4650' },
        top: '#2e313c',
        deco(f) {
          const y0 = f.sY;
          for (let j = 0; j < 14; j++) f.h(CX - 5 + Math.floor(j / 3), y0 + j, 11 - Math.floor(j / 3) * 2, '#e8e8f0');
          f.tie('#6a3a9a');
          for (let j = 0; j < 14; j++) {
            f.px(CX - 6 + Math.floor(j / 3), y0 + j, INK);
            f.px(CX + 6 - Math.floor(j / 3), y0 + j, INK);
          }
          f.v(CX, y0 + 14, f.beltY - y0 - 14, f.P[0]);
        },
        armsOpt: { sleeve: '#2e313c' },
        faceOpt: { mouth: 'flat', eyes: 'stern', brow: '#2a2422' },
        hair: 'bald',
        hairColor: '#8a8a90',
        over(f) {
          f.rect(CX - f.headW, f.yH + 8, 2, 7, '#8a8a90');
          f.rect(CX + f.headW - 1, f.yH + 8, 2, 7, '#8a8a90');
        },
      },
      { legH: 14, torsoH: 18 },
    ),

  // Jacky : capuche, cernes violets, sourire troué, sac plastique « tombé du camion ».
  toxico: () =>
    person(
      {
        skin: '#d8c4b0',
        back(f) {
          // capuche relevée
          f.part(sym([[f.yH - 1, 7], [f.yH + 3, 12], [f.yH + 19, 12], [f.yH + 25, 8]]), tones('#565664'));
        },
        pants: '#2e2e3a',
        legsOpt: { cuff: false },
        shoes: '#e8e8ec',
        shoesOpt: { low: true, sole: '#c8c8d0', lace: '#9a9aa8' },
        under(f) {
          // bandes du survêtement
          f.sv(f.tw - 1, f.legTop + 2, f.legH - 2, '#e8e8f0');
        },
        top: '#6a6a7a',
        deco(f) {
          f.pocket(-6, f.sY + 11, 13, 6, false);
          f.v(CX - 2, f.sY + 3, 6, '#d8d8e0');
          f.v(CX + 2, f.sY + 3, 5, '#d8d8e0');
        },
        armsOpt: { sleeve: '#6a6a7a' },
        front(f) {
          // sac plastique
          const x = f.hL.x - 4;
          const y = f.hL.y + 1;
          f.part(col([[y, x + 2, x + 6], [y + 3, x, x + 8], [y + 9, x + 1, x + 8]]), tones('#e8e2c8'), { line: INK, shade: (u) => (u > 0.6 ? 1 : 2) });
          f.h(x + 2, y + 5, 4, '#c03030');
        },
        faceOpt: { eyes: 'tired', mouth: 'grin' },
        hair: 'short',
        hairColor: '#5a4a3a',
        over(f) {
          const { ey } = f;
          // cernes, une dent en moins, barbe de trois jours
          f.sh(3, ey + 3, 4, '#9a7aa0');
          f.rect(CX + 1, ey + 8, 2, 2, INK);
          for (const s of [-1, 1]) {
            f.px(CX + s * 7, ey + 6, '#8a7a6a');
            f.px(CX + s * 6, ey + 8, '#8a7a6a');
          }
        },
      },
      { tw: 10, sw: 17, armW: 6 },
    ),

  // Kimberley : crinière blonde, lunettes sur la tête, lèvres énormes, téléphone greffé à la main.
  blonde: () =>
    person(
      {
        skin: '#e2a67c',
        hairBack: 36,
        hairColor: '#f2df8a',
        bare: {},
        shoes: '#f8f0f4',
        shoesOpt: { lace: false, sole: '#e04890' },
        under(f) {
          // mini-jupe
          f.part(sym([[f.beltY, f.tw], [f.legTop + 7, f.tw + 2]]), tones('#2a2430'));
        },
        top: '#e04890',
        deco(f, S) {
          f.collar(S, '#e04890');
          // haut trop court : le ventre dépasse
          f.rect(CX - f.tw + 1, f.beltY - 3, f.tw * 2 - 1, 3, S[2]);
          f.h(CX - f.tw, f.beltY - 4, f.tw * 2 + 1, f.P[0]);
          f.px(CX, f.beltY - 2, S[0]);
        },
        front(f) {
          // téléphone
          const x = f.hR.x - 3;
          const y = f.hR.y - 11;
          f.part(box(x, y, 7, 10), tones('#f0a0c8'), { line: INK, shade: () => 3 });
          f.rect(x + 1, y + 1, 2, 2, INK);
          // ongles
          f.h(f.hL.x - 2, f.hL.y, 4, '#e04890');
        },
        faceOpt: { eyes: 'calm', mouth: 'none' },
        hair: 'long',
        over(f) {
          const { ey, yH } = f;
          // lèvres
          f.rect(CX - 3, ey + 7, 7, 3, '#e03070');
          f.h(CX - 2, ey + 8, 5, '#8a1840');
          f.px(CX - 2, ey + 7, '#f890b8');
          // lunettes de soleil relevées
          f.rect(CX - 8, yH + 2, 7, 3, INK);
          f.rect(CX + 2, yH + 2, 7, 3, INK);
          f.h(CX - 1, yH + 3, 3, INK);
          f.px(CX - 6, yH + 3, '#8a8aa8');
          f.px(CX + 4, yH + 3, '#8a8aa8');
          // créoles
          for (const s of [-1, 1]) {
            f.v(CX + s * (f.headW + 2), yH + 16, 4, '#f0c840');
            f.v(CX + s * (f.headW + 3), yH + 17, 2, '#f0c840');
          }
        },
      },
      { tw: 10, sw: 16, armW: 6 },
    ),

  // Sergent Marcel : béret rouge, moustache blanche, veste kaki, médailles et canne.
  veteran: () =>
    person(
      {
        skin: '#e0b090',
        pants: '#4a5630',
        shoes: '#2a2420',
        top: '#5a6a3a',
        deco(f) {
          const P = f.P;
          f.sh(1, f.sY + 2, 6, P[0]);
          f.sh(1, f.sY + 3, 4, P[1]);
          f.buttons('#d8c070', 5);
          f.pocket(-10, f.sY + 9, 7, 6);
          // rangée de médailles
          const y = f.sY + 7;
          for (const [i, c] of [[0, '#c03030'], [3, '#3058c0'], [6, '#e8e0d0']]) {
            f.rect(CX + 3 + i, y, 2, 3, c);
            f.rect(CX + 3 + i, y + 3, 2, 2, '#e8c040');
          }
          f.belt('#3a2a1a', '#d8c070');
        },
        armsOpt: { sleeve: '#5a6a3a' },
        front(f) {
          // canne
          const x = f.hR.x + 4;
          f.v(x, f.hR.y - 5, f.foot - f.hR.y + 6, '#6a4a2a');
          f.v(x + 1, f.hR.y - 5, f.foot - f.hR.y + 6, '#3a2616');
          f.h(x - 3, f.hR.y - 6, 5, '#6a4a2a');
        },
        faceOpt: { eyes: 'stern', mouth: 'none' },
        beard: '#ececec',
        beardOpt: { kind: 'mustache' },
        hair: 'short',
        hairColor: '#d8d8d8',
        over(f) {
          const y = f.yH;
          // béret rouge penché
          f.part(col([[y - 2, CX - 5, CX + 9], [y + 1, CX - 10, CX + 14], [y + 4, CX - 10, CX + 14], [y + 6, CX - 10, CX + 10]]), tones('#9a2a2a'), {
            shade: (u) => (u > 0.75 ? 1 : u < 0.25 ? 3 : 2),
          });
          f.rect(CX - 7, y + 2, 3, 3, '#e8c040');
        },
      },
      { tw: 13 },
    ),

  // Le Roi Pigeon : pigeon royal, couronne, cape d'hermine, sceptre.
  pigeon: () => {
    const f = new Fig({ tw: 14, sw: 18, armW: 7, headW: 8, torsoH: 24, legH: 13, bootH: 6 });
    const y = f.yH + 2;
    const Gr = tones('#7a8aa8');
    // cape
    const Cp = tones('#b02a3a');
    f.part(sym([[f.sY, 12], [f.sY + 6, 22], [f.foot - 8, 25]]), Cp, { shade: (u, x) => (x % 7 === 0 ? 1 : u > 0.74 ? 1 : 2) });
    // pattes
    const Le = tones('#e07a3a');
    for (const s of [-1, 1]) {
      f.rect(CX + s * 7 - 1, f.bootTop - 6, 3, 10, Le[2]);
      f.v(CX + s * 7 + 1, f.bootTop - 6, 10, Le[1]);
      for (let i = 0; i < 3; i++) f.h(CX + s * 7 - 4, f.foot - 2 + i - 1, 9, i === 1 ? Le[2] : Le[1]);
      f.px(CX + s * 7 - 5, f.foot, INK);
      f.px(CX + s * 7, f.foot, INK);
      f.px(CX + s * 7 + 5, f.foot, INK);
    }
    // corps dodu
    f.part(sym([[f.sY, 9], [f.sY + 8, 16], [f.beltY, 17], [f.legTop + 6, 14], [f.legTop + 11, 8]]), Gr, {
      shade: (u, x, yy) => {
        if (yy > f.beltY - 4 && u > 0.25 && u < 0.75) return 3;
        return (x * 2 + yy * 3) % 11 === 0 ? 1 : u > 0.76 ? 1 : u < 0.16 ? 3 : 2;
      },
    });
    // ailes-bras
    const wing = col([[f.sY + 3, CX - 16, CX - 9], [f.beltY - 6, CX - 20, CX - 11], [f.beltY + 6, CX - 19, CX - 14]]);
    const stripes = (u, x, yy) => (yy > f.beltY - 6 && (yy - f.beltY) % 5 === 0 ? '#2a3044' : u > 0.7 ? 1 : 2);
    f.part(wing, tones('#6a7a98'), { shade: stripes });
    f.part(mir(wing), tones('#6a7a98'), { shade: stripes });
    // sceptre
    f.v(CX + 19, f.sY - 2, 44, '#c89a30');
    f.v(CX + 20, f.sY - 2, 44, '#7a5a18');
    f.part(disc(CX + 20, f.sY - 5, 3), tones('#e8c040'), { line: INK, shade: (u) => (u < 0.4 ? 4 : 2) });
    // hermine
    const Er = tones('#f0ece4');
    f.part(sym([[f.sY - 2, 8], [f.sY + 3, 13], [f.sY + 5, 12]]), Er, { line: Er[1], shade: (u, x, yy) => ((x + yy) % 5 === 0 ? '#22202a' : 3) });
    // cou irisé et tête
    const Ne = tones('#6a5aa0');
    f.part(sym([[y + 14, 7], [f.sY + 1, 8]]), Ne, { shade: (u, x, yy) => ((x + yy) % 4 < 2 ? '#4a9a7a' : 2) });
    f.part(sym([[y + 1, 3], [y + 4, 7], [y + 10, 8], [y + 16, 7], [y + 20, 5]]), Gr, { shade: (u) => (u > 0.76 ? 1 : u < 0.16 ? 3 : 2) });
    for (const s of [-1, 1]) {
      f.part(disc(CX + s * 4, y + 9, 2.4), tones('#f09040'), { line: INK, shade: () => 2 });
      f.px(CX + s * 4, y + 9, INK);
      f.px(CX + s * 4 - 1, y + 8, '#ffe8c0');
    }
    f.stamps.push([CX - 4, y + 9, INK], [CX + 4, y + 9, INK]);
    // bec
    const Bk = tones('#5a5a62');
    f.part(sym([[y + 11, 3], [y + 14, 3], [y + 18, 1]]), Bk, { line: INK, shade: (u) => (u < 0.5 ? 3 : 1) });
    f.h(CX - 2, y + 11, 5, '#f0ece4');
    // couronne
    const Go = tones('#e8c040');
    f.part(sym([[y - 2, 6], [y + 2, 6]]), Go, { line: INK, shade: () => 3 });
    for (const dx of [-5, 0, 5]) {
      f.v(CX + dx, y - 6, 4, Go[3]);
      f.px(CX + dx - 1, y - 4, Go[1]);
      f.px(CX + dx + 1, y - 4, Go[1]);
      f.px(CX + dx, y - 7, '#e04050');
    }
    f.px(CX, y, '#3a74d0');
    return f.done();
  },

  // Maître Biquette : chèvre debout en robe d'avocate, rabat blanc, dossier sous le bras.
  chevre: () => {
    const f = new Fig({ tw: 10, sw: 15, armW: 5, headW: 8, torsoH: 19, legH: 16, bootH: 7 });
    const Fur = tones('#d8d2c0');
    const leg = col([[f.legTop, CX - 9, CX - 3], [f.bootTop + 3, CX - 9, CX - 4]]);
    f.part(leg, Fur);
    f.part(mir(leg), Fur, { shade: (u) => (u > 0.6 ? 1 : 2) });
    f.hooves('#3a3438');
    // robe noire jusqu'aux sabots
    f.skirt('#2a2834', { flare: 4, to: f.bootTop, hem: '#16141c' });
    f.torso('#2a2834');
    const P = f.P;
    for (const dx of [-8, -1, 7]) f.v(CX + dx, f.beltY + 3, f.bootTop - f.beltY - 6, P[3]);
    f.neck(Fur);
    f.arms(Fur, { sleeve: '#22202a', hand: tones('#3a3438') });
    // rabat blanc à deux pans
    f.rect(CX - 4, f.sY + 2, 9, 2, '#f6f2ea');
    f.rect(CX - 4, f.sY + 4, 4, 7, '#f6f2ea');
    f.rect(CX + 1, f.sY + 4, 4, 7, '#f6f2ea');
    f.h(CX - 4, f.sY + 11, 4, INK);
    f.h(CX + 1, f.sY + 11, 4, INK);
    // dossier sous le bras, un coin en moins
    const dx = f.hL.x - 4;
    const dy = f.hL.y - 12;
    f.part(box(dx, dy, 10, 13), tones('#d8b048'), { line: INK, shade: () => 2 });
    f.rect(dx + 2, dy + 4, 6, 3, '#f6f2ea');
    f.h(dx + 3, dy + 5, 4, '#8a8478');
    f.rect(dx + 7, dy, 3, 3, P[2]);
    f.px(dx + 6, dy, INK);
    f.px(dx + 7, dy + 2, INK);
    f.px(dx + 8, dy + 3, INK);
    // tête longue
    const y = f.yH;
    const Hn = tones('#a8a090');
    for (const s of [-1, 1]) {
      for (let i = 0; i < 10; i++) {
        const x = CX + s * (5 + Math.round(i * i * 0.1));
        f.rect(x - 1, y + 3 - i, 3, 1, i % 3 === 0 ? Hn[1] : Hn[3]);
        f.px(x + 2 * s, y + 3 - i, INK);
        f.px(x - 2 * s, y + 3 - i, INK);
      }
      f.h(s < 0 ? CX - 15 : CX + 9, y + 9, 7, Fur[0]);
      f.rect(s < 0 ? CX - 15 : CX + 9, y + 10, 7, 3, Fur[s < 0 ? 3 : 2]);
      f.h(s < 0 ? CX - 15 : CX + 9, y + 13, 7, Fur[0]);
    }
    f.part(sym([[y + 1, 5], [y + 4, 8], [y + 13, 8], [y + 20, 6], [y + 26, 4]]), Fur, { shade: (u, x, yy) => ((x * 3 + yy * 5) % 17 === 0 ? 3 : u > 0.78 ? 1 : 2) });
    f.part(sym([[y + 3, 2], [y + 7, 3]]), tones('#a89a84'), { line: null, shade: () => 2 });
    // yeux à pupille horizontale
    for (const s of [-1, 1]) {
      const x = s < 0 ? CX - 7 : CX + 3;
      f.h(x, y + 9, 5, INK);
      f.rect(x, y + 10, 5, 3, '#e8c860');
      f.h(x + 1, y + 11, 3, INK);
      f.h(x, y + 13, 5, Fur[1]);
    }
    f.stamps.push([CX - 5, y + 11, INK], [CX + 5, y + 11, INK]);
    // museau clair, narines et sourire en coin
    f.part(sym([[y + 17, 4], [y + 20, 5], [y + 25, 4]]), tones('#efe6d4'), { line: Fur[0], shade: (u) => (u > 0.75 ? 1 : 2) });
    f.h(CX - 1, y + 19, 3, '#b87a70');
    f.px(CX, y + 20, '#b87a70');
    f.spx(3, y + 19, Fur[0]);
    f.h(CX - 3, y + 23, 7, Fur[0]);
    f.spx(4, y + 22, Fur[0]);
    // barbichette
    f.part(sym([[y + 26, 3], [y + 31, 1]]), Fur, { shade: (u, x, yy) => ((x + yy) % 3 === 0 ? 1 : 3) });
    return f.done();
  },

  // Clara : poule rousse assise sur ses baskets noir et blanc, un billet sous l'aile.
  ronde: () => {
    const f = new Fig({ tw: 14, sw: 18, armW: 7, headW: 7, torsoH: 16, legH: 6, bootH: 9 });
    const Fe = tones('#c8642a');
    const Dk = tones('#a84e1e');
    const y = f.yH;
    const feather = (u, xx, yy) => (u > 0.78 ? 1 : (xx + yy * 2) % 7 === 0 ? 1 : u < 0.2 ? 3 : 2);
    for (const x of [CX - 15, CX + 2]) {
      f.part(box(x, f.bootTop, 14, 9), tones('#f0f0f0'), { line: INK, shade: (u, xx, yy) => (yy < f.bootTop + 5 ? '#1c1c22' : 3) });
      f.h(x + 4, f.bootTop + 2, 6, '#f0f0f0');
      f.h(x + 4, f.bootTop + 4, 6, '#f0f0f0');
    }
    f.part(col([[f.sY + 2, CX + 13, CX + 17], [f.sY + 10, CX + 12, CX + 20], [f.beltY, CX + 13, CX + 19]]), Dk);
    f.part(sym([[f.sY + 2, 5], [f.sY + 7, 12], [f.beltY, 15], [f.bootTop - 3, 15], [f.bootTop, 12]]), Fe, { shade: feather });
    f.rect(CX - 22, f.sY + 11, 9, 5, INK);
    f.rect(CX - 21, f.sY + 12, 7, 3, '#7ab87a');
    f.px(CX - 18, f.sY + 13, '#3e7a48');
    const wing = col([[f.sY + 8, CX - 15, CX - 7], [f.beltY - 1, CX - 16, CX - 6], [f.beltY + 4, CX - 13, CX - 8]]);
    f.part(wing, Dk);
    f.part(mir(wing), Dk);
    f.part(sym([[y + 4, 1], [y + 6, 3], [y + 10, 3]]), tones('#d8302c'), { shade: () => 2 });
    f.part(sym([[y + 9, 4], [y + 12, 6], [y + 18, 7], [y + 23, 6], [f.sY + 4, 5]]), Fe, { shade: feather });
    f.rect(CX - 4, y + 14, 2, 2, INK);
    f.rect(CX + 3, y + 14, 2, 2, INK);
    f.px(CX - 4, y + 14, '#ffffff');
    f.px(CX + 3, y + 14, '#ffffff');
    f.stamps.push([CX - 4, y + 15, INK], [CX + 4, y + 15, INK]);
    f.h(CX - 2, y + 17, 5, '#f0b030');
    f.h(CX - 1, y + 18, 3, '#f0b030');
    f.px(CX, y + 19, '#c8861c');
    f.rect(CX - 1, y + 20, 3, 3, '#d8302c');
    f.px(CX, y + 23, '#a81c1c');
    return f.done();
  },

  // Jacky, des années plus tard : costume noir, cravate dorée, une liasse à la main.
  riche: () =>
    person({
      skin: '#e4c8b0',
      pants: '#1c1c22',
      legsOpt: { cuff: false },
      shoes: '#3a2418',
      shoesOpt: { low: true, lace: false, toe: '#6a4a30' },
      top: '#1c1c22',
      deco(f) {
        const y0 = f.sY;
        for (let j = 0; j < 14; j++) f.h(CX - 5 + Math.floor(j / 3), y0 + j, 11 - Math.floor(j / 3) * 2, '#e8e8f0');
        f.tie('#d8a830');
        for (let j = 0; j < 14; j++) {
          f.px(CX - 6 + Math.floor(j / 3), y0 + j, '#4a4a58');
          f.px(CX + 6 - Math.floor(j / 3), y0 + j, '#4a4a58');
        }
        f.h(CX + 6, y0 + 8, 4, '#d8a830');
      },
      armsOpt: { sleeve: '#1c1c22', cuff: '#f0f0f4' },
      front(f) {
        const { x, y } = f.hL;
        f.rect(x - 4, y - 5, 9, 6, INK);
        f.rect(x - 3, y - 4, 7, 4, '#7ab87a');
        f.v(x, y - 4, 4, '#f0ece0');
      },
      faceOpt: { mouth: 'grin', eyes: 'normal' },
      hair: 'short',
      hairColor: '#4a3a2c',
    }),

  // « Moi à 40 ans » et le conducteur lui-même (pour les images de fin).
  vieux: () => conductorFig(true),
  joueur: () => conductorFig(false),
};

// Voyageurs anonymes, d'après une fiche simple.
function casual(v, i) {
  const tops = [
    { pants: '#3a4050', shoes: '#4a3424' },
    { pants: '#5a4a3e', shoes: '#2a2228', skirt: true },
    { pants: '#3e4a3a', shoes: '#6a4426' },
    { pants: '#2e3448', shoes: '#3a2a30', skirt: true },
  ][i % 4];
  return person(
    {
      skin: v.skin,
      pants: tops.skirt ? null : tops.pants,
      bare: tops.skirt ? { tw: 9 } : null,
      shoes: tops.shoes,
      shoesOpt: { low: true, lace: false },
      under: tops.skirt ? (f) => f.skirt(tops.pants, { flare: 2, to: f.legTop + 10 }) : null,
      hairBack: v.hair === 'long' ? 18 : 0,
      top: v.outfit,
      deco(f, S) {
        f.collar(S, v.outfit);
        f.buttons();
        if (!tops.skirt) f.belt();
      },
      armsOpt: { sleeve: v.outfit, short: i % 2 === 1 },
      faceOpt: { mouth: 'flat', eyes: 'normal' },
      hair: v.hair,
      hairColor: v.hairColor,
    },
    tops.skirt ? { tw: 10, sw: 16, armW: 6 } : {},
  );
}

// ───────────────────────── Réduction pour les quais ─────────────────────────

// Divise par deux en gardant la couleur dominante de chaque bloc, puis retrace le contour.
function half({ raw, stamps, alpha, faceBox }) {
  const nw = W >> 1;
  const nh = H >> 1;
  const q = new Pix(nw, nh);
  for (let y = 0; y < nh; y++)
    for (let x = 0; x < nw; x++) {
      const seen = new Map();
      let n = 0;
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++) {
          const o = ((y * 2 + j) * W + x * 2 + i) * 4;
          if (raw.d[o + 3] < 128) continue;
          n++;
          const k = (raw.d[o] << 16) | (raw.d[o + 1] << 8) | raw.d[o + 2];
          seen.set(k, (seen.get(k) ?? 0) + 1);
        }
      if (n < 2) continue;
      // Sur le visage, on garde le ton clair : sinon les traits fins virent au masque noir.
      const inFace = faceBox && x * 2 >= faceBox.x0 && x * 2 <= faceBox.x1 && y * 2 >= faceBox.y0 && y * 2 <= faceBox.y1;
      let best = -1;
      let bestScore = -1;
      for (const [k, c] of seen) {
        const lum = ((k >> 16) & 255) * 0.3 + ((k >> 8) & 255) * 0.59 + (k & 255) * 0.11;
        const score = inFace ? (lum < 40 ? 0 : c * 1000 + lum) : c * 1000 + (255 - lum);
        if (score > bestScore) {
          bestScore = score;
          best = k;
        }
      }
      const o = (y * nw + x) * 4;
      q.d[o] = best >> 16;
      q.d[o + 1] = (best >> 8) & 255;
      q.d[o + 2] = best & 255;
      q.d[o + 3] = 255;
    }
  for (const [x, y, c] of stamps) {
    const [r, g, b] = rgb(c);
    const o = ((y >> 1) * nw + (x >> 1)) * 4;
    if (q.d[o + 3]) {
      q.d[o] = r;
      q.d[o + 1] = g;
      q.d[o + 2] = b;
    }
  }
  q.outline(1, { ink: INK });
  if (alpha) {
    // même effacement que la grande version, à l'échelle
    for (let yy = 0; yy < nh; yy++) {
      const a = yy < 25 ? 0.92 : Math.max(0.35, 0.92 - (yy - 25) / 20);
      for (let x = 0; x < nw; x++) q.d[(yy * nw + x) * 4 + 3] *= a;
    }
  }
  return q;
}

// Un personnage sans dessin dans ROSTER prend le modèle générique, habillé d'après son `look`.
const GENERIC = { skin: '#c99a72', hair: 'short', hairColor: '#3a2e26', outfit: '#5f6e82' };

export function heroOf(id, look = {}) {
  if (ROSTER[id]) return ROSTER[id]();
  const variant = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return casual({ ...GENERIC, ...look }, variant);
}

export function heroAnon(v, i) {
  return casual(v, i);
}

export const heroSmall = half;
export const HERO_IDS = Object.keys(ROSTER);
