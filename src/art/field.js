// Le champ de Saint-Banal : le sol en parcelles et tout ce qui se dresse dessus.
// Le sol fait 256×256 (deux fois plus grand que les autres) pour que le découpage des parcelles se répète moins.

import { paint, ramp, rng, fbm } from './draw.js';

const G = 256;

const WHEAT = ['#8f6a22', '#b58a2e', '#d2a63c', '#e4bd4e', '#f6dc7c'];
const SOIL = ['#4e3424', '#654530', '#7c573a', '#936a45'];
const GRASS = ['#7c9c42', '#86a648', '#92b04e'];

// [x0, x1, y0, y1, culture] : quelques parcelles isolées, la prairie occupe tout le reste.
// La voie passe au milieu de l'écran : les parcelles ne se répètent que tous les 256 pixels.
const PARCELS = [
  [12, 70, 22, 88, 'wheat'],
  [176, 240, 148, 200, 'wheat'],
  [96, 136, 196, 232, 'soil'],
];

function wheat(p, [x0, x1, y0, y1], wind, r) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const row = (x - x0) % 7;
      const t = row === 0 ? 0 : row === 1 || row === 6 ? 1 : wind(x, y) > 0.52 ? 3 : 2;
      p.set(x, y, WHEAT[t]);
    }
  }
  // les épis, en petits traits décalés d'un rang à l'autre
  for (let x = x0 + 3; x < x1 - 1; x += 7) {
    for (let y = y0 + Math.floor(r() * 3); y < y1 - 2; y += 3) {
      const dx = Math.floor(r() * 3) - 1;
      p.set(x + dx, y, WHEAT[4]);
      p.set(x + dx, y + 1, WHEAT[3]);
    }
  }
  // quelques coquelicots égarés
  for (let i = 0; i < 12; i++) {
    const x = x0 + Math.floor(r() * (x1 - x0));
    const y = y0 + Math.floor(r() * (y1 - y0));
    p.set(x, y, '#d8402c');
    p.set(x, y + 1, '#4c8434');
  }
}

function soil(p, [x0, x1, y0, y1], r) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const row = (x - x0) % 6;
      p.set(x, y, SOIL[row === 0 ? 0 : row === 1 || row === 5 ? 1 : row === 2 ? 3 : 2]);
    }
  }
  for (let i = 0; i < (x1 - x0) * (y1 - y0) * 0.02; i++) {
    const x = x0 + Math.floor(r() * (x1 - x0));
    const y = y0 + Math.floor(r() * (y1 - y0));
    p.set(x, y, SOIL[3]);
    p.set(x, y + 1, SOIL[0]);
  }
}

// La bordure d'herbe qui mange chaque parcelle.
function verge(p, [x0, x1, y0, y1], r) {
  const tick = (x, y) => {
    p.set(x, y, GRASS[Math.floor(r() * 3)]);
    if (r() < 0.45) p.set(x, y - 1, GRASS[1 + Math.floor(r() * 2)]);
  };
  for (let x = x0 - 1; x <= x1; x++) {
    tick(x, y0 - 1);
    tick(x, y1);
    if (r() < 0.6) tick(x, y0);
    if (r() < 0.6) tick(x, y1 - 1);
  }
  for (let y = y0 - 1; y <= y1; y++) {
    tick(x0 - 1, y);
    tick(x1, y);
    if (r() < 0.6) tick(x0, y);
    if (r() < 0.6) tick(x1 - 1, y);
  }
}

export function fieldGround(scene) {
  paint(
    scene,
    'ground_city',
    G,
    G,
    (p) => {
      const r = rng(31);
      const wind = fbm(G, G, 37, [64, 32]);
      // la prairie : de grandes nappes de vert, quelques brins et de rares fleurs
      const meadow = fbm(G, G, 41, [64, 32]);
      for (let y = 0; y < G; y++) {
        for (let x = 0; x < G; x++) {
          const v = meadow(x, y);
          p.set(x, y, v < 0.44 ? GRASS[0] : v < 0.6 ? GRASS[1] : GRASS[2]);
        }
      }
      for (let i = 0; i < 1500; i++) {
        const x = Math.floor(r() * G);
        const y = Math.floor(r() * G);
        p.set(x, y, GRASS[Math.floor(r() * 3)]);
        if (i % 3 === 0) p.set(x, y - 1, GRASS[2]);
      }
      for (let i = 0; i < 26; i++) {
        p.set(Math.floor(r() * G), Math.floor(r() * G), i % 3 ? '#f2ecd8' : '#d8402c');
      }
      for (const box of PARCELS) {
        const kind = box[4];
        if (kind === 'wheat') wheat(p, box, wind, r);
        else soil(p, box, r);
        verge(p, box, r);
      }
    },
    { wrap: true },
  );
}

// ───────── Ce qui se dresse dans le champ ─────────

export function fieldDecor(d) {
  const wood = ramp('#7a5534', 5, 0.07);
  const straw = ramp('#d8ae48', 6, 0.06);
  const twine = '#7a5a2c';

  d('wheat_tall', 30, 24, (p, r) => {
    p.shadow(16, 21, 13, 3);
    const stalks = [];
    for (let i = 0; i < 34; i++) stalks.push([2 + Math.floor(r() * 26), 11 + Math.floor(r() * 11)]);
    stalks.sort((a, b) => a[1] - b[1]);
    for (const [x, base] of stalks) {
      const h = 7 + Math.floor(r() * 3);
      const lean = r() < 0.5 ? 0 : 1;
      p.vline(x, base - h + 3, h - 3, WHEAT[1 + Math.floor(r() * 2)]);
      p.vline(x + lean, base - h, 3, WHEAT[4]);
      p.set(x + lean, base - h + 3, WHEAT[3]);
      p.set(x, base, WHEAT[0]);
    }
    p.outline(0.6);
  });

  d('haybale', 26, 21, (p, r) => {
    p.shadow(15, 18, 11, 3);
    p.blob(13, 10, 11, 9, straw, { flat: 0.3, grain: 0.14, r });
    // la spirale de la botte roulée
    p.ellipse(11, 11, 7.5, 6.5, straw[2]);
    p.ellipse(11, 11, 6.5, 5.5, straw[4]);
    p.ellipse(11, 11, 4.5, 3.5, straw[2]);
    p.ellipse(11, 11, 3.5, 2.5, straw[3]);
    p.ellipse(11, 11, 1.5, 1, straw[1]);
    for (let i = 0; i < 14; i++) p.set(4 + r() * 18, 3 + r() * 15, straw[r() < 0.5 ? 5 : 1]);
    p.vline(19, 3, 15, twine);
    p.outline(0.55);
  });

  d('hay_stack', 42, 30, (p, r) => {
    p.shadow(23, 26, 18, 3.5);
    const bale = (x, y, w = 15, h = 11) => {
      p.rect(x, y, w, h, straw[2]);
      p.rect(x, y, w, 3, straw[4]);
      p.hline(x, y, w, straw[5]);
      p.rect(x, y + h - 2, w, 2, straw[1]);
      for (let i = 0; i < 16; i++) p.set(x + r() * w, y + 3 + r() * (h - 4), straw[r() < 0.5 ? 3 : 1]);
      p.vline(x + 4, y, h, twine);
      p.vline(x + w - 5, y, h, twine);
    };
    bale(4, 16);
    bale(20, 16);
    bale(12, 5);
    p.outline(0.55);
  });

  d('fence', 46, 18, (p) => {
    for (const x of [3, 22, 41]) p.rect(x + 1, 13, 4, 2, '#10121c', 0.25);
    for (const y of [6, 10]) {
      p.hline(2, y, 42, wood[3]);
      p.hline(2, y + 1, 42, wood[1]);
    }
    for (const x of [3, 22, 41]) {
      p.rect(x, 2, 3, 13, wood[2]);
      p.vline(x, 2, 13, wood[4]);
      p.hline(x, 2, 3, wood[4]);
    }
    p.outline(0.55);
  });

  d('scarecrow', 30, 38, (p, r) => {
    p.shadow(16, 35, 7, 2);
    p.rect(14, 12, 3, 24, wood[2]);
    p.vline(14, 12, 24, wood[3]);
    p.rect(3, 15, 24, 2, wood[2]);
    // chemise à carreaux
    p.rect(8, 14, 15, 13, '#b8402c');
    for (let y = 14; y < 27; y += 4) p.hline(8, y, 15, '#7a2418');
    for (let x = 9; x < 23; x += 4) p.vline(x, 14, 13, '#7a2418');
    p.rect(3, 14, 5, 4, '#b8402c');
    p.rect(23, 14, 5, 4, '#b8402c');
    // paille aux poignets et à la taille
    for (let i = 0; i < 4; i++) {
      p.set(2 - (i % 2), 14 + i, straw[4]);
      p.set(28 + (i % 2), 14 + i, straw[4]);
      p.vline(9 + i * 4, 27, 3 + Math.floor(r() * 2), straw[3]);
    }
    // tête en toile et chapeau de paille
    p.blob(15.5, 9, 5.5, 5, ramp('#d8c8a0', 4, 0.07), { flat: 0.4 });
    p.rect(12, 8, 2, 2, '#2a2018');
    p.rect(17, 8, 2, 2, '#2a2018');
    p.hline(13, 12, 5, '#2a2018');
    p.rect(9, 4, 14, 2, straw[3]);
    p.rect(11, 0, 10, 4, straw[4]);
    p.hline(11, 3, 10, '#b8402c');
    p.outline(0.55);
    // un corbeau qui n'a pas peur
    p.rect(23, 11, 4, 3, '#22202c');
    p.set(27, 11, '#e8a030');
    p.set(25, 10, '#22202c');
    p.set(26, 12, '#ffffff');
  });

  d('tractor', 46, 32, (p) => {
    const Red = ramp('#c8402e', 5, 0.08);
    p.shadow(24, 29, 20, 3);
    const wheel = (cx, cy, rad) => {
      p.ellipse(cx, cy, rad, rad, '#22202a');
      p.ellipse(cx, cy, rad - 2, rad - 2, '#3a3844');
      p.ellipse(cx, cy, rad - 3.5, rad - 3.5, '#e8c040');
      p.ellipse(cx, cy, 1.5, 1.5, '#8a6a20');
    };
    // pot d'échappement
    p.rect(34, 4, 2, 9, '#3a3844');
    p.rect(33, 3, 4, 2, '#22202a');
    // capot et cabine
    p.rect(17, 11, 25, 11, Red[2]);
    p.rect(17, 11, 25, 3, Red[4]);
    p.rect(17, 19, 25, 3, Red[0]);
    for (let y = 15; y < 19; y += 2) p.hline(30, y, 10, Red[0]);
    p.rect(41, 14, 2, 4, '#f4e8a0');
    // siège et volant
    p.rect(10, 10, 7, 4, '#3a3038');
    p.rect(9, 5, 3, 7, '#3a3038');
    p.line(18, 11, 21, 7, '#22202a');
    p.hline(19, 6, 5, '#22202a');
    wheel(36, 25, 5);
    wheel(12, 21, 10);
    p.outline(0.55);
  });

  d('mill', 56, 80, (p, r) => {
    const Stone = ramp('#c8bca0', 6, 0.06);
    const Roof = ramp('#8a4a30', 5, 0.08);
    const cx = 28;
    p.shadow(33, 74, 18, 4);
    // tour
    for (let y = 32; y < 76; y++) {
      const hw = 9 + ((y - 32) / 44) * 6;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const u = (x - (cx - hw)) / (2 * hw);
        p.set(x, y, Stone[u < 0.25 ? 4 : u < 0.6 ? 3 : u < 0.85 ? 2 : 1]);
      }
    }
    for (let i = 0; i < 46; i++) {
      const y = 34 + Math.floor(r() * 40);
      const hw = 9 + ((y - 32) / 44) * 6;
      const x = cx - hw + r() * 2 * hw;
      p.hline(x, y, 3, Stone[1]);
    }
    // porte et lucarne
    p.rect(cx - 4, 62, 8, 14, wood[0]);
    p.rect(cx - 3, 63, 6, 13, wood[2]);
    p.rect(cx - 2, 44, 4, 5, '#24202c');
    p.hline(cx - 3, 43, 6, wood[3]);
    // toit conique
    for (let y = 18; y < 33; y++) {
      const hw = ((y - 16) / 17) * 11;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const u = (x - (cx - hw)) / (2 * hw || 1);
        p.set(x, y, Roof[u < 0.3 ? 4 : u < 0.65 ? 3 : 1]);
      }
    }
    // les ailes : une armature et une toile de chaque côté
    const hub = [cx, 28];
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      for (let t = 4; t < 20; t++) {
        const x = hub[0] + dx * t;
        const y = hub[1] + dy * t;
        for (let k = 1; k <= 4; k++) {
          const c = t % 4 === 0 || k === 4 ? wood[1] : '#f0e8d4';
          p.set(x + dy * k * 0.7, y - dx * k * 0.7, c);
          p.set(x + dy * k * 0.7 + (dy > 0 ? 1 : 0), y - dx * k * 0.7, c);
        }
      }
      p.line(hub[0], hub[1], hub[0] + dx * 20, hub[1] + dy * 20, wood[0]);
    }
    p.ellipse(hub[0], hub[1], 2.5, 2.5, wood[0]);
    p.set(hub[0], hub[1], wood[4]);
    p.outline(0.55);
  });

  // ── petits éléments ──
  d('wheat_tuft', 9, 8, (p) => {
    for (const [x, h] of [[1, 5], [3, 7], [5, 6], [7, 4]]) {
      p.vline(x, 8 - h + 2, h - 2, WHEAT[1]);
      p.vline(x, 8 - h, 2, WHEAT[4]);
    }
  });
  d('poppies', 9, 7, (p) => {
    for (const [x, y] of [[2, 3], [6, 2], [4, 5]]) {
      p.vline(x, y + 1, 2, '#4c8434');
      p.set(x, y, '#d8402c');
      p.set(x + 1, y, '#e8604a');
      p.set(x, y - 1, '#c8301e');
    }
  });
}
