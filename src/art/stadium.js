// Le Stade de Nulle-Part : un terrain entier vu du dessus, que la voie traverse sur la ligne médiane.
// Le sol fait 512×512 : l'écran en montre 480 de large, la voie passe en x = 240.
// De haut en bas de la tuile : un terrain, le dos d'une tribune, ses gradins, les panneaux, puis le terrain suivant.

import { paint, mix, rng, fbm, ramp } from './draw.js';
import { INK } from './forest.js';

const G = 512;
const MID = 240; // axe de la voie
const PITCH = { top: 18, bottom: 402, left: 14, right: 466 };
const CY = (PITCH.top + PITCH.bottom) / 2;

const CHALK = '#f2f4e8';
const BLUE = '#1c3a8a';
const GARNET = '#8a1c3c';
const GOLD = '#e8b83a';
const STRIPE = ['#43943e', '#4fa548'];
const MARGIN = ['#37803a', '#3e8a3e'];
const SKIN = ['#f2c9a0', '#d8a070', '#a86a42', '#6a4028', '#e8b088'];

// Les lignes tracées à la craie, sur deux pixels d'épaisseur.
function chalkRect(p, x0, y0, x1, y1) {
  p.rect(x0, y0, x1 - x0 + 2, 2, CHALK);
  p.rect(x0, y1, x1 - x0 + 2, 2, CHALK);
  p.rect(x0, y0, 2, y1 - y0 + 2, CHALK);
  p.rect(x1, y0, 2, y1 - y0 + 2, CHALK);
}

function chalkArc(p, cx, cy, r, keep = () => true) {
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++)
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d >= r - 1 && d < r + 1 && keep(x, y)) p.set(x, y, CHALK);
    }
}

// Tout ce qui se trouve d'un côté du terrain : surfaces, point de penalty et but.
function halfPitch(p, flip) {
  const X = (x) => (flip ? 2 * MID - x - 2 : x);
  const { left } = PITCH;
  const box = (depth, half) => {
    const a = X(left);
    const b = X(left + depth);
    chalkRect(p, Math.min(a, b), CY - half, Math.max(a, b), CY + half);
  };
  box(92, 106);
  box(32, 50);
  p.rect(X(left + 64), CY - 1, 2, 2, CHALK);
  p.set(X(left + 64) - 1, CY, CHALK);
  chalkArc(p, X(left + 64) + 1, CY, 36, (x) => (flip ? x < X(left + 92) : x > left + 93));

  // le but : le filet et son ombre dans la marge, les poteaux en blanc
  const half = 28;
  for (let y = CY - half; y <= CY + half; y++)
    for (let dx = 1; dx < left - 1; dx++) {
      const x = X(left - dx);
      p.set(x, y, '#143a1c', 0.42);
      if (dx % 3 === 0 || (y - CY) % 3 === 0) p.set(x, y, '#e4ece4', 0.75);
    }
  p.rect(Math.min(X(left), X(left + 1)), CY - half - 1, 2, half * 2 + 3, '#ffffff');
  const back = flip ? X(left) : 2;
  p.rect(back, CY - half - 1, left - 2, 2, '#ffffff');
  p.rect(back, CY + half, left - 2, 2, '#ffffff');
}

// Un drapeau de coin, planté sur le quart de cercle.
function cornerFlag(p, x, y, color) {
  p.vline(x, y - 8, 9, '#ffffff');
  p.rect(x + 1, y - 8, 4, 3, color);
  p.set(x + 1, y - 5, color);
  p.set(x + 1, y + 1, '#143a1c');
}

// Les gradins, en rangées de 8 pixels, sections alternées bleues et grenat.
function stand(p, r, top) {
  const ROWS = 9;
  const SECTION = 48;
  const seatOf = (x, row) => {
    if (row === 0 || row === ROWS - 1) return GOLD;
    return Math.floor((x + 8) / SECTION) % 2 ? BLUE : GARNET;
  };

  // le dos de la tribune : une bande de béton, ses mâts et ses fanions
  p.rect(0, top - 10, G, 10, '#6e6e7a');
  p.hline(0, top - 10, G, '#a0a0ac');
  p.rect(0, top - 2, G, 2, '#3e3e4a');
  for (let x = 12; x < G; x += SECTION) {
    p.vline(x, top - 20, 12, '#d8d8e0');
    p.rect(x + 1, top - 20, 7, 4, Math.floor(x / SECTION) % 2 ? BLUE : GARNET);
  }

  for (let row = 0; row < ROWS; row++) {
    const y = top + row * 8;
    p.rect(0, y, G, 6, '#8e8e9a');
    p.hline(0, y, G, '#bcbcc8');
    p.rect(0, y + 6, G, 2, '#4a4a56');
    for (let x = 1; x < G - 3; x += 4) {
      if ((x + 8) % SECTION < 4) continue; // escalier entre deux sections
      const c = seatOf(x, row);
      p.rect(x, y + 2, 3, 3, c);
      if (r() < 0.76) {
        p.rect(x, y + 3, 3, 2, c);
        p.rect(x, y + 1, 3, 2, SKIN[Math.floor(r() * SKIN.length)]);
        p.set(x + 1, y, r() < 0.5 ? '#2a1a12' : '#d9a83a');
        if (r() < 0.16) p.set(x + (r() < 0.5 ? -1 : 3), y - 1, r() < 0.5 ? '#ffffff' : c); // bras ou écharpe levés
      }
    }
  }
  const bottom = top + ROWS * 8;

  // la balustrade et les panneaux au bord du terrain suivant
  p.rect(0, bottom, G, 2, '#d8d8e0');
  const PANELS = [BLUE, '#e8e4dc', GARNET, GOLD];
  for (let x = 0; x < G; x += 44) {
    const c = PANELS[(x / 44) % PANELS.length];
    p.rect(x, bottom + 2, 44, 8, c);
    p.hline(x, bottom + 2, 44, mix(c, '#ffffff', 0.35));
    p.vline(x, bottom + 2, 8, '#14141c');
    const mark = c === '#e8e4dc' || c === GOLD ? '#2a2a3a' : '#ffffff';
    for (let i = 0; i < 4; i++) p.rect(x + 8 + i * 7, bottom + 5, 4, 2, mark);
  }
  p.rect(0, bottom + 10, G, 2, '#143a1c', 0.5);

  // le passage de la voie : un couloir de béton entre les gradins
  const half = 27;
  p.rect(MID - half, top - 10, half * 2, bottom + 12 - top + 10, '#6a6a74');
  for (let y = top - 10; y < bottom + 12; y += 6) p.hline(MID - half, y, half * 2, '#5e5e68');
  p.rect(MID - half - 2, top - 10, 2, bottom + 12 - top + 10, '#2a2a34');
  p.rect(MID + half, top - 10, 2, bottom + 12 - top + 10, '#2a2a34');
}

export function stadiumGround(scene) {
  paint(
    scene,
    'ground_stade',
    G,
    G,
    (p) => {
      const r = rng(91);
      const n = fbm(G, G, 91, [32, 16]);
      const worn = fbm(G, G, 92, [16, 8]);
      for (let y = 0; y < G; y++)
        for (let x = 0; x < G; x++) {
          const inside = x >= PITCH.left && x <= PITCH.right && y >= PITCH.top && y <= PITCH.bottom;
          const tones = inside ? [STRIPE[Math.floor((x - MID + 16 + 320) / 32) % 2], 0] : [MARGIN[0], 0];
          let c = mix(tones[0], '#ffffff', n(x, y) > 0.56 ? 0.05 : 0);
          // la terre est à nu devant les buts et au point central
          const near = Math.hypot((Math.min(x, 2 * MID - x) - PITCH.left - 18) / 34, (y - CY) / 44);
          if (inside && near < 1 && worn(x, y) > 0.34 + near * 0.3) c = mix(c, '#8a7a42', 0.62);
          p.set(x, y, c);
        }
      for (let i = 0; i < 2600; i++) {
        const x = Math.floor(r() * G);
        const y = Math.floor(r() * G);
        p.set(x, y, r() < 0.5 ? '#347c34' : '#68b858', 0.7);
      }

      const { top, bottom, left, right } = PITCH;
      chalkRect(p, left, top, right, bottom);
      p.rect(MID - 1, top, 2, bottom - top, CHALK);
      chalkArc(p, MID, CY, 62);
      halfPitch(p, false);
      halfPitch(p, true);
      for (const [cx, cy] of [[left + 1, top + 1], [right + 1, top + 1], [left + 1, bottom + 1], [right + 1, bottom + 1]])
        chalkArc(p, cx, cy, 8, (x, y) => x >= left && x <= right + 1 && y >= top && y <= bottom + 1);
      cornerFlag(p, left, top, GARNET);
      cornerFlag(p, right, top, BLUE);
      cornerFlag(p, left, bottom, BLUE);
      cornerFlag(p, right, bottom, GARNET);

      stand(p, r, 426);
    },
    { wrap: true },
  );
}

export function stadiumDecor(d) {
  // Le banc de touche : abri en plexiglas et sièges bleus.
  d('bench', 46, 24, (p) => {
    p.rect(3, 6, 42, 17, '#10121c', 0.28);
    p.rect(1, 2, 42, 7, '#c8e0ec');
    p.hline(1, 2, 42, '#ffffff');
    p.rect(1, 9, 42, 11, '#3a4258');
    for (let x = 3; x < 41; x += 6) {
      p.rect(x, 12, 5, 6, BLUE);
      p.hline(x, 12, 5, '#3a60c0');
    }
    p.rect(1, 20, 42, 2, '#20242e');
    p.vline(1, 2, 20, '#e8e8f0');
    p.vline(42, 2, 20, '#e8e8f0');
    p.outline(0.6, { ink: INK });
  });
  // Le mur de mannequins pour les coups francs.
  d('dummies', 42, 26, (p) => {
    p.shadow(22, 23, 19, 2.5, 0.3);
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 10;
      p.rect(x, 7, 8, 13, '#f0c020');
      p.vline(x, 7, 13, '#ffe070');
      p.vline(x + 7, 7, 13, '#b88a10');
      p.ellipse(x + 3.5, 4.5, 3.5, 3.5, '#f0c020');
      p.set(x + 2, 3, '#ffe070');
      p.rect(x + 2, 20, 4, 3, '#54545e');
    }
    p.outline(0.6, { ink: INK });
  });
  // Un petit but d'entraînement.
  d('goal', 36, 24, (p) => {
    p.rect(3, 5, 32, 17, '#10121c', 0.2);
    for (let x = 4; x < 33; x += 3) p.vline(x, 3, 17, '#e8e8f0', 0.55);
    for (let y = 4; y < 20; y += 3) p.hline(3, y, 30, '#e8e8f0', 0.55);
    p.rect(1, 1, 34, 2, '#ffffff');
    p.rect(1, 1, 2, 20, '#ffffff');
    p.rect(33, 1, 2, 20, '#ffffff');
    p.outline(0.5, { ink: INK });
  });
  // Le filet à ballons.
  d('ball_net', 20, 22, (p) => {
    p.shadow(11, 19, 8, 2, 0.3);
    for (const [x, y] of [[6, 14], [13, 14], [9, 9], [5, 7], [14, 8]]) {
      p.ellipse(x, y, 4, 4, '#f4f4ec');
      p.set(x, y, '#1a1a22');
      p.set(x + 1, y, '#1a1a22');
      p.set(x - 2, y + 2, '#a0a0ac');
    }
    for (let x = 2; x < 19; x += 3) p.vline(x, 4, 15, '#ff7a2a', 0.45);
    p.hline(5, 2, 10, '#ff7a2a');
    p.outline(0.6, { ink: INK });
  });
  d('team_flag', 16, 30, (p) => {
    p.ellipse(4, 28, 3, 1, '#10121c', 0.3);
    p.vline(3, 2, 26, '#d8d8e0');
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 11; x++) p.set(4 + x, 2 + y + Math.round(Math.sin(x * 0.6)), x < 4 || x >= 8 ? BLUE : GARNET);
    p.outline(0.6, { ink: INK });
  });
  d('ball', 7, 7, (p) => {
    p.ellipse(3.5, 3.5, 3.2, 3.2, '#f4f4ec');
    p.set(3, 3, '#1a1a22');
    p.set(4, 3, '#1a1a22');
    p.set(3, 4, '#1a1a22');
    p.set(1, 2, '#9a9aa6');
    p.set(5, 5, '#9a9aa6');
    p.outline(0.6, { ink: INK });
  });
  d('cone', 6, 7, (p) => {
    for (let j = 0; j < 5; j++) p.hline(3 - Math.floor(j / 2), 1 + j, 1 + Math.floor(j / 2) * 2, j === 2 ? '#ffffff' : '#ff7a2a');
    p.hline(0, 6, 6, '#c8501a');
    p.outline(0.6, { ink: INK });
  });
  // Une motte arrachée par un tacle.
  d('divot', 10, 5, (p) => {
    const earth = ramp('#6a4a2a', 3, 0.1);
    p.ellipse(5, 2.5, 4.5, 2, earth[0]);
    p.ellipse(4.5, 2, 3, 1.2, earth[1]);
    p.set(8, 0, '#4fa548');
    p.set(9, 1, '#4fa548');
  });
  d('bottle', 5, 9, (p) => {
    p.rect(1, 3, 3, 5, BLUE);
    p.vline(1, 3, 5, '#3a60c0');
    p.rect(2, 1, 1, 2, '#f4f4ec');
    p.outline(0.6, { ink: INK });
  });
}
