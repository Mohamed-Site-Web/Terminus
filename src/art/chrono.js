// Le Néant du terminus : le temps s'y est arrêté. La voie traverse un cadran géant posé dans la nuit,
// bloqué sur dix heures dix, entre deux bancs de sable du sablier.
// Le sol fait 512×512 : l'écran en montre 480 de large, la voie passe en x = 240.

import { paint, mix, rng, fbm, ramp } from './draw.js';
import { INK } from './forest.js';

const G = 512;
const CX = 240;
const CY = 256;
const RING = 222; // rayon extérieur du cadran

export const BRASS = ['#4a3214', '#7a5a22', '#b08a3a', '#dcb55a', '#fbe8a0'];
const NIGHT = ['#080a20', '#0c0f2c', '#121638', '#1a1f4a'];
const SAND = ['#8a6c3c', '#b08e52', '#cfae6e', '#e6cb8e', '#f6e4b4'];

// Chiffres romains, sur 5×9, agrandis deux fois sur le cadran.
const GLYPHS = {
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '.#.#.', '..#..', '..#..'],
  X: ['#...#', '#...#', '.#.#.', '.#.#.', '..#..', '.#.#.', '.#.#.', '#...#', '#...#'],
};
const HOURS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

function numeral(p, cx, cy, text, scale = 2) {
  const w = text.length * 5 * scale + (text.length - 1) * 2;
  let x = Math.round(cx - w / 2);
  const y = Math.round(cy - (9 * scale) / 2);
  for (const ch of text) {
    GLYPHS[ch].forEach((row, j) => {
      for (let i = 0; i < 5; i++)
        if (row[i] === '#') {
          p.rect(x + i * scale + 1, y + j * scale + 1, scale, scale, '#05061a');
          p.rect(x + i * scale, y + j * scale, scale, scale, j < 2 ? BRASS[4] : BRASS[3]);
        }
    });
    x += 5 * scale + 2;
  }
}

// Une aiguille : losange effilé en laiton, avec son ombre décalée.
function hand(p, angle, len, width) {
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const spade = len * 0.72;
  const body = (ox, oy, c, c2) => {
    for (let t = 0; t < len; t += 0.5) {
      let hw = width * (1 - t / len) * 0.55 + 1;
      if (t > spade) hw = (len - t) * 0.5 + 0.5;
      else if (t > spade - width * 2) hw += (t - spade + width * 2) * 0.55;
      for (let s = -hw; s <= hw; s += 0.5) {
        const x = CX + ox + dx * t - dy * s;
        const y = CY + oy + dy * t + dx * s;
        p.set(x, y, s < 0 ? c : c2);
      }
    }
  };
  body(3, 4, '#05061a', '#05061a');
  body(0, 0, BRASS[3], BRASS[2]);
}

export function chronoGround(scene) {
  paint(
    scene,
    'ground_void',
    G,
    G,
    (p) => {
      const r = rng(61);
      const n = fbm(G, G, 61, [128, 64, 32]);
      const ripple = fbm(G, G, 62, [32, 16]);

      for (let y = 0; y < G; y++)
        for (let x = 0; x < G; x++) {
          const v = n(x, y);
          let c = v < 0.42 ? NIGHT[0] : v < 0.58 ? NIGHT[1] : v < 0.7 ? NIGHT[2] : NIGHT[3];

          // le sable du sablier, en banc ondulé entre deux cadrans
          const edge = 24 + Math.sin(x * 0.028) * 9 + Math.sin(x * 0.09 + 1) * 3;
          const dy = Math.min(y, G - y);
          if (dy < edge) {
            const wave = Math.sin((y + Math.sin(x * 0.05) * 7) * 0.8) + (ripple(x, y) - 0.5) * 2;
            c = dy > edge - 2 ? SAND[0] : wave > 0.8 ? SAND[3] : wave > -0.5 ? SAND[2] : SAND[1];
          }

          // le cadran
          const d = Math.hypot(x + 0.5 - CX, y + 0.5 - CY);
          if (d < RING) {
            const a = Math.atan2(y + 0.5 - CY, x + 0.5 - CX);
            const lit = -(Math.cos(a) + Math.sin(a)) * 0.5; // lumière en haut à gauche
            if (d >= RING - 16) {
              const bevel = d > RING - 3 ? -1 : d < RING - 13 ? 1 : 0;
              c = BRASS[Math.max(0, Math.min(4, Math.round(2 + lit * 1.4 + bevel)))];
            } else if (d >= RING - 19) c = '#05061a';
            else {
              // le fond du cadran : émail bleu nuit à rayons très fins
              const ray = Math.floor((a + Math.PI) * 48) % 2;
              c = mix(ray ? '#161c50' : '#1a2158', '#2a3478', Math.max(0, 0.4 - d / RING) * 0.8);
            }
          }
          p.set(x, y, c);
        }

      // poussière du néant et grains de sable égarés
      for (let i = 0; i < 260; i++) {
        const x = Math.floor(r() * G);
        const y = Math.floor(r() * G);
        const d = Math.hypot(x - CX, y - CY);
        const dy = Math.min(y, G - y);
        if (d > RING + 2 && dy > 34) p.set(x, y, i % 5 === 0 ? '#f4eed4' : '#7a7ab0');
        if (d < RING - 22 && i % 3 === 0) p.set(x, y, '#3a4490');
      }

      // rivets sur l'anneau, graduations, chiffres
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2 + 0.087;
        const x = CX + Math.cos(a) * (RING - 8);
        const y = CY + Math.sin(a) * (RING - 8);
        p.rect(x - 1, y - 1, 3, 3, BRASS[0]);
        p.set(x - 1, y - 1, BRASS[4]);
      }
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const major = i % 5 === 0;
        const r0 = RING - (major ? 36 : 28);
        for (let t = r0; t < RING - 22; t += 0.5) {
          const x = CX + Math.cos(a) * t;
          const y = CY + Math.sin(a) * t;
          p.set(x, y, major ? BRASS[3] : BRASS[1]);
          if (major) p.set(x + 1, y, BRASS[2]);
        }
      }
      HOURS.forEach((h, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        numeral(p, CX + Math.cos(a) * 158, CY + Math.sin(a) * 158, h);
      });
      for (let t = 0; t < Math.PI * 2; t += 0.004) {
        p.set(CX + Math.cos(t) * 128, CY + Math.sin(t) * 128, BRASS[1]);
        p.set(CX + Math.cos(t) * 62, CY + Math.sin(t) * 62, BRASS[1]);
      }

      // bloquée sur dix heures dix
      hand(p, (-60 * Math.PI) / 180, 118, 12);
      hand(p, (60 * Math.PI) / 180, 136, 9);
    },
    { wrap: true },
  );
}

// Un rouage vu de dessus : dents carrées, rayons évidés, biseau éclairé en haut à gauche.
function gear(p, cx, cy, R, teeth, spokes = 5) {
  const body = R - 3;
  for (let y = Math.floor(cy - R - 1); y <= cy + R + 1; y++)
    for (let x = Math.floor(cx - R - 1); x <= cx + R + 1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const tooth = Math.cos(a * teeth) > 0;
      if (d > (tooth ? R : body)) continue;
      if (d < R * 0.14) continue; // l'axe
      const inWindow = d > R * 0.34 && d < body * 0.72 && Math.cos(a * spokes) < 0.45;
      if (spokes && inWindow) continue;
      const lit = -(dx + dy) / (R * 1.5);
      let k = 2 + (lit > 0.18 ? 1 : lit < -0.18 ? -1 : 0);
      if (d > body - 2 && d <= body) k += lit > 0 ? 1 : -1;
      if (d < R * 0.22) k = 4;
      p.set(x, y, BRASS[Math.max(0, Math.min(4, k))]);
    }
}

export function chronoDecor(d) {
  d('gear_big', 56, 56, (p) => {
    p.shadow(30, 32, 25, 25, 0.35, '#03040f');
    gear(p, 27.5, 27.5, 26, 12);
    p.outline(0.7, { ink: INK });
  });
  d('gear_small', 30, 30, (p) => {
    p.shadow(16, 17, 13, 13, 0.35, '#03040f');
    gear(p, 14.5, 14.5, 13.5, 8, 4);
    p.outline(0.7, { ink: INK });
  });
  // Le grand sablier : le sable monte au lieu de descendre.
  d('hourglass', 30, 50, (p, r) => {
    p.shadow(16, 46, 12, 3, 0.4, '#03040f');
    const glass = (y) => 2 + Math.abs(y - 25) * 0.46;
    for (let y = 7; y < 43; y++) {
      const hw = glass(y);
      for (let x = Math.round(15 - hw); x <= Math.round(14 + hw); x++) p.set(x, y, '#2a3478');
      p.set(Math.round(15 - hw), y, '#a8c0ff');
      p.set(Math.round(14 + hw), y, '#5a6ac0');
    }
    // sable en haut (il remonte), un filet qui passe par le col, un reste en bas
    for (let y = 9; y < 21; y++) {
      const hw = glass(y) - 1;
      for (let x = Math.round(15 - hw); x <= Math.round(14 + hw); x++) p.set(x, y, x < 15 ? SAND[3] : SAND[2]);
    }
    p.hline(10, 9, 10, SAND[4]);
    p.vline(14, 21, 13, SAND[3]);
    p.vline(15, 21, 13, SAND[4]);
    p.rect(11, 38, 8, 3, SAND[2]);
    p.hline(12, 37, 6, SAND[3]);
    for (let i = 0; i < 5; i++) p.set(11 + r() * 8, 26 + r() * 10, SAND[4]);
    // socle et chapeau
    for (const y of [2, 43]) {
      p.rect(4, y, 22, 5, BRASS[2]);
      p.hline(4, y, 22, BRASS[4]);
      p.hline(4, y + 4, 22, BRASS[0]);
      p.vline(4, y, 5, BRASS[3]);
    }
    p.vline(6, 7, 36, BRASS[2]);
    p.vline(23, 7, 36, BRASS[1]);
    p.outline(0.7, { ink: INK });
  });
  // L'horloge de parquet : le balancier s'est arrêté en plein vol.
  d('grandfather', 24, 58, (p) => {
    p.shadow(13, 54, 10, 3, 0.4, '#03040f');
    const wood = ramp('#20285c', 5, 0.06);
    p.rect(5, 6, 14, 48, wood[2]);
    p.vline(5, 6, 48, wood[4]);
    p.vline(18, 6, 48, wood[0]);
    p.rect(3, 2, 18, 4, wood[3]);
    p.hline(3, 2, 18, BRASS[3]);
    p.rect(3, 50, 18, 6, wood[1]);
    p.hline(3, 50, 18, wood[3]);
    p.ellipse(12, 15, 6.5, 6.5, BRASS[2]);
    p.ellipse(12, 15, 5, 5, '#f0e8cc');
    p.line(12, 15, 9, 12, '#14101a');
    p.line(12, 15, 15, 12, '#14101a');
    p.rect(9, 26, 6, 20, '#0c0f2c');
    p.line(12, 26, 14, 40, BRASS[3]);
    p.ellipse(14, 41, 2.5, 2.5, BRASS[4]);
    p.outline(0.7, { ink: INK });
  });
  // La montre molle, qui coule du socle.
  d('clock', 30, 34, (p) => {
    p.shadow(18, 30, 11, 3, 0.4, '#03040f');
    p.blob(14, 13, 12, 12, BRASS, { flat: 0.6 });
    p.ellipse(14, 13, 9.5, 9.5, '#f0e8cc');
    p.rect(10, 20, 7, 8, '#f0e8cc');
    p.ellipse(13, 28, 3.5, 2.5, '#f0e8cc');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      p.set(14 + Math.cos(a) * 8, 13 + Math.sin(a) * 8, '#5a5048');
    }
    p.line(14, 13, 14, 7, '#14101a');
    p.line(14, 13, 18, 16, '#14101a');
    p.outline(0.6, { ink: INK });
  });
  // Le cadran solaire : son ombre pointe vers le terminus, quelle que soit l'heure.
  d('sundial', 38, 26, (p) => {
    p.shadow(20, 21, 17, 4, 0.4, '#03040f');
    const stone = ramp('#8a86a8', 5, 0.08);
    p.ellipse(18.5, 16, 17, 7, stone[1]);
    p.ellipse(18.5, 13, 17, 7, stone[3]);
    p.ellipse(18.5, 13, 14, 5.5, stone[4]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      p.set(18.5 + Math.cos(a) * 12, 13 + Math.sin(a) * 4.6, stone[0]);
    }
    p.line(18, 13, 30, 12, '#2a2848');
    for (let i = 0; i < 7; i++) p.vline(18 - i, 13 - 7 + i, 7 - i, i < 3 ? BRASS[3] : BRASS[2]);
    p.outline(0.7, { ink: INK });
  });

  // ── petits éléments au sol ──
  d('cog', 11, 11, (p) => {
    gear(p, 5.5, 5.5, 5, 6, 0);
    p.outline(0.6, { ink: INK });
  });
  d('sand_mound', 14, 6, (p) => {
    p.ellipse(7, 4, 6.5, 2, SAND[1]);
    p.ellipse(6.5, 3, 4.5, 1.5, SAND[3]);
    p.set(6, 2, SAND[4]);
  });
  d('fallen_hand', 18, 5, (p) => {
    p.hline(1, 3, 15, '#03040f', 0.4);
    p.hline(1, 2, 12, BRASS[3]);
    p.hline(1, 1, 12, BRASS[4]);
    p.rect(12, 0, 3, 4, BRASS[3]);
    p.set(15, 1, BRASS[2]);
    p.outline(0.6, { ink: INK });
  });
}

export const CHRONO_LIGHTS = {
  hourglass: [[15, 25]],
  grandfather: [[12, 15]],
};
