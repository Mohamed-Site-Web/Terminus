// Biomes ajoutés en V4, dans le même style cel que la forêt : caverne et sylve des elfes.
// Aplats francs, contour encré, lumière en haut à gauche.

import { paint, mix, rng, fbm } from './draw.js';
import { INK, cel, canopy } from './forest.js';

const T = 128;
const ROCK = ['#24222f', '#3b3850', '#56527a', '#7a76a2']; // 0 = ombre, 3 = arête éclairée
const ROCK_WARM = ['#2a2420', '#4a3e36', '#6c5c4e', '#948272'];
const GLOW = ['#1c4a5a', '#2a8a9a', '#56d4d0', '#c8fff4'];
const AMETHYST = ['#3a1f5a', '#6a3a9a', '#a46ad8', '#ecd0ff'];
const MARBLE = ['#8a86a0', '#b8b4cc', '#dcd8ea', '#ffffff'];
const GOLD = ['#5a3a1a', '#8a5a20', '#c08a2a', '#e8b84a', '#fff0a0'];
const LILAC = ['#2e2350', '#4a3a7a', '#6e5aa8', '#9a86d0', '#d8ccff'];
const ELVEN = ['#163a3a', '#22605a', '#2f8a72', '#5cc49a', '#c8f4dc'];

// ───────────────────────── Sols (raccordables) ─────────────────────────

export function realmGrounds(scene) {
  const make = (key, draw) => paint(scene, key, T, T, draw, { wrap: true });
  const each = (p, fn) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) fn(x, y);
  };

  // Caverne : roche bleutée en grandes plaques, fissures encrées, mousse luminescente.
  make('ground_cave', (p) => {
    const r = rng(71);
    const n = fbm(T, T, 71, [64, 32, 16]);
    const tones = ['#1e1c28', '#2a2838', '#323044', '#3c3a52', '#4a4866'];
    each(p, (x, y) => {
      const v = n(x, y);
      p.set(x, y, v < 0.38 ? tones[1] : v < 0.6 ? tones[2] : tones[3]);
    });
    // fissures : marches aléatoires, ombre dessous, arête claire dessus
    for (let i = 0; i < 14; i++) {
      let x = r() * T;
      let y = r() * T;
      let a = r() * Math.PI * 2;
      for (let s = 0; s < 14 + r() * 16; s++) {
        p.set(x, y, tones[0]);
        p.set(x, y - 1, tones[4]);
        a += (r() - 0.5) * 0.9;
        x += Math.cos(a);
        y += Math.sin(a) * 0.7;
      }
    }
    for (let i = 0; i < 260; i++) p.set(r() * T, r() * T, r() < 0.5 ? tones[0] : tones[4]);
    // galets
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      p.hline(x - 1, y + 1, 3, tones[0]);
      p.hline(x - 1, y, 3, tones[3]);
      p.set(x - 1, y - 1, tones[4]);
    }
    // touffes de mousse qui luit
    for (let i = 0; i < 16; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      p.set(x, y, '#2a6a6a');
      p.set(x + 1, y, '#2a6a6a');
      p.set(x, y - 1, '#4ab8b0');
      if (i % 3 === 0) p.set(x + 1, y - 1, '#a8fff0');
    }
  });

  // Sylve : herbe bleu-vert, sentiers de pétales argentés, petites fleurs qui brillent.
  make('ground_sylve', (p) => {
    const r = rng(81);
    const n = fbm(T, T, 81, [64, 32, 16]);
    const m = fbm(T, T, 82, [32, 16]);
    const grass = ['#1e4a44', '#2a5e52', '#33705e', '#3e826a', '#5aa480', '#9ad8b0'];
    each(p, (x, y) => {
      const v = n(x, y);
      p.set(x, y, v < 0.38 ? grass[1] : v < 0.62 ? grass[2] : grass[3]);
      if (m(x, y) > 0.66 && (x + y * 3) % 5 === 0) p.set(x, y, '#c8d8e8'); // pétales argentés
    });
    for (let i = 0; i < 380; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      p.set(x, y, n(x, y) < 0.5 ? grass[0] : grass[4]);
    }
    for (let i = 0; i < 50; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      p.hline(x - 2, y + 1, 5, grass[0]);
      p.set(x - 1, y - 1, grass[4]);
      p.set(x + 1, y - 1, grass[4]);
      p.set(x, y - 2, grass[5]);
    }
    const petals = ['#f4f0ff', '#9af0e0', '#d8b8ff', '#ffe8a0'];
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      const c = petals[i % petals.length];
      p.set(x - 1, y, c);
      p.set(x + 1, y, c);
      p.set(x, y - 1, c);
      p.set(x, y + 1, c);
      p.set(x, y, '#ffffff');
    }
  });

}

// ───────────────────────── Décors ─────────────────────────

// Cône vu en 3/4 (stalagmite) : face gauche éclairée, droite dans l'ombre, pointe claire.
function cone(p, cx, base, w, h, pal, lean = 0) {
  for (let j = 0; j < h; j++) {
    const t = j / h; // 0 = pointe
    const hw = Math.max(0.6, w * t ** 0.85);
    const x0 = cx + lean * (1 - t);
    for (let x = Math.floor(x0 - hw); x <= Math.ceil(x0 + hw); x++) {
      const u = (x + 0.5 - x0) / hw;
      if (Math.abs(u) > 1) continue;
      let k = u < -0.35 ? 3 : u < 0.25 ? 2 : u < 0.7 ? 1 : 0;
      if (j < 2) k = 3;
      p.set(x, base - h + j, pal[k]);
    }
  }
  // anneaux de calcaire
  for (let j = Math.floor(h * 0.4); j < h - 2; j += 5) {
    const t = j / h;
    const hw = w * t ** 0.85;
    const x0 = cx + lean * (1 - t);
    p.hline(Math.round(x0 - hw * 0.6), base - h + j, Math.max(1, Math.round(hw * 0.7)), pal[1]);
  }
}

// Cristal en prisme : facette gauche claire, droite sombre, arête centrale lumineuse.
function prism(p, x, base, w, h, pal, slant = 0) {
  for (let j = 0; j < h; j++) {
    const tip = Math.min(1, j / (w * 0.9)); // pointe en losange
    const hw = Math.max(0.5, (w / 2) * tip);
    const cx = x + slant * (h - j) / h;
    for (let i = Math.floor(cx - hw); i <= Math.ceil(cx + hw); i++) {
      const u = (i + 0.5 - cx) / hw;
      if (Math.abs(u) > 1) continue;
      p.set(i, base - h + j, Math.abs(u) < 0.2 ? pal[3] : u < 0 ? pal[2] : pal[1]);
    }
  }
}

export function realmDecor(d) {
  // ── Caverne ──
  d('stalag', 30, 40, (p, r) => {
    p.shadow(17, 36, 12, 4, 0.4);
    cone(p, 16, 37, 8, 34, ROCK, r() * 2 - 1);
    cone(p, 8, 38, 5, 18, ROCK, -1);
    cone(p, 23, 39, 4.5, 14, ROCK, 1);
    p.outline(0.7, { ink: INK });
  });
  d('stalag_s', 16, 22, (p, r) => {
    p.shadow(9, 19, 6, 2.5, 0.4);
    cone(p, 8, 20, 4.5, 18, ROCK_WARM, r() - 0.5);
    p.outline(0.7, { ink: INK });
  });
  d('crystals', 26, 30, (p) => {
    p.shadow(14, 26, 11, 3.5, 0.4);
    prism(p, 13, 27, 7, 24, GLOW, -1);
    prism(p, 7, 28, 5, 14, GLOW, -3);
    prism(p, 19, 28, 5, 16, GLOW, 3);
    prism(p, 15, 29, 4, 8, GLOW, 1);
    p.outline(0.75, { ink: '#0c1a24' });
  });
  d('amethyst', 22, 24, (p) => {
    p.shadow(12, 21, 9, 3, 0.4);
    prism(p, 11, 22, 6, 18, AMETHYST, 1);
    prism(p, 6, 23, 4, 11, AMETHYST, -2);
    prism(p, 16, 23, 5, 13, AMETHYST, 2);
    p.outline(0.75, { ink: '#140a24' });
  });
  d('glowshroom', 18, 16, (p, r) => {
    for (const [x, y, s] of [[6, 9, 4.5], [13, 11, 3.2], [9, 13, 2.4]]) {
      p.rect(x - 1, y, 2, 4, '#c8d8e0');
      p.ellipse(x, y, s, s * 0.65, GLOW[1]);
      p.ellipse(x - 0.5, y - 0.6, s * 0.7, s * 0.4, GLOW[2]);
      p.set(x - 1, y - 1, GLOW[3]);
      if (r() < 0.7) p.set(x + 1, y, GLOW[3]);
    }
    p.outline(0.7, { ink: '#0c1a24' });
  });
  d('cave_rock', 56, 40, (p, r) => {
    p.shadow(30, 31, 24, 8, 0.45);
    cel(p, 20, 22, 14, 11, ROCK);
    cel(p, 36, 24, 15, 12, ROCK);
    cel(p, 27, 14, 11, 9, ROCK);
    cel(p, 46, 30, 7, 5, ROCK);
    for (let i = 0; i < 6; i++) p.set(18 + r() * 20, 8 + r() * 6, '#4ab8b0');
  });
  // Lac souterrain : eau noire, rives de pierre, reflets turquoise des cristaux.
  d('cave_lake', 72, 42, (p, r) => {
    const cx = 36;
    const cy = 21;
    const ph = r() * 6;
    const rad = (x, y) => {
      const a = Math.atan2(y - cy, (x - cx) * 0.6);
      const wob = 1 + 0.12 * Math.sin(3 * a + ph) + 0.07 * Math.sin(7 * a + ph * 2);
      return Math.hypot((x + 0.5 - cx) / 33, (y + 0.5 - cy) / 17) / wob;
    };
    for (let y = 0; y < 42; y++)
      for (let x = 0; x < 72; x++) {
        const d0 = rad(x, y);
        if (d0 > 1.12) continue;
        if (d0 > 1) p.set(x, y, y < cy ? ROCK[3] : ROCK[1]);
        else if (d0 > 0.93) p.set(x, y, INK);
        else if (rad(x, y + 3) > 0.93 && y < cy) p.set(x, y, '#0a1620');
        else p.set(x, y, d0 < 0.5 ? '#16384a' : '#102a3a');
      }
    for (const [x, y, w] of [[20, 12, 7], [24, 14, 3], [44, 26, 6], [30, 22, 4]]) p.hline(x, y, w, '#56d4d0');
    for (let a = 0; a < Math.PI * 2; a += 0.08) p.set(46 + Math.cos(a) * 5, 17 + Math.sin(a) * 2.2, '#2a8a9a');
    for (const [x, y] of [[8, 20], [64, 24], [36, 39]]) cel(p, x, y, 3, 2.2, ROCK, { rim: false });
  });

  // ── Sylve des elfes ──
  d('canopy_gold', 64, 60, (p, r) => {
    p.shadow(37, 37, 27, 22, 0.36);
    canopy(p, 30, 28, 25, r, GOLD, 9);
  });
  d('canopy_lilac', 64, 60, (p, r) => {
    p.shadow(37, 37, 27, 22, 0.36);
    canopy(p, 30, 28, 25, r, LILAC, 9);
  });
  d('canopy_elven', 96, 76, (p, r) => {
    p.shadow(52, 47, 40, 26, 0.36);
    canopy(p, 62, 26, 22, r, GOLD);
    canopy(p, 30, 42, 25, r, ELVEN, 9);
  });
  // Arche de marbre blanc aux colonnes fines, prise dans le lierre.
  d('elf_arch', 46, 52, (p, r) => {
    p.rect(6, 48, 38, 4, '#10121c', 0.3);
    for (const x of [6, 34]) {
      p.rect(x, 14, 6, 36, MARBLE[2]);
      p.vline(x, 14, 36, MARBLE[3]);
      p.vline(x + 5, 14, 36, MARBLE[0]);
      p.rect(x - 1, 46, 8, 3, MARBLE[1]);
    }
    // arc brisé
    for (let a = 0; a <= Math.PI; a += 0.02) {
      const x = 23 - Math.cos(a) * 14;
      const y = 16 - Math.sin(a) * 12 * (1 + 0.25 * Math.sin(a));
      for (let t = 0; t < 4; t++) p.set(x, y + t, t === 0 ? MARBLE[3] : t === 3 ? MARBLE[0] : MARBLE[2]);
    }
    p.set(23, 0, '#9af0e0');
    p.set(23, 1, '#56d4d0');
    // lierre
    for (let i = 0; i < 26; i++) {
      const side = r() < 0.5 ? 6 : 34;
      const x = side + Math.floor(r() * 7);
      const y = 8 + Math.floor(r() * 40);
      p.set(x, y, ELVEN[3]);
      p.set(x + 1, y, ELVEN[2]);
    }
    p.outline(0.6, { ink: '#2a2840' });
  });
  // Source de lune : bassin rond cerclé de pierre claire, eau argentée, reflets d'étoiles.
  d('moonwell', 40, 28, (p) => {
    p.ellipse(20, 14, 19, 12.5, MARBLE[0]);
    p.ellipse(20, 13.4, 18, 11.6, MARBLE[2]);
    p.ellipse(20, 14, 14.5, 8.6, INK);
    p.ellipse(20, 14.3, 13.5, 7.8, '#5a6aa8');
    p.ellipse(20, 15.2, 12, 6.4, '#7a8ad0');
    for (const [x, y] of [[14, 12], [24, 16], [19, 18], [27, 12]]) {
      p.set(x, y, '#ffffff');
      p.set(x - 1, y, '#c8d8ff');
      p.set(x + 1, y, '#c8d8ff');
    }
    p.hline(10, 11, 5, '#c8d8ff');
  });
  // Fleur-lanterne : tige haute, corolle qui luit.
  d('lantern_flower', 12, 28, (p) => {
    p.ellipse(6, 26, 4, 1.5, '#10121c', 0.3);
    p.vline(6, 8, 18, ELVEN[1]);
    p.set(5, 18, ELVEN[3]);
    p.set(4, 17, ELVEN[3]);
    p.set(7, 21, ELVEN[3]);
    p.set(8, 20, ELVEN[3]);
    p.ellipse(6, 6, 4, 4.5, '#e8b84a');
    p.ellipse(5.5, 5.5, 2.6, 3, '#fff0a0');
    p.set(5, 4, '#ffffff');
    p.outline(0.6, { ink: INK });
  });

}

// Points lumineux des nouveaux décors (pixels d'art depuis le coin haut gauche).
export const REALM_LIGHTS = {
  crystals: [[13, 10]],
  amethyst: [[11, 10]],
  glowshroom: [[8, 9]],
  lantern_flower: [[6, 6]],
  moonwell: [[20, 14]],
};
