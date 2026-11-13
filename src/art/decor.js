// Décors vus de haut en 3/4 (on voit le dessus et la face sud), gares et quais.
// Chaque texture contient sa propre ombre portée (lumière venant d'en haut à gauche).
// Origine des sprites : milieu du bas (la base de l'objet).

import { paint, ramp, mix, rng, bayer } from './draw.js';
import { forestDecor } from './forest.js';
import { realmDecor, REALM_LIGHTS } from './realms.js';
import { generateCottages, cottageLights } from './cottage.js';
import { fieldDecor } from './field.js';
import { stadiumDecor } from './stadium.js';
import { chronoDecor, CHRONO_LIGHTS } from './chrono.js';

// Points lumineux (pixels d'art depuis le coin haut gauche) allumés la nuit.
export const LIGHTS = {
  lamp: [[5, 5]],
  lantern: [[5, 6]],
  ...REALM_LIGHTS,
  ...CHRONO_LIGHTS,
  ...cottageLights(),
};

export function generateDecor(scene) {
  const d = (key, w, h, draw) =>
    paint(scene, key, w, h, (p) => {
      draw(p, rng(key.length * 977 + w * 31 + h));
    });
  vegetation(d);
  forestDecor(d);
  fieldDecor(d);
  realmDecor(d);
  urban(d);
  spooky(d);
  sky(d);
  stadiumDecor(d);
  chronoDecor(d);
  small(d);
  stations(scene, d);
  generateCottages(d);
}

// ── utilitaires ──

function trunk(p, x, y, w, h, pal) {
  for (let i = 0; i < w; i++) {
    const k = Math.round(((w - 1 - i) / Math.max(1, w - 1)) * (pal.length - 2)) + (i === 0 ? 1 : 0);
    for (let j = 0; j < h; j++) p.set(x + i, y + j, pal[Math.min(pal.length - 1, k)]);
  }
  p.set(x - 1, y + h - 1, pal[1]);
  p.set(x + w, y + h - 1, pal[0]);
}

// Feuillage en grappes : les blobs du bas d'abord, ceux du haut par-dessus.
function foliage(p, blobs, pal, r, grain = 0.18) {
  [...blobs]
    .sort((a, b) => b[1] - a[1])
    .forEach(([x, y, rx, ry, bias = 0]) => p.blob(x, y, rx, ry, pal, { r, grain, bias }));
  // petites touffes de feuilles claires sur le dessus
  for (const [x, y, rx, ry] of blobs) {
    for (let i = 0; i < (rx * ry) / 6; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.8;
      const px = x + Math.cos(a) * rx * d;
      const py = y + Math.sin(a) * ry * d;
      if (p.alpha(px, py) && py < y) p.set(px, py, pal[Math.min(pal.length - 1, pal.length - 1 - Math.floor(r() * 2))]);
    }
  }
}

function stoneBlock(p, x, y, w, h, top, front, r) {
  p.rect(x, y, w, h, front[2]);
  for (let j = 0; j < h; j++) p.hline(x, y + j, w, front[Math.max(0, 3 - Math.floor((j / h) * 3))]);
  p.vline(x, y, h, front[3]);
  p.vline(x + w - 1, y, h, front[0]);
  if (top) {
    p.rect(x, y - top.h, w, top.h, top.pal[3]);
    p.hline(x, y - top.h, w, top.pal[4]);
  }
  for (let i = 0; i < (w * h) / 10; i++) p.tone(x + r() * w, y + r() * h, (r() - 0.5) * 0.08);
}

// ── végétation ──

function vegetation(d) {
  const bark = ramp('#6e4a32', 5, 0.06);

  d('oak', 44, 48, (p, r) => {
    p.shadow(26, 42, 17, 5.5);
    trunk(p, 19, 30, 5, 13, bark);
    p.set(18, 42, bark[1]);
    p.set(24, 42, bark[0]);
    foliage(
      p,
      [
        [21, 24, 12, 8, -0.12],
        [11, 21, 8, 7, -0.06],
        [32, 21, 8, 7, -0.06],
        [16, 14, 9, 8],
        [27, 13, 9, 8],
        [21, 8, 8, 6, 0.06],
      ],
      ramp('#5f9a3e', 6, 0.06),
      r,
    );
    p.outline(0.55);
  });

  d('tree_round', 30, 38, (p, r) => {
    p.shadow(18, 34, 11, 3.5);
    trunk(p, 13, 24, 3, 11, bark);
    foliage(p, [[15, 16, 10, 9, -0.05], [11, 11, 6, 5], [19, 10, 6, 5]], ramp('#6aa044', 6, 0.06), r);
    p.outline(0.55);
  });

  d('pine', 28, 50, (p, r) => {
    p.shadow(17, 46, 11, 3.5);
    trunk(p, 12, 38, 4, 9, bark);
    const pal = ramp('#2f6a4c', 6, 0.06);
    const tiers = [[38, 12], [30, 10], [22, 8], [14, 6], [7, 4]];
    for (const [base, half] of tiers) {
      const top = base - 13;
      for (let y = top; y <= base; y++) {
        const t = (y - top) / (base - top);
        const hw = Math.max(1, half * t + (y === base ? 0 : 0));
        for (let x = Math.round(14 - hw); x <= Math.round(13 + hw); x++) {
          const notch = y > base - 2 && (x + y) % 3 === 0;
          if (notch) continue;
          const nx = (x - 13.5) / hw;
          const I = 0.62 - nx * 0.42 - (1 - t) * 0.1 + (y === base ? -0.2 : 0) + (r() - 0.5) * 0.12;
          const k = Math.floor(I * pal.length + (bayer(x, y) - 0.5) * 0.9);
          p.set(x, y, pal[Math.max(0, Math.min(pal.length - 1, k))]);
        }
      }
    }
    p.outline(0.55);
  });

  d('bush', 24, 16, (p, r) => {
    p.shadow(14, 13, 10, 3);
    foliage(p, [[12, 10, 8, 5, -0.05], [7, 8, 5, 4], [16, 7, 6, 4.5]], ramp('#62a046', 5, 0.065), r);
    for (let i = 0; i < 5; i++) p.set(5 + r() * 14, 5 + r() * 6, '#e04a3c');
    p.outline(0.55);
  });

  d('hedge', 40, 16, (p, r) => {
    p.shadow(22, 13, 18, 3);
    foliage(p, [[20, 9, 17, 5.5, -0.04], [10, 7, 7, 4], [20, 6, 7, 4], [30, 7, 7, 4]], ramp('#5a9040', 5, 0.06), r);
    p.outline(0.55);
  });

  d('rock', 20, 14, (p, r) => {
    p.shadow(12, 11, 9, 3);
    const pal = ramp('#7d7a74', 5, 0.07);
    p.blob(9, 8, 7.5, 5, pal, { flat: 0.15, grain: 0.15, r });
    p.blob(14, 9, 4.5, 3.5, pal, { flat: 0.2, r });
    p.line(6, 6, 9, 8, pal[1]);
    p.outline(0.55);
  });

  d('mossrock', 22, 15, (p, r) => {
    p.shadow(13, 12, 10, 3);
    p.blob(10, 9, 8, 5.5, ramp('#6e6c64', 5, 0.07), { flat: 0.15, grain: 0.15, r });
    const moss = ramp('#6a9a3a', 4, 0.06);
    for (let y = 3; y < 9; y++)
      for (let x = 3; x < 17; x++) if (p.alpha(x, y) && !p.alpha(x, y - 3) && r() < 0.7) p.set(x, y, moss[Math.floor(r() * 4)]);
    p.outline(0.55);
  });

  d('stump', 18, 15, (p, r) => {
    p.shadow(11, 12, 8, 2.5);
    const side = ramp('#5d4634', 5, 0.06);
    p.cylinderV(3, 6, 12, 6, side);
    p.ellipse(9, 6, 6, 3, '#a68a62');
    p.ellipse(9, 6, 4, 2, '#8e744f');
    p.ellipse(9, 6, 2, 1, '#a68a62');
    p.set(9, 6, '#6e5a3e');
    p.set(2, 11, side[1]);
    p.set(15, 11, side[0]);
    p.outline(0.55);
    void r;
  });

  d('fern', 18, 13, (p, r) => {
    const pal = ramp('#64a042', 5, 0.07);
    p.shadow(10, 11, 7, 2);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const len = 6 + r() * 2;
      for (let s = 0; s < len; s++) {
        const x = 9 + Math.cos(a) * s;
        const y = 10 + Math.sin(a) * s * 0.75 + (s * s) / 30;
        p.set(x, y, pal[Math.min(4, 1 + Math.floor((s / len) * 4))]);
        if (s % 2 && s > 1) p.set(x + Math.sin(a), y - Math.cos(a) * 0.5, pal[2]);
      }
    }
    p.outline(0.5);
  });

  d('willow', 40, 46, (p, r) => {
    p.shadow(23, 41, 16, 5);
    trunk(p, 18, 30, 4, 12, bark);
    const pal = ramp('#6c9a44', 6, 0.06);
    foliage(p, [[20, 20, 15, 10, -0.05], [14, 13, 8, 6], [26, 13, 8, 6]], pal, r, 0.12);
    // rideaux de branches tombantes
    for (let x = 6; x < 35; x += 2) {
      const len = 8 + Math.floor(r() * 10);
      for (let j = 0; j < len; j++) if (r() < 0.9) p.set(x + (j > len / 2 ? 1 : 0), 22 + j, pal[j % 3 === 0 ? 3 : 1]);
    }
    p.outline(0.55);
  });

  d('deadtree', 34, 46, (p, r) => {
    p.shadow(20, 42, 11, 3);
    const pal = ramp('#5d554c', 5, 0.07);
    trunk(p, 15, 22, 4, 21, pal);
    const branch = (x, y, a, len, w) => {
      for (let s = 0; s < len; s++) {
        const bx = x + Math.cos(a) * s;
        const by = y + Math.sin(a) * s;
        p.set(bx, by, pal[w > 1 ? 3 : 2]);
        if (w > 1) p.set(bx + 1, by, pal[1]);
      }
      return [x + Math.cos(a) * len, y + Math.sin(a) * len];
    };
    const tips = [
      branch(16, 24, -2.3, 12, 2),
      branch(18, 22, -0.8, 11, 2),
      branch(17, 18, -1.6, 14, 2),
    ];
    for (const [x, y] of tips) {
      branch(x, y, -1.2 - r() * 1.4, 5 + r() * 4, 1);
      branch(x, y, -0.6 - r() * 1.2, 4 + r() * 3, 1);
    }
    p.outline(0.6);
  });

  d('reeds', 18, 24, (p, r) => {
    const stem = ramp('#6f7442', 4, 0.07);
    p.shadow(10, 22, 7, 2);
    for (let i = 0; i < 7; i++) {
      const x = 3 + i * 2 + Math.floor(r() * 2);
      const h = 10 + Math.floor(r() * 10);
      const lean = r() < 0.5 ? -1 : 1;
      for (let j = 0; j < h; j++) p.set(x + (j > h * 0.7 ? lean : 0), 22 - j, stem[j > h / 2 ? 2 : 1]);
      if (i % 2 === 0) {
        p.rect(x + lean, 22 - h - 3, 2, 4, '#5e4532');
        p.set(x + lean, 22 - h - 3, '#7d6047');
      }
    }
    p.outline(0.5);
  });
}

// ── ville ──

function urban(d) {
  d('lamp', 12, 40, (p) => {
    p.line(6, 38, 11, 36, '#10121c', 0.3);
    p.vline(5, 10, 29, '#2c2f36');
    p.vline(6, 10, 29, '#454a54');
    p.rect(4, 37, 4, 2, '#2c2f36');
    p.rect(2, 2, 7, 8, '#2c2f36');
    p.rect(3, 3, 5, 6, '#f2d88e');
    p.rect(3, 3, 2, 6, '#fff0c0');
    p.hline(1, 1, 9, '#454a54');
    p.set(5, 0, '#454a54');
    p.outline(0.55);
  });

  d('bench', 24, 13, (p) => {
    p.rect(4, 10, 18, 2, '#10121c', 0.3);
    const wood = ramp('#9a6a3e', 4, 0.07);
    p.rect(2, 2, 20, 2, wood[3]);
    p.rect(2, 5, 20, 2, wood[2]);
    p.rect(2, 8, 20, 2, wood[1]);
    for (const x of [3, 19]) p.rect(x, 1, 2, 11, '#2c2f36');
    p.outline(0.55);
  });
}

// ── nuit ──

function spooky(d) {
  const stone = ramp('#7a7a80', 5, 0.07);
  d('grave', 16, 20, (p, r) => {
    p.rect(5, 15, 10, 4, '#10121c', 0.3);
    p.rect(2, 16, 12, 2, stone[1]);
    p.ellipse(8, 7, 5.5, 5, stone[3]);
    p.rect(3, 7, 11, 10, stone[3]);
    for (let y = 2; y < 17; y++) for (let x = 3; x < 14; x++) if (p.alpha(x, y)) p.set(x, y, stone[x < 5 ? 4 : x > 11 ? 2 : 3]);
    p.vline(8, 6, 6, stone[1]);
    p.hline(6, 8, 5, stone[1]);
    for (let i = 0; i < 8; i++) p.set(3 + r() * 10, 12 + r() * 5, '#6a9a3e');
    p.outline(0.6);
  });
  d('grave_cross', 14, 22, (p) => {
    p.rect(5, 18, 8, 3, '#10121c', 0.3);
    p.rect(5, 2, 4, 18, stone[3]);
    p.vline(5, 2, 18, stone[4]);
    p.rect(1, 6, 12, 4, stone[3]);
    p.hline(1, 6, 12, stone[4]);
    p.hline(1, 9, 12, stone[1]);
    p.rect(3, 19, 8, 2, stone[1]);
    p.outline(0.6);
  });
  d('lantern', 12, 24, (p) => {
    p.rect(5, 20, 6, 3, '#10121c', 0.3);
    p.rect(4, 12, 4, 10, stone[2]);
    p.vline(4, 12, 10, stone[4]);
    p.rect(2, 3, 8, 8, '#3a3a40');
    p.rect(3, 4, 6, 6, '#f0c870');
    p.rect(3, 4, 2, 6, '#ffe6a6');
    p.rect(1, 1, 10, 2, stone[1]);
    p.outline(0.6);
  });
}

// ── ciel ──

function sky(d) {
  const cloud = ramp('#e2e4f0', 5, 0.055);
  d('cloud', 56, 26, (p, r) => {
    p.shadow(31, 21, 24, 4.5, 0.2, '#4a5a8a');
    const blobs = [[28, 15, 20, 7], [16, 12, 10, 7], [30, 9, 11, 7], [42, 12, 10, 6]];
    for (const [x, y, rx, ry] of blobs) p.blob(x, y, rx, ry, cloud, { r, flat: 0.1 });
    p.outline(0.25, { ink: '#7d86a8' });
  });
  d('balloon', 30, 46, (p, r) => {
    p.shadow(22, 42, 7, 2.5, 0.22, '#4a5a8a');
    const env = ramp('#a8544a', 5, 0.08);
    const env2 = ramp('#d8c48a', 5, 0.07);
    p.blob(14, 14, 12, 13, env, { r });
    for (let y = 1; y < 28; y++)
      for (let x = 2; x < 27; x++) {
        if (!p.alpha(x, y)) continue;
        if (Math.floor((x - 14) / 4 + 10) % 2 === 0) {
          const c = p.color(x, y);
          const lum = (c[0] + c[1] + c[2]) / 765;
          p.set(x, y, env2[Math.max(0, Math.min(4, Math.floor(lum * 6)))]);
        }
      }
    p.line(8, 26, 12, 32, '#4a3a2e');
    p.line(20, 26, 16, 32, '#4a3a2e');
    p.rect(11, 32, 7, 5, '#7a5a3a');
    p.hline(11, 32, 7, '#9a7a52');
    p.outline(0.5);
  });
  d('islet', 58, 44, (p, r) => {
    p.shadow(33, 40, 22, 4, 0.2, '#4a5a8a');
    const rock = ramp('#7a6a5e', 5, 0.07);
    for (let y = 16; y < 36; y++) {
      const hw = 24 * (1 - (y - 16) / 22) ** 0.8;
      for (let x = Math.round(28 - hw); x <= Math.round(28 + hw); x++) p.set(x, y, rock[Math.max(0, Math.min(4, 3 - Math.floor((y - 16) / 6) - (x > 28 ? 1 : 0)))]);
    }
    p.blob(28, 15, 25, 7, ramp('#78ad4a', 5, 0.06), { r, flat: 0.4 });
    foliage(p, [[36, 9, 6, 5], [32, 6, 4, 3.5]], ramp('#5e9a3c', 5, 0.06), r);
    p.outline(0.5);
  });
  d('birds', 26, 14, (p) => {
    const c = '#3a3e4a';
    for (const [x, y] of [[4, 6], [13, 3], [19, 9]]) {
      p.set(x - 2, y - 1, c);
      p.set(x - 1, y, c);
      p.set(x, y + 1, c);
      p.set(x + 1, y, c);
      p.set(x + 2, y - 1, c);
    }
  });
}

// ── petits éléments au sol ──

function small(d) {
  d('tuft', 9, 6, (p, r) => {
    const pal = ramp('#5f7a3e', 4, 0.07);
    for (let i = 0; i < 6; i++) {
      const x = 1 + i + Math.floor(r() * 2);
      const h = 2 + Math.floor(r() * 3);
      for (let j = 0; j < h; j++) p.set(x + (j === h - 1 ? (i < 3 ? -1 : 1) : 0), 5 - j, pal[Math.min(3, j + 1)]);
    }
  });
  d('stone', 6, 5, (p) => {
    p.set(4, 4, '#10121c', 0.3);
    p.blob(2.8, 2.5, 2.5, 1.9, ramp('#85827a', 4, 0.08));
    p.outline(0.5);
  });
  d('flowers', 9, 6, (p) => {
    const g = '#4f6a36';
    for (const [x, y, c] of [[2, 2, '#d9cfb8'], [5, 1, '#c9a858'], [7, 3, '#b49ac4'], [3, 4, '#d9cfb8']]) {
      p.set(x, y + 1, g);
      p.set(x, y, c);
    }
  });
  d('reed_tuft', 8, 9, (p) => {
    for (const x of [1, 3, 4, 6]) {
      const h = 5 + (x % 3);
      p.vline(x, 8 - h, h, '#6f7442');
    }
    p.rect(3, 0, 2, 3, '#5e4532');
  });
  d('lily', 10, 6, (p) => {
    p.ellipse(5, 3, 4.5, 2.5, '#2f3f3e');
    p.ellipse(5, 3, 3.5, 2, '#5f7a3e');
    p.set(5, 3, '#2f3f3e');
    p.set(6, 3, '#2f3f3e');
    p.set(3, 2, '#d8c8d8');
  });
}

// ── gares et quais ──

const PLATFORM_H = 132;
export const PLATFORM = { w: 46, h: PLATFORM_H };

function platformTex(d, key, top, edge, front) {
  d(key, PLATFORM.w, PLATFORM_H + 6, (p, r) => {
    const R = ramp(top, 5, 0.05);
    // ombre portée
    p.rect(4, 6, PLATFORM.w - 4, PLATFORM_H, '#10121c', 0.3);
    for (let y = 0; y < PLATFORM_H; y++)
      for (let x = 0; x < PLATFORM.w - 2; x++) {
        let k = 2 + (bayer(x, y) < 0.12 ? 1 : 0);
        if (key === 'platform_stone' && (y % 10 === 0 || (x + Math.floor(y / 10) * 7) % 14 === 0)) k = 1;
        if (key === 'platform_wood' && x % 6 === 0) k = 0;
        if (key === 'platform_wood' && (y + x * 7) % 31 === 0) k = 1;
        if (key === 'platform_cloud') k = Math.max(0, Math.min(4, 2 + Math.round(Math.sin(x * 0.4 + y * 0.2) + Math.cos(y * 0.35)) + (bayer(x, y) < 0.3 ? 1 : 0)));
        if (key === 'platform_void') k = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 1 : 2;
        p.set(x, y, R[k]);
      }
    // bord du quai côté voie (bande de sécurité) et face sud
    p.rect(0, 0, 3, PLATFORM_H, edge);
    p.vline(3, 0, PLATFORM_H, mix(edge, '#000000', 0.4));
    p.rect(0, PLATFORM_H, PLATFORM.w - 2, 5, front);
    p.hline(0, PLATFORM_H, PLATFORM.w - 2, mix(front, '#ffffff', 0.15));
    for (let i = 0; i < 60; i++) p.tone(4 + r() * (PLATFORM.w - 8), r() * PLATFORM_H, (r() - 0.5) * 0.06);
    p.outline(0.5);
  });
}

function stations(scene, d) {
  platformTex(d, 'platform_stone', '#8f8a80', '#c9b468', '#5d5a55');
  platformTex(d, 'platform_wood', '#7d6248', '#a88a5a', '#4a3a2c');
  platformTex(d, 'platform_cloud', '#dfe2ee', '#ffffff', '#a9b0cc');
  platformTex(d, 'platform_void', '#1c2250', '#dcb55a', '#0c0f2c');
  platformTex(d, 'platform_marble', '#d4d0e2', '#9ad8c0', '#8a86a0');
}
