// Habitations de tous les biomes : un même chalet vu de face et de haut (grand toit en chevron,
// poutre faîtière, pignon, murs, porte en arc), décliné en matières et en accessoires.
// Trait noir franc, peu de tons, texture de bardeaux tramée. Un seul dessin à régler ici.

import { paintRamp, vnoise } from './paint.js';
import { mix, rng } from './draw.js';

const INK = '#14101a';
const tones = (base, spread = 0.085) => paintRamp(base, 6, { spread, shift: 0.7 });
const clampK = (k, n) => Math.max(0, Math.min(n - 1, Math.round(k)));

// ───────────────────────── Géométrie ─────────────────────────

function layout(o) {
  const w = o.w; // largeur du toit
  const half = Math.floor(w / 2);
  const D = o.depth ?? Math.round(w * 0.56); // recul du faîtage, en pixels écran
  const fall = o.fall ?? Math.round(half * 0.8); // hauteur du pignon
  const wallH = o.wallH ?? Math.round(w * 0.29);
  const lift = o.stilts ? 14 : 0;
  const pad = 4;
  const W = half * 2 + 1 + pad * 2;
  const cx = pad + half;
  const y0 = 2 + (o.topPad ?? 0);
  const apexY = y0 + D;
  const eaveY = apexY + fall;
  const wallTop = eaveY - 4;
  const baseY = wallTop + wallH;
  const inset = Math.max(4, Math.round(w * 0.055));
  const H = baseY + lift + 13;
  return {
    w, half, D, fall, wallH, lift, W, H, cx, y0, apexY, eaveY, wallTop, baseY,
    wx0: cx - half + inset,
    wx1: cx + half - inset,
    yBack: (x) => y0 + Math.abs(x - cx),
    yFront: (x) => apexY + (Math.abs(x - cx) * fall) / half,
  };
}

// Fenêtres de la façade : leurs centres servent aussi de points de lumière la nuit.
function windowSlots(g) {
  const off = Math.round((g.wx1 - g.wx0) * 0.3);
  return [g.cx - off, g.cx + off];
}

// ───────────────────────── Matières du toit ─────────────────────────
// (s : distance le long de la pente depuis le faîtage ; t : recul depuis le bord avant.)
// Renvoie un indice de ton dans la rampe, `lit` vaut 1 sur le pan éclairé (gauche).

const ROOFS = {
  shingle(s, t, x, y, lit, seed) {
    const row = Math.floor(t / 5);
    let k = lit ? 4 : 3;
    if (vnoise(s * 0.16, t * 0.16, seed) > 0.6) k -= 1;
    if ((x + y) % 2 === 0 && vnoise(s * 0.22 + 9, t * 0.22, seed) > 0.42) k += 1;
    if (t % 5 < 1 && vnoise(s * 0.28, row * 7.3, seed) > 0.36) k -= 2;
    if (!lit && vnoise(s * 0.3, t * 0.3, seed + 3) > 0.7) k -= 1;
    return k;
  },
  thatch(s, t, x, y, lit, seed) {
    const tier = t % 9;
    let k = (lit ? 3 : 2) + (tier > 6 ? 1 : 0) - (tier < 1 ? 2 : 0);
    if (vnoise(s * 0.9, t * 0.12, seed) > 0.55) k += 1;
    if (vnoise(s * 1.1, t * 0.1, seed + 5) > 0.62) k -= 1;
    return k;
  },
  slate(s, t, x, y, lit, seed) {
    const row = Math.floor(t / 5);
    let k = lit ? 4 : 2;
    if (t % 5 < 1) k -= 2;
    else if ((Math.floor(s) + row * 4) % 8 === 0) k -= 2;
    else if (t % 5 > 3) k -= 1;
    if (vnoise(s * 0.5, row * 3.1, seed) > 0.68) k += 1;
    return k;
  },
  slab(s, t, x, y, lit, seed) {
    const a = vnoise(s * 0.11, t * 0.11, seed);
    const b = vnoise(s * 0.11 + 0.18, t * 0.11 + 0.18, seed);
    let k = (lit ? 4 : 2) + (a > 0.55 ? 1 : a < 0.38 ? -1 : 0);
    if (Math.abs(a - b) < 0.012) k = 0;
    if ((x + y) % 2 === 0 && vnoise(s * 0.4, t * 0.4, seed + 2) > 0.66) k -= 1;
    return k;
  },
  leaves(s, t, x, y, lit, seed) {
    const row = Math.floor(t / 4);
    const a = vnoise(Math.floor((s + row * 3) / 4) * 1.7, row * 1.3, seed);
    let k = (lit ? 3.6 : 2.4) + (a - 0.5) * 3;
    if ((t % 4) + ((s + row * 3) % 4) < 1) k -= 2;
    return k;
  },
  stripes(s, t, x, y, lit) {
    let k = lit ? 4 : 3;
    if (t % 8 < 1) k -= 2;
    if ((x + y) % 2 === 0 && s % 3 < 1) k -= 1;
    return k;
  },
  glitch(s, t, x, y, lit, seed) {
    let k = lit ? 2 : 1;
    if (Math.floor(s / 6) % 3 === 0 && vnoise(s * 0.2, t * 0.9, seed) > 0.5) k += 2;
    if (vnoise(s * 0.7, t * 0.7, seed + 1) > 0.76) k = 5;
    if (t % 11 < 1) k -= 1;
    return k;
  },
};

// ───────────────────────── Maison ─────────────────────────

export function cottage(p, o) {
  const g = layout(o);
  const r = rng(o.seed ?? 7);
  const seed = o.seed ?? 7;
  const { cx } = g;

  const R = o.roofRamp ?? tones(o.roof);
  const R2 = o.roofAlt ? tones(o.roofAlt) : null;
  const T = tones(o.trim);
  const G = tones(o.gable ?? o.trim);
  const Wl = tones(o.wall, 0.07);
  const roofFn = ROOFS[o.roofKind ?? 'shingle'];

  // Ombre du bâtiment sur le sol.
  if (!o.noShadow) p.rect(cx + 3, g.wallTop + 6, g.half + 1, g.baseY + g.lift - g.wallTop - 5, '#0c1420', 0.28);

  drawWall(p, g, o, Wl, r, seed);
  drawGable(p, g, o, G, T, seed);

  // Pans du toit
  for (let x = cx - g.half; x <= cx + g.half; x++) {
    if (x === cx) continue;
    const lit = x < cx;
    const s = Math.abs(x - cx);
    const yb = g.yBack(x);
    const yf = g.yFront(x);
    for (let y = Math.floor(yb); y <= Math.ceil(yf); y++) {
      const t = yf - y;
      let ramp = R;
      if (R2 && Math.floor(t / 8) % 2) ramp = R2;
      let k = roofFn(s, t, x, y, lit, seed);
      if (o.moss) {
        const ms = o.mossScale ?? 0.14;
        const n = vnoise(x * ms, y * ms, seed + 21) + (t < 12 ? 0.08 : 0);
        if (n > 1 - o.moss) ramp = o.mossRamp;
      }
      p.set(x, y, ramp[clampK(k, 6)]);
    }
  }

  // Bord de toit irrégulier : quelques bardeaux dépassent moins que les autres.
  for (const side of [-1, 1]) {
    const x = cx + side * g.half;
    const yb = Math.round(g.yBack(x)) + 6;
    const yf = Math.round(g.yFront(x)) - 9;
    for (let y = yb; y <= yf; y++) {
      if ((Math.floor(y / 4) * 7 + seed) % 3 === 0) p.d[(y * p.w + x) * 4 + 3] = 0;
    }
  }

  drawTrims(p, g, T);
  drawRidge(p, g, T, o);
  drawChimney(p, g, o, seed);

  // Accessoires posés sur la maison, derrière le contour.
  o.onRoof?.(p, g, r);
  p.outline(1, { ink: INK });
  drawFront(p, g, o, Wl, r);
  o.onFront?.(p, g, r);
  drawGround(p, g, o, r);
  return g;
}

function drawWall(p, g, o, W, r, seed) {
  const { wx0, wx1, wallTop, baseY } = g;
  const kind = o.wallKind ?? 'plaster';
  for (let y = wallTop; y < baseY; y++)
    for (let x = wx0; x <= wx1; x++) {
      const u = x - wx0;
      const vv = y - wallTop;
      let k = 3;
      switch (kind) {
        case 'plaster': {
          const n = vnoise(x * 0.5, y * 0.5, seed);
          if (Math.floor(x / 2) % 3 === 0 && Math.floor(y / 2) % 3 === 1 && n > 0.45) k = n > 0.62 ? 4 : 2;
          if (u < 2 || wx1 - x < 2) k = 2;
          break;
        }
        case 'blocks': {
          const row = Math.floor(vv / 5);
          if (vv % 5 === 4) k = 1;
          else if ((u + row * 5) % 10 === 0) k = 1;
          else k = 3 + (vnoise(Math.floor((u + row * 5) / 10) * 3.1, row * 2.3, seed) > 0.55 ? 1 : 0);
          if (vv % 5 === 0) k += 1;
          break;
        }
        case 'logs': {
          const row = vv % 5;
          k = [4, 3, 3, 2, 0][row];
          if (vnoise(u * 0.3, Math.floor(vv / 5) * 4, seed) > 0.68) k -= 1;
          if (u < 3 || wx1 - x < 3) k = [5, 4, 3, 2, 0][row];
          break;
        }
        case 'plank': {
          const col = Math.floor(u / 5);
          k = u % 5 === 0 ? 0 : 3 + (vnoise(col * 3.3, y * 0.14, seed) > 0.5 ? 1 : -1);
          if (vnoise(u * 0.4, vv * 0.4, seed + 4) > 0.73) k = 1;
          break;
        }
        case 'timber': {
          const beam = u % 16 < 2 || wx1 - x < 2 || vv % 13 < 2;
          if (beam) k = -1;
          else if ((x + y) % 2 === 0 && vnoise(x * 0.3, y * 0.3, seed) > 0.62) k = 2;
          break;
        }
        case 'rock': {
          const a = vnoise(x * 0.17, y * 0.17, seed);
          const b = vnoise(x * 0.17 + 0.2, y * 0.17 + 0.2, seed);
          k = 3 + (a > 0.55 ? 1 : a < 0.4 ? -1 : 0);
          if (Math.abs(a - b) < 0.015) k = 0;
          break;
        }
        case 'marble': {
          k = 4;
          if (u % 14 < 3) k = u % 14 === 2 ? 2 : 5;
          else if (Math.abs(vnoise(x * 0.12, y * 0.2, seed) - 0.5) < 0.02) k = 2;
          break;
        }
        case 'painted': {
          k = 4;
          const band = vv > g.wallH - 12 && vv < g.wallH - 7;
          if (band) k = -2;
          if ((x + y) % 2 === 0 && vnoise(x * 0.3, y * 0.3, seed) > 0.68) k -= 1;
          break;
        }
        case 'void': {
          k = 1;
          if (u % 8 === 0 || vv % 8 === 0) k = vnoise(u * 0.4, vv * 0.4, seed) > 0.42 ? 5 : 2;
          break;
        }
      }
      if (vv < 3) k -= 1; // ombre de l'avant-toit
      const col = k === -1 ? (o.timber ?? '#4a2c1e') : k === -2 ? (o.band ?? '#c23b3b') : W[clampK(k, 6)];
      p.set(x, y, col);
    }
  // Soubassement en pierre
  if (!o.stilts) {
    const B = tones(o.base ?? '#7c7c80', 0.08);
    for (let y = baseY - 5; y < baseY; y++)
      for (let x = wx0; x <= wx1; x++) {
        const row = y - (baseY - 5);
        const seam = row === 2 || (x + (row > 2 ? 4 : 0)) % 8 === 0;
        p.set(x, y, B[seam ? 1 : row === 0 || row === 3 ? 4 : 3]);
      }
  } else {
    // sur pilotis : plancher et poteaux
    const B = tones(o.trim);
    for (let x = wx0 - 1; x <= wx1 + 1; x++) {
      p.set(x, g.baseY - 2, B[4]);
      p.set(x, g.baseY - 1, B[2]);
      p.set(x, g.baseY, INK);
    }
  }
  void r;
}

function drawGable(p, g, o, G, T, seed) {
  const { cx, apexY, wallTop } = g;
  for (let y = apexY; y < wallTop; y++)
    for (let x = g.wx0 - 2; x <= g.wx1 + 2; x++) {
      if (y < g.yFront(x) - 1) continue;
      const row = Math.floor(y / 3);
      const seg = Math.floor((x + row * 7) / 11);
      let k = y % 3 === 2 ? 1 : 3;
      const n = vnoise(seg * 2.7, row * 3.3, seed);
      if (y % 3 === 0 && n > 0.55) k = 4;
      if (y % 3 !== 2 && n < 0.3) k -= 1;
      if ((x + row * 7) % 11 === 0) k = 1;
      if (o.gableKind === 'plaster') k = 3 + ((x + y) % 2 === 0 && vnoise(x * 0.4, y * 0.4, seed) > 0.6 ? -1 : 0);
      // ombre portée par les rives
      if (y < g.yFront(x) + 3) k = Math.min(k, 1);
      p.set(x, y, G[clampK(k, 6)]);
    }
  // poutres apparentes en haut du mur
  const n = o.beams ?? 5;
  for (let i = 0; i < n; i++) {
    const bx = Math.round(g.wx0 + ((g.wx1 - g.wx0) * (i + 0.5)) / n) - 2;
    if (Math.abs(bx + 2 - cx) < 9) continue;
    p.rect(bx - 1, wallTop - 1, 7, 5, INK);
    p.rect(bx, wallTop - 1, 5, 4, T[3]);
    p.hline(bx, wallTop - 1, 5, T[4]);
    p.hline(bx, wallTop + 2, 5, T[2]);
  }
  // Petite fenêtre du pignon
  if (o.gableClock) {
    const cy = apexY + Math.round(g.fall * 0.62);
    p.ellipse(cx + 0.5, cy + 0.5, 8, 8, INK);
    p.ellipse(cx + 0.5, cy + 0.5, 7, 7, T[3]);
    p.ellipse(cx + 0.5, cy + 0.5, 5.2, 5.2, '#f2ecd6');
    p.vline(cx, cy - 4, 5, INK);
    p.hline(cx, cy, 4, INK);
    return;
  }
  const wy = apexY + Math.round(g.fall * 0.42);
  const ww = 9;
  const wh = 9;
  const wx = cx - 4;
  p.rect(wx - 1, wy - 1, ww + 2, wh + 2, INK);
  for (let y = 0; y < wh; y++)
    for (let x = 0; x < ww; x++) p.set(wx + x, wy + y, o.glowWindows ? (y < 4 ? '#f4d27a' : '#e0a050') : G[x % 3 === 2 ? 0 : x % 3 === 0 ? 1 : 2]);
  if (o.glowWindows) {
    p.vline(cx, wy, wh, INK);
    p.hline(wx, wy + 4, ww, INK);
  }
  p.rect(wx - 1, wy + wh, ww + 2, 1, INK);
  p.rect(wx - 2, wy + wh + 1, ww + 4, 2, T[4]);
  p.hline(wx - 2, wy + wh + 3, ww + 4, INK);
}

// Rives de toit : une bande le long du bord arrière, une double le long du pignon.
function drawTrims(p, g, T) {
  const { cx } = g;
  for (let x = cx - g.half; x <= cx + g.half; x++) {
    if (x === cx) continue;
    const yb = Math.round(g.yBack(x));
    const yf = Math.round(g.yFront(x));
    // arrière
    p.set(x, yb, T[3]);
    p.set(x, yb + 1, T[4]);
    p.set(x, yb + 2, T[3]);
    p.set(x, yb + 3, INK);
    p.set(x, yb + 4, T[1]);
    // avant
    p.set(x, yf - 7, T[1]);
    p.set(x, yf - 6, INK);
    p.set(x, yf - 5, T[3]);
    p.set(x, yf - 4, T[4]);
    p.set(x, yf - 3, INK);
    p.set(x, yf - 2, T[3]);
    p.set(x, yf - 1, T[2]);
    p.set(x, yf, T[1]);
    p.set(x, yf + 1, INK);
    p.set(x, yf + 2, INK);
    p.set(x, yf + 3, mix(T[0], INK, 0.5));
  }
}

function drawRidge(p, g, T, o) {
  const { cx, y0, apexY } = g;
  for (let y = y0 - 1; y <= apexY + 1; y++) {
    p.set(cx - 3, y, INK);
    p.set(cx + 3, y, INK);
    for (let x = -2; x <= 2; x++) {
      const n = vnoise((cx + x) * 0.6, y * 0.25, 4);
      let k = x === -2 ? 4 : x === 2 ? 2 : 3;
      if (n > 0.66) k -= 1;
      p.set(cx + x, y, T[clampK(k, 6)]);
    }
  }
  p.hline(cx - 3, y0 - 2, 7, INK);
  // about de la poutre
  p.rect(cx - 2, apexY - 6, 5, 7, T[2]);
  p.hline(cx - 2, apexY - 6, 5, T[5]);
  p.rect(cx - 1, apexY - 3, 3, 3, T[0]);
  p.hline(cx - 2, apexY + 2, 5, INK);
  void o;
}

function drawChimney(p, g, o, seed) {
  if (o.chimney === false) return;
  const C = tones(o.chimney ?? '#7f8cae', 0.08);
  const x0 = g.cx + Math.round(g.half * 0.38);
  const x1 = g.cx + Math.round(g.half * 0.62);
  const top = g.y0 + Math.round(g.half * 0.42);
  const bot = (x) => g.yBack(x) + Math.round(g.half * 0.42);
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const yb = bot(x);
    for (let y = top - 1; y <= yb + 1; y++) p.set(x, y, INK);
  }
  for (let x = x0; x <= x1; x++) {
    const yb = bot(x);
    for (let y = top; y <= yb; y++) {
      let k = y < top + 6 ? 4 : 2;
      if (y >= top + 6 && Math.floor(x / 2) % 2 === 0 && Math.floor(y / 2) % 2 === 0 && vnoise(x * 0.5, y * 0.5, seed + 2) > 0.5) k = 1;
      if (y === top + 6) k = 1;
      p.set(x, y, C[k]);
    }
  }
  p.rect(x0 + 2, top + 2, x1 - x0 - 3, 2, '#1c1a30');
  if (o.ember) p.rect(x0 + 3, top + 3, x1 - x0 - 5, 1, o.ember);
}

function drawFront(p, g, o, W, r) {
  const { cx, wallTop, baseY } = g;
  const Tr = tones(o.frame ?? o.trim);
  const D = tones(o.door, 0.07);

  // Fenêtres
  const wy = wallTop + 6;
  const wh = Math.max(9, g.wallH - 17);
  for (const sx of windowSlots(g)) {
    const ww = 9;
    const x = sx - 4;
    p.rect(x - 3, wy - 2, ww + 6, 2, INK);
    p.rect(x - 2, wy - 1, ww + 4, 1, Tr[4]);
    p.rect(x - 2, wy, ww + 4, wh, INK);
    p.vline(x - 1, wy, wh, Tr[3]);
    p.vline(x + ww, wy, wh, Tr[2]);
    for (let j = 0; j < wh; j++)
      for (let i = 0; i < ww - 1; i++) {
        const upper = j < wh / 2;
        const c = o.glowWindows ? (upper ? '#f8dc8c' : '#e8a858') : upper ? '#5a2030' : '#181a34';
        p.set(x + i, wy + j, c);
      }
    p.vline(sx - 1, wy, wh, Tr[2]);
    p.hline(x, wy + Math.floor(wh / 2), ww - 1, Tr[1]);
    p.rect(x - 3, wy + wh, ww + 6, 3, INK);
    p.rect(x - 2, wy + wh, ww + 4, 2, Tr[4]);
    p.hline(x - 2, wy + wh + 1, ww + 4, Tr[2]);
    if (o.flowerBox) {
      for (let i = 0; i < ww + 2; i++) p.set(x - 1 + i, wy + wh - 1, i % 2 ? o.flowerBox : '#3f8a4a');
    }
  }

  // Porte en arc
  const dw = o.doorW ?? 13;
  const dx0 = cx - Math.floor(dw / 2);
  const dTop = wallTop + 1;
  const dBot = baseY + 1;
  const corner = (x, y) => {
    const a = Math.min(x - dx0 + 3, dx0 + dw + 2 - x);
    return Math.max(0, 3 - a) + dTop - 3 > y;
  };
  for (let y = dTop - 3; y < dBot; y++)
    for (let x = dx0 - 3; x <= dx0 + dw + 2; x++) {
      const a = Math.min(x - (dx0 - 3), dx0 + dw + 2 - x);
      if (y - (dTop - 3) + a < 3) continue;
      p.set(x, y, INK);
    }
  void corner;
  for (let y = dTop - 2; y < dBot; y++)
    for (let x = dx0 - 2; x <= dx0 + dw + 1; x++) {
      const a = Math.min(x - (dx0 - 2), dx0 + dw + 1 - x);
      if (y - (dTop - 2) + a < 3) continue;
      p.set(x, y, a === 0 ? Tr[3] : y === dTop - 2 || y - (dTop - 2) + a === 3 ? Tr[4] : Tr[3]);
    }
  for (let y = dTop; y < dBot; y++)
    for (let x = dx0 - 1; x <= dx0 + dw; x++) {
      const a = Math.min(x - (dx0 - 1), dx0 + dw - x);
      if (y - dTop + a < 2) continue;
      p.set(x, y, INK);
    }
  for (let y = dTop + 1; y < dBot - 1; y++)
    for (let x = dx0; x < dx0 + dw; x++) {
      const a = Math.min(x - dx0, dx0 + dw - 1 - x);
      if (y - (dTop + 1) + a < 2) continue;
      let k = 3;
      if ((x - dx0) % 4 === 3) k = 1;
      else if ((x - dx0) % 4 === 0) k = 4;
      if (y < dTop + 4) k -= 1;
      p.set(x, y, o.doorGlow ? mix(D[clampK(k, 6)], o.doorGlow, 0.45) : D[clampK(k, 6)]);
    }
  // ferrures et poignée
  p.rect(dx0, dTop + 6, 2, 2, '#5a5a66');
  p.rect(dx0, dBot - 7, 2, 2, '#5a5a66');
  p.rect(dx0 + dw - 3, dBot - 8, 2, 3, '#a8b0c8');
  p.set(dx0 + dw - 3, dBot - 8, '#f0f4ff');
  p.hline(dx0 - 1, dBot - 1, dw + 2, INK);

  if (o.sign) drawSign(p, g, o, Tr);

  // Marches et chemin
  const S = tones(o.step ?? '#8a8a90', 0.08);
  if (o.stilts) {
    for (let y = baseY + 1; y < baseY + g.lift + 4; y++) {
      const w = dw + 2;
      const x = cx - Math.floor(w / 2);
      p.vline(x, y, 1, INK);
      p.vline(x + w, y, 1, INK);
      p.hline(x + 1, y, w - 1, (y - baseY) % 3 === 0 ? INK : Tr[3 - ((y - baseY) % 3 === 1 ? 0 : 1)]);
    }
    return;
  }
  for (let i = 0; i < 3; i++) {
    const y = baseY + 1 + i * 2;
    const w = dw + 2 + i * 2;
    const x = cx - Math.floor(w / 2);
    p.rect(x - 1, y, w + 2, 2, INK);
    p.hline(x, y, w, S[4 - i]);
  }
  const pathY = baseY + 7;
  const Pa = tones(o.path ?? '#a56f4c', 0.07);
  for (let y = pathY; y < g.H; y++)
    for (let x = cx - Math.floor(dw / 2) - 1; x <= cx + Math.floor(dw / 2) + 1; x++) {
      const a = 1 - (y - pathY) / (g.H - pathY + 3);
      if (r() > a + 0.5) continue;
      p.set(x, y, Pa[r() < 0.08 ? 4 : r() < 0.16 ? 2 : 3]);
    }
}

// Enseigne en bois au-dessus de la porte (lettres 3×5).
const LETTERS = {
  G: ['111', '100', '101', '101', '111'],
  A: ['010', '101', '111', '101', '101'],
  R: ['110', '101', '110', '101', '101'],
  E: ['111', '100', '110', '100', '111'],
};

function drawSign(p, g, o, Tr) {
  const word = 'GARE';
  const w = word.length * 4 + 3;
  const x = g.cx - Math.floor(w / 2);
  const y = g.wallTop - 9;
  p.rect(x - 1, y - 1, w + 2, 9, INK);
  p.rect(x, y, w, 7, Tr[4]);
  p.hline(x, y + 6, w, Tr[2]);
  [...word].forEach((ch, i) => {
    LETTERS[ch].forEach((row, j) => {
      [...row].forEach((v, k) => {
        if (v === '1') p.set(x + 2 + i * 4 + k, y + 1 + j, o.signInk ?? '#2a1810');
      });
    });
  });
}

// Pieds de la maison : herbes hautes, boue, nuages… selon le biome.
function drawGround(p, g, o, r) {
  const n = o.tufts ?? 12;
  const pal = o.grass ?? ['#2e6a48', '#3f8a4c', '#5aa84c', '#8ad060'];
  const y1 = g.baseY + g.lift + 6;
  for (let i = 0; i < n; i++) {
    const left = i % 2 === 0;
    const base = left ? 1 + r() * (g.half * 0.55) : g.W - 2 - r() * (g.half * 0.55);
    const dist = Math.abs(base - g.cx);
    if (dist < 12) continue;
    const by = Math.round(y1 + r() * 6);
    const h = Math.round((o.tuftH ?? 18) * (0.5 + r() * 0.7));
    tuft(p, Math.round(base), by, h, pal, r);
  }
}

// Une touffe : brins fins et hauts, crochet au sommet, base sombre.
function tuft(p, x, y, h, pal, r) {
  for (let b = 0; b < 5; b++) {
    const bx = x + (b - 2) * 2 + Math.floor(r() * 2);
    const hh = Math.max(3, Math.round(h * (0.5 + r() * 0.6)));
    const dir = r() < 0.5 ? -1 : 1;
    const c = pal[r() < 0.4 ? 3 : r() < 0.6 ? 2 : 1];
    for (let j = 0; j < hh; j++) {
      p.set(bx, y - j, j < hh * 0.25 ? pal[0] : j < hh * 0.55 ? pal[1] : c);
      p.set(bx + 1, y - j, pal[0]);
    }
    p.set(bx + dir, y - hh, c);
    p.set(bx + dir, y - hh + 1, c);
  }
}

// ───────────────────────── Déclinaisons ─────────────────────────

const GREEN_MOSS = tones('#5f8a3c');

const crystal = (p, x, y, h, c) => {
  const R = tones(c, 0.1);
  for (let j = 0; j < h; j++) {
    const w = Math.max(1, Math.round(((h - j) / h) * 2.5));
    for (let i = -w; i <= w; i++) p.set(x + i, y - h + (h - j), i < 0 ? R[4] : i === 0 ? R[5] : R[2]);
  }
};

const puff = (p, x, y, rad) => {
  p.ellipse(x, y, rad + 1, rad * 0.72 + 1, INK);
  p.ellipse(x, y, rad, rad * 0.72, '#f6f4ff');
  p.ellipse(x + rad * 0.2, y + rad * 0.2, rad * 0.8, rad * 0.45, '#c8cdea');
  p.ellipse(x - rad * 0.2, y - rad * 0.12, rad * 0.62, rad * 0.4, '#ffffff');
};

const pennant = (p, x, y, c) => {
  p.vline(x, y, 12, INK);
  for (let j = 0; j < 7; j++) p.hline(x + 1, y + j, 7 - Math.abs(3 - j) * 2, c);
};

const lantern = (p, x, y, c = '#f4d27a') => {
  p.vline(x, y - 3, 3, INK);
  p.rect(x - 2, y, 5, 6, INK);
  p.rect(x - 1, y + 1, 3, 4, c);
};

const shroom = (p, x, y, c) => {
  p.vline(x, y - 3, 3, '#d8d4c8');
  p.rect(x - 2, y - 5, 5, 2, c);
  p.hline(x - 1, y - 6, 3, c);
};

// Les huit biomes (le champ a deux modèles : la grange et la ferme). `w` est la largeur du toit.
const WHEAT_GRASS = ['#8f6a22', '#b58a2e', '#d2a63c', '#f6dc7c'];
const STYLES = {
  city_a: {
    w: 84,
    roof: '#7c6a58',
    roofKind: 'slate',
    trim: '#e4dac4',
    gable: '#a8402e',
    wall: '#a8402e',
    wallKind: 'plank',
    door: '#e4dac4',
    chimney: false,
    grass: WHEAT_GRASS,
    tufts: 10,
    tuftH: 9,
  },
  city_b: {
    w: 72,
    roof: '#c8a850',
    roofKind: 'thatch',
    trim: '#7c5a42',
    gable: '#e4d8b8',
    gableKind: 'plaster',
    wall: '#e4d8b8',
    wallKind: 'timber',
    door: '#3f7a5a',
    chimney: '#a8644c',
    flowerBox: '#e0506a',
    grass: WHEAT_GRASS,
    tufts: 10,
    tuftH: 9,
  },
  forest: {
    w: 76,
    roof: '#b89a50',
    roofKind: 'thatch',
    moss: 0.3,
    mossRamp: GREEN_MOSS,
    trim: '#7a5234',
    gable: '#8a5e3a',
    wall: '#8c6238',
    wallKind: 'logs',
    door: '#4a7a3c',
    base: '#6c6e64',
    chimney: '#7a7a6c',
    path: '#7c6a4a',
    onFront: (p, g, r) => {
      for (let i = 0; i < 5; i++) shroom(p, g.wx0 - 2 + Math.floor(r() * 14), g.baseY + 6 + Math.floor(r() * 4), i % 2 ? '#d84a3a' : '#e8c070');
    },
  },
  swamp: {
    w: 72,
    roof: '#6e6a44',
    roofKind: 'thatch',
    moss: 0.42,
    mossRamp: tones('#4f6a34'),
    trim: '#54503a',
    gable: '#5c5440',
    wall: '#5c5a44',
    wallKind: 'plank',
    door: '#3e5a50',
    stilts: true,
    wallH: 19,
    chimney: '#5a5c50',
    ember: '#c8e070',
    grass: ['#2e4632', '#44603a', '#6a8444', '#a0a850'],
    noShadow: true,
    onFront: (p, g, r) => {
      const y1 = g.baseY + 1;
      const T = tones('#54503a');
      for (const x of [g.wx0 + 2, g.wx0 + 16, g.wx1 - 18, g.wx1 - 4]) {
        p.rect(x - 1, y1, 5, g.lift + 3, INK);
        p.rect(x, y1, 3, g.lift + 3, T[3]);
        p.vline(x + 2, y1, g.lift + 3, T[1]);
      }
      // eau noire sous la maison
      const wy = g.baseY + g.lift + 7;
      for (let y = wy - 5; y < g.H; y++)
        for (let x = 0; x < g.W; x++) {
          const dx = (x - g.cx) / (g.half + 2);
          const dy = (y - wy) / 6;
          if (dx * dx + dy * dy > 1 || r() < 0.06) continue;
          p.set(x, y, (x + y * 3) % 11 === 0 ? '#5a7a60' : '#25382e');
        }
    },
  },
  night: {
    w: 78,
    roof: '#51507a',
    roofKind: 'slate',
    trim: '#3c3650',
    gable: '#40384e',
    wall: '#5c5a70',
    wallKind: 'blocks',
    door: '#6a2436',
    base: '#44444e',
    chimney: '#4a4a60',
    ember: '#e08040',
    glowWindows: true,
    path: '#55505a',
    grass: ['#26304a', '#34405a', '#4a5468', '#667080'],
    onFront: (p, g) => lantern(p, g.cx + 12, g.wallTop + 4),
  },
  sky: {
    w: 72,
    roof: '#6aa0e0',
    roofKind: 'slate',
    trim: '#d8b35a',
    gable: '#f2eee0',
    gableKind: 'plaster',
    wall: '#f0ecdc',
    wallKind: 'marble',
    door: '#e0a83a',
    chimney: '#f0ecdc',
    frame: '#d8b35a',
    tufts: 0,
    noShadow: true,
    onFront: (p, g, r) => {
      for (let x = g.wx0 + 3; x <= g.wx1 - 2; x += 6) {
        if (Math.abs(x - g.cx) < 12) continue;
        puff(p, x, g.baseY + 4 + r() * 2, 5 + r() * 2);
      }
    },
  },
  cave: {
    w: 76,
    roof: '#6c6684',
    roofKind: 'slab',
    trim: '#4a4560',
    gable: '#544e68',
    wall: '#6a6480',
    wallKind: 'rock',
    door: '#3e5f7a',
    doorGlow: '#60d0f0',
    base: '#44405a',
    chimney: false,
    glowWindows: true,
    path: '#4e4a62',
    step: '#5c5872',
    grass: ['#2c2a44', '#3a3858', '#4a4670', '#5c5888'],
    tufts: 8,
    tuftH: 7,
    onRoof: (p, g) => {
      crystal(p, g.cx - 22, g.yBack(g.cx - 22) + 22, 12, '#b890f0');
      crystal(p, g.cx - 28, g.yBack(g.cx - 28) + 20, 8, '#80e0f0');
      crystal(p, g.cx + 20, g.yBack(g.cx + 20) + 24, 13, '#80e0f0');
      crystal(p, g.cx + 26, g.yBack(g.cx + 26) + 22, 8, '#b890f0');
    },
    onFront: (p, g, r) => {
      for (let i = 0; i < 5; i++) shroom(p, g.wx0 - 4 + Math.floor(r() * 15), g.baseY + 6 + Math.floor(r() * 4), '#6ae0d8');
    },
  },
  sylve: {
    w: 76,
    roof: '#a48ad0',
    roofKind: 'leaves',
    moss: 0.2,
    mossScale: 0.55,
    mossRamp: tones('#e0bc58'),
    trim: '#c8a860',
    gable: '#e2dcc8',
    gableKind: 'plaster',
    wall: '#dcd8d0',
    wallKind: 'marble',
    door: '#2f8a7a',
    base: '#b8b4c4',
    chimney: false,
    frame: '#c8a860',
    glowWindows: true,
    path: '#c8c0d8',
    step: '#c8c4d4',
    grass: ['#2f6a5a', '#3f9a78', '#62c090', '#b0e8a0'],
    flowerBox: '#f0a0e0',
    onFront: (p, g) => {
      lantern(p, g.cx - 13, g.wallTop + 5, '#a0f0d0');
      lantern(p, g.cx + 13, g.wallTop + 5, '#a0f0d0');
    },
  },
  stade: {
    w: 76,
    roof: '#8a1c3c',
    roofAlt: '#e8e4dc',
    roofKind: 'stripes',
    trim: '#1c3a8a',
    gable: '#e8e4dc',
    gableKind: 'plaster',
    wall: '#e8e4dc',
    wallKind: 'painted',
    band: '#1c3a8a',
    timber: '#1c3a8a',
    door: '#1c3a8a',
    base: '#8a8a90',
    chimney: false,
    frame: '#8a1c3c',
    path: '#e8e4dc',
    grass: ['#2f7a3a', '#3f9a44', '#5ab84c', '#8ae060'],
    tufts: 10,
    tuftH: 6,
    onRoof: (p, g) => {
      pennant(p, g.cx - 22, g.yBack(g.cx - 22) - 8, '#f0c040');
      pennant(p, g.cx + 16, g.yBack(g.cx + 16) - 8, '#f0c040');
    },
  },
  void: {
    w: 72,
    roof: '#27306e',
    roofKind: 'shingle',
    trim: '#dcb55a',
    gable: '#1e2658',
    gableKind: 'plaster',
    wall: '#20285c',
    wallKind: 'void',
    door: '#dcb55a',
    doorGlow: '#fff2c8',
    base: '#2a2f5a',
    chimney: '#7a5a22',
    ember: '#ffd890',
    glowWindows: true,
    frame: '#dcb55a',
    path: '#b08e52',
    step: '#cfae6e',
    tufts: 0,
    onFront: (p, g, r) => {
      // petits rouages tombés autour de la maison
      for (let i = 0; i < 7; i++) {
        const x = 3 + Math.floor(r() * (g.W - 6));
        const y = g.baseY + 3 + Math.floor(r() * 8);
        if (Math.abs(x - g.cx) < 11) continue;
        p.rect(x - 1, y - 1, 4, 4, INK);
        p.rect(x, y, 2, 2, r() < 0.5 ? '#dcb55a' : '#fbe8a0');
      }
    },
  },
};

// Gares : même architecture, en plus grand, avec enseigne et horloge.
const STATION_OF = {
  city: 'city_a',
  forest: 'forest',
  swamp: 'swamp',
  night: 'night',
  sky: 'sky',
  cave: 'cave',
  sylve: 'sylve',
  stade: 'stade',
  void: 'void',
};

const houseKey = (id) => (id === 'city_a' ? 'house_a' : id === 'city_b' ? 'house_b' : `house_${id}`);

export function generateCottages(d) {
  Object.entries(STYLES).forEach(([id, st], i) => {
    const key = houseKey(id);
    const g = layout(st);
    d(key, g.W, g.H, (p) => cottage(p, { ...st, seed: i * 13 + 5 }));
  });
  Object.entries(STATION_OF).forEach(([kind, id], i) => {
    const st = stationStyle(id);
    const g = layout(st);
    d(`station_${kind}`, g.W, g.H, (p) => cottage(p, { ...st, seed: i * 17 + 3 }));
  });
}

function stationStyle(id) {
  return { ...STYLES[id], w: 104, depth: 44, wallH: 34, doorW: 17, sign: true, gableClock: true, beams: 7, tufts: STYLES[id].tufts === 0 ? 0 : 10 };
}

// Points lumineux : les fenêtres de la façade, pour les nuits.
export function cottageLights() {
  const out = {};
  const add = (key, st) => {
    const g = layout(st);
    const y = g.wallTop + 11;
    out[key] = windowSlots(g).map((x) => [x, y]);
  };
  for (const [id, st] of Object.entries(STYLES)) add(houseKey(id), st);
  for (const [kind, id] of Object.entries(STATION_OF)) add(`station_${kind}`, stationStyle(id));
  return out;
}

// Pour les planches de contrôle.
export const COTTAGE_KEYS = Object.keys(STYLES).map(houseKey);
