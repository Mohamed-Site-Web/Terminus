// Forêt vue de dessus, en cel shading : canopées rondes en grappes, mares, dalles, falaises.
// Aplats francs (pas de tramage), contour sombre, reflets clairs en haut à gauche.

import { mix } from './draw.js';

export const INK = '#15241c';
const LEAF = ['#1d3a2c', '#2b5638', '#3d7640', '#5a9a48', '#8cc65a']; // 0 = creux, 4 = reflet
const STONE = ['#4f4a44', '#77716a', '#a39d92', '#cfc9bc'];

// Lumière en haut à gauche, un peu de face.
const LX = -0.55;
const LY = -0.62;
const LZ = 0.56;

// Ellipsoïde en aplats : 3 tons + bord sombre en bas + contour encré.
export function cel(p, cx, cy, rx, ry, pal, { rim = true } = {}) {
  const inside = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (!inside(x, y)) continue;
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const I = nx * LX + ny * LY + nz * LZ;
      let k = I > 0.62 ? pal.length - 1 : I > 0.3 ? pal.length - 2 : I > -0.05 ? pal.length - 3 : 0;
      if (rim && !inside(x, y + 1)) k = 0;
      if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) p.set(x, y, mix(pal[0], INK, 0.6));
      else p.set(x, y, pal[k]);
    }
  }
}

// Canopée : coupole bosselée faite de lobes. Chaque pixel appartient au lobe le plus haut ;
// le bas de chaque lobe forme un creux sombre, ce qui dessine les grappes de feuillage.
export function canopy(p, cx, cy, R, r, pal = LEAF, lobes = 8) {
  const L = [{ x: cx, y: cy, rad: R * 0.6, z: R * 0.3 }];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + r() * 0.5;
    const d = R * (0.5 + r() * 0.1);
    L.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.92, rad: R * (0.4 + r() * 0.1), z: 0 });
  }
  for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI * 2;
    const d = R * 0.32 * r();
    L.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, rad: R * 0.34, z: R * 0.38 });
  }
  const owner = (x, y) => {
    let best = -1;
    let bh = -Infinity;
    L.forEach((l, i) => {
      const dx = (x + 0.5 - l.x) / l.rad;
      const dy = (y + 0.5 - l.y) / l.rad;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) return;
      const h = Math.sqrt(1 - d2) * l.rad + l.z;
      if (h > bh) {
        bh = h;
        best = i;
      }
    });
    return best;
  };
  const x0 = Math.floor(cx - R - 1);
  const y0 = Math.floor(cy - R - 1);
  const size = Math.ceil(R * 2 + 3);
  const own = [];
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) own.push(owner(x0 + i, y0 + j));
  const at = (x, y) => {
    const i = x - x0;
    const j = y - y0;
    return i < 0 || j < 0 || i >= size || j >= size ? -1 : own[j * size + i];
  };

  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      const i = at(x, y);
      if (i < 0) continue;
      const l = L[i];
      const nx = (x + 0.5 - l.x) / l.rad;
      const ny = (y + 0.5 - l.y) / l.rad;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const gx = (x + 0.5 - cx) / R;
      const gy = (y + 0.5 - cy) / R;
      const gz = Math.sqrt(Math.max(0, 1 - gx * gx - gy * gy));
      const I = 0.5 * (nx * LX + ny * LY + nz * LZ) + 0.5 * (gx * LX + gy * LY + gz * LZ);
      let k = I > 0.5 ? 3 : I > 0.18 ? 2 : 1;
      // grain de feuilles : quelques pixels clairs côté lumière, sombres côté ombre
      if (k === 3 && r() < 0.1) k = 4;
      if (k === 1 && r() < 0.08) k = 0;
      if (at(x, y + 1) !== i) k = 0;
      else if (at(x + 1, y) !== i && k > 1) k--;
      const edge = at(x - 1, y) < 0 || at(x + 1, y) < 0 || at(x, y - 1) < 0 || at(x, y + 1) < 0;
      p.set(x, y, edge ? mix(pal[0], INK, 0.6) : pal[k]);
    }
  }
  // reflets en croissant sur le haut des lobes éclairés
  for (const l of L) {
    const hx = l.x - l.rad * 0.3;
    const hy = l.y - l.rad * 0.38;
    const hr = l.rad * 0.3;
    for (let y = Math.floor(hy - hr); y <= hy + hr; y++)
      for (let x = Math.floor(hx - hr); x <= hx + hr; x++) {
        if (L[at(x, y)] !== l || at(x, y + 1) !== at(x, y)) continue;
        if ((x + 0.5 - hx) ** 2 + (y + 0.5 - hy) ** 2 * 2.2 > hr * hr) continue;
        const gx = (x - cx) / R;
        const gy = (y - cy) / R;
        if (gx * LX + gy * LY > -0.15) p.set(x, y, pal[4]);
      }
  }
}

export function forestDecor(d) {
  d('canopy', 64, 60, (p, r) => {
    p.shadow(37, 37, 27, 22, 0.38);
    canopy(p, 30, 28, 25, r, LEAF, 9);
  });
  d('canopy_s', 38, 36, (p, r) => {
    p.shadow(22, 22, 16, 13, 0.38);
    canopy(p, 17, 16, 14, r, LEAF, 7);
  });
  d('canopy_duo', 96, 76, (p, r) => {
    p.shadow(52, 47, 40, 26, 0.38);
    canopy(p, 62, 26, 22, r);
    canopy(p, 30, 42, 25, r, LEAF, 9);
  });
  d('canopy_dark', 64, 60, (p, r) => {
    p.shadow(37, 37, 27, 22, 0.4);
    canopy(p, 30, 28, 25, r, ['#16302a', '#21483a', '#2f6446', '#47864e', '#78b25c']);
  });

  d('shrub', 24, 20, (p, r) => {
    p.shadow(13, 12, 10, 7, 0.34);
    canopy(p, 11, 9, 8.5, r, LEAF, 5);
    for (let i = 0; i < 4; i++) {
      const x = 6 + Math.floor(r() * 10);
      const y = 5 + Math.floor(r() * 7);
      p.set(x, y, '#e8483a');
      p.set(x, y - 1, '#ff9a7a');
    }
  });

  d('boulder', 24, 18, (p, r) => {
    p.shadow(14, 12, 10, 5, 0.34);
    cel(p, 10, 9, 8.5, 6.5, STONE);
    cel(p, 16, 11, 5, 4, STONE);
    // mousse sur le dessus
    for (let i = 0; i < 9; i++) p.set(6 + Math.floor(r() * 7), 4 + Math.floor(r() * 2), r() < 0.5 ? LEAF[3] : LEAF[4]);
  });

  // Mare : berge encrée, eau sombre sous le bord haut, reflets, ronds dans l'eau, nénuphars.
  d('pond', 64, 40, (p, r) => {
    const cx = 32;
    const cy = 20;
    const ph = r() * 6;
    const rad = (x, y) => {
      const a = Math.atan2(y - cy, (x - cx) * 0.6);
      const wob = 1 + 0.1 * Math.sin(3 * a + ph) + 0.06 * Math.sin(5 * a + ph * 2);
      return Math.hypot((x + 0.5 - cx) / 29, (y + 0.5 - cy) / 16) / wob;
    };
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < 64; x++) {
        const d0 = rad(x, y);
        if (d0 > 1.1) continue;
        if (d0 > 1) p.set(x, y, y < cy ? '#3d7038' : '#2f5a32'); // berge herbeuse
        else if (d0 > 0.93) p.set(x, y, INK);
        else if (rad(x, y + 3) > 0.93 && y < cy) p.set(x, y, '#23506a'); // ombre de la berge
        else p.set(x, y, d0 < 0.55 && y > cy - 2 ? '#3d8ea4' : '#32788f');
      }
    // reflets du ciel
    for (const [x, y, w] of [[18, 11, 6], [22, 13, 3], [40, 25, 5]]) p.hline(x, y, w, '#8fd2d6');
    // ronds dans l'eau
    const ring = (rx, ry, ex, ey, c) => {
      for (let a = 0; a < Math.PI * 2; a += 0.08) p.set(rx + Math.cos(a) * ex, ry + Math.sin(a) * ey, c);
    };
    ring(40, 17, 5, 2.5, '#6cb8c2');
    ring(40, 17, 2, 1, '#9adcdc');
    ring(24, 25, 3.5, 1.6, '#6cb8c2');
    // nénuphars
    for (const [x, y] of [[14, 22], [46, 12], [50, 24]]) {
      p.ellipse(x, y, 3.5, 2.2, '#2f6a34');
      p.ellipse(x - 0.5, y - 0.4, 2.6, 1.6, '#5aa046');
      p.set(x + 1, y - 1, '#2f6a34');
      p.set(x + 2, y - 1, '#2f6a34');
    }
    p.set(46, 11, '#f4a6c6');
    p.set(45, 11, '#ffd0e0');
    // galets sur la berge
    for (const [x, y] of [[6, 18], [58, 22], [30, 37]]) cel(p, x, y, 2.5, 2, STONE, { rim: false });
  });

  // Dalles de pierre posées dans l'herbe, en chemin qui serpente.
  d('slabs', 34, 52, (p, r) => {
    let x = 10 + r() * 6;
    for (let y = 4; y < 50; y += 9) {
      const w = 9 + Math.floor(r() * 4);
      const h = 6 + Math.floor(r() * 2);
      const sx = Math.round(x);
      p.rect(sx + 1, y + 1, w, h, '#10121c', 0.3);
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1);
          if (corner) continue;
          const border = i === 0 || i === w - 1 || j === 0 || j === h - 1;
          p.set(sx + i, y + j, border ? '#4a453e' : j === 1 ? '#ddd7c8' : j >= h - 2 ? '#8e8778' : '#bdb6a5');
        }
      if (r() < 0.6) p.line(sx + 3, y + 2, sx + 5, y + 4, '#8e8778');
      p.set(sx - 1, y + h - 1, LEAF[3]);
      p.set(sx + w, y + 2, LEAF[4]);
      x += (r() - 0.5) * 8;
      x = Math.max(2, Math.min(34 - w - 2, x));
    }
  });

  // Plateau surélevé : dessus herbeux, rebord clair, paroi rocheuse striée.
  d('cliff', 76, 46, (p, r) => {
    const top = (x) => 4 + Math.round(2 * Math.sin(x * 0.21 + 1) + Math.sin(x * 0.53));
    const edge = (x) => 26 + Math.round(3 * Math.sin(x * 0.17) + 1.5 * Math.sin(x * 0.61 + 2));
    const face = 11;
    const inX = (x) => x > 2 && x < 73;
    for (let x = 0; x < 76; x++) {
      if (!inX(x)) continue;
      const t = top(x) + (x < 8 ? 8 - x : x > 67 ? x - 67 : 0);
      const e = edge(x);
      for (let y = t; y < e; y++) p.set(x, y, y === t ? '#8cc65a' : y < t + 3 ? '#6cab50' : (x * 7 + y * 3) % 11 === 0 ? '#4c8a42' : '#5a9a48');
      p.set(x, e, '#d8e8a0');
      for (let y = e + 1; y < e + face; y++) {
        const strata = (x + Math.floor(y / 3)) % 7 === 0;
        const c = y < e + 3 ? '#b8a68a' : y < e + 7 ? '#94826c' : '#6e5e50';
        p.set(x, y, strata ? '#5a4c42' : c);
      }
      p.set(x, e + face, INK);
      p.rect(x, e + face + 1, 1, 3, '#10121c', 0.3);
    }
    p.outline(0.7, { ink: INK });
    // touffes et cailloux sur le dessus
    for (let i = 0; i < 10; i++) {
      const x = 8 + Math.floor(r() * 60);
      const y = top(x) + 5 + Math.floor(r() * (edge(x) - top(x) - 8));
      p.set(x, y, LEAF[1]);
      p.set(x, y - 1, LEAF[4]);
    }
  });

  d('mushrooms', 12, 9, (p) => {
    for (const [x, y, s] of [[3, 5, 3], [8, 6, 2.2]]) {
      p.rect(x - 0.5, y, 2, 3, '#efe4cc');
      p.ellipse(x + 0.5, y, s, s * 0.7, '#c23a32');
      p.ellipse(x, y - 0.5, s * 0.6, s * 0.4, '#ec6a50');
      p.set(x - 1, y - 1, '#fff6e8');
      p.set(x + 1, y, '#fff6e8');
    }
    p.outline(0.7, { ink: INK });
  });

  d('flowers_bright', 11, 8, (p) => {
    for (const [x, y, c] of [[2, 3, '#ffffff'], [5, 1, '#ffd23a'], [8, 4, '#ff6a8a'], [4, 6, '#a88aff']]) {
      p.set(x, y + 1, LEAF[1]);
      p.set(x - 1, y, c);
      p.set(x + 1, y, c);
      p.set(x, y - 1, c);
      p.set(x, y, '#ffe27a');
    }
  });
}

// Éléments à plat au sol : dessinés sous les arbres et les personnages.
export const FLAT = new Set(['pond', 'slabs', 'cave_lake', 'moonwell', 'gear_big', 'gear_small']);
