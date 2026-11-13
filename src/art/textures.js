// Textures du monde : sols raccordables, voie, train vu de haut et de derrière, effets, icônes.
// Tout est dessiné par code avec Pix (voir draw.js) : volumes ombrés, tramage, contours colorés.

import { Pix, paint, ramp, mix, rng, fbm, bayer } from './draw.js';
import { generateDecor } from './decor.js';
import { realmGrounds } from './realms.js';
import { fieldGround } from './field.js';
import { stadiumGround } from './stadium.js';
import { chronoGround } from './chrono.js';

export const TRAIN = {
  // hauteur (pixels d'art) de chaque élément et chevauchement avec le précédent
  loco: { h: 66 },
  tender: { h: 30, overlap: 5 },
  coach: { h: 58, overlap: 4 },
  skylights: [5, 16, 27, 38], // y des verrières dans une voiture
};

export function generateTextures(scene) {
  groundTiles(scene);
  fieldGround(scene);
  realmGrounds(scene);
  stadiumGround(scene);
  chronoGround(scene);
  track(scene);
  train(scene);
  effects(scene);
  icons(scene);
  generateDecor(scene);
}

// ───────────────────────── Sols (128×128, raccordables) ─────────────────────────

const T = 128;

function eachPixel(px, fn) {
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) fn(x, y);
}

// Choisit une teinte dans une rampe selon t ∈ [0,1], avec tramage ordonné.
function pick(pal, t, x, y, dither = 0.9) {
  const k = Math.floor(t * pal.length + (bayer(x, y) - 0.5) * dither);
  return pal[Math.max(0, Math.min(pal.length - 1, k))];
}

function groundTiles(scene) {
  const make = (key, draw) => paint(scene, key, T, T, draw, { wrap: true });

  // Forêt : herbe vive nuancée, touffes, fleurs colorées, terre par endroits.
  // Herbe en aplats francs (3 tons, sans tramage), brins en V et fleurs, façon vue d'avion.
  make('ground_forest', (p) => {
    const r = rng(21);
    const n = fbm(T, T, 21, [64, 32, 16]);
    const grass = ['#3c7032', '#467e38', '#548e40', '#64a046', '#7cb850', '#9ccc62'];
    eachPixel(p, (x, y) => {
      const v = n(x, y);
      p.set(x, y, v < 0.36 ? grass[1] : v < 0.62 ? grass[2] : grass[3]);
    });
    for (let i = 0; i < 420; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      p.set(x, y, n(x, y) < 0.5 ? grass[1] : grass[4]);
    }
    // touffes en éventail : ombre au pied, brins clairs en V
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      p.hline(x - 2, y + 1, 5, grass[0]);
      p.set(x, y, grass[1]);
      p.set(x - 1, y - 1, grass[4]);
      p.set(x - 2, y - 2, grass[5]);
      p.set(x + 1, y - 1, grass[4]);
      p.set(x + 2, y - 2, grass[5]);
      p.set(x, y - 2, grass[5]);
    }
    // fleurs : quatre pétales autour d'un cœur
    const petals = ['#f4f0e0', '#f2cc4a', '#e8607a', '#9a8ae8'];
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      const c = petals[i % petals.length];
      p.set(x, y + 2, grass[0]);
      if (i % 2 === 0) {
        p.set(x - 1, y, c);
        p.set(x + 1, y, c);
        p.set(x, y - 1, c);
        p.set(x, y + 1, c);
        p.set(x, y, '#f8e070');
      } else p.set(x, y, c);
    }
  });

  // Marais : boue, flaques d'eau sombre avec reflets, algues.
  make('ground_swamp', (p) => {
    const r = rng(31);
    const n = fbm(T, T, 31, [64, 32, 16, 8]);
    const mud = ramp('#53503a', 5, 0.05);
    const water = ramp('#2f3f3e', 4, 0.045);
    eachPixel(p, (x, y) => {
      const v = n(x, y);
      if (v > 0.6) {
        p.set(x, y, pick(water, (v - 0.6) * 4, x, y));
        if (v < 0.615) p.set(x, y, '#6c6a4c');
      } else p.set(x, y, pick(mud, (v - 0.25) * 2.2, x, y));
    });
    eachPixel(p, (x, y) => {
      const v = n(x, y);
      if (v > 0.64 && (x * 3 + y * 7) % 23 === 0 && r() < 0.6) {
        p.hline(x, y, 3, '#5d7270');
        p.set(x + 1, y, '#7e9290');
      } else if (v < 0.56 && r() < 0.02) p.set(x, y, '#5e6d3c');
    });
  });

  // Lande nocturne : herbe rase, bruyère, cailloux (l'éclairage de nuit l'assombrit ensuite).
  make('ground_night', (p) => {
    const r = rng(41);
    const n = fbm(T, T, 41, [32, 16, 8]);
    const m = fbm(T, T, 42, [64, 32, 16]);
    const grass = ramp('#4c5a43', 5, 0.05);
    const heather = ramp('#57465c', 4, 0.05);
    eachPixel(p, (x, y) => {
      const v = n(x, y);
      p.set(x, y, m(x, y) > 0.6 ? pick(heather, (v - 0.3) * 2, x, y) : pick(grass, (v - 0.25) * 2, x, y));
    });
    for (let i = 0; i < 700; i++) {
      const x = Math.floor(r() * T);
      const y = Math.floor(r() * T);
      p.set(x, y, grass[0]);
      p.set(x, y - 1, grass[3]);
    }
    for (let i = 0; i < 30; i++) {
      const x = r() * T;
      const y = r() * T;
      p.blob(x, y, 1.6, 1.2, ramp('#6e6d6a', 4, 0.08), { r });
    }
  });

  // Mer de nuages : relief ombré (estampage) sur un bruit, trouées sur le ciel.
  make('ground_sky', (p) => {
    const n = fbm(T, T, 51, [64, 32, 16, 8]);
    const cloud = ramp('#d6d9ea', 6, 0.055);
    const deep = ramp('#7f98c4', 4, 0.05);
    eachPixel(p, (x, y) => {
      const h = n(x, y);
      if (h < 0.44) {
        p.set(x, y, pick(deep, (h - 0.25) * 4, x, y));
        return;
      }
      const emb = n(x - 1, y - 1) - n(x + 1, y + 1);
      const t = 0.45 + (h - 0.44) * 1.5 + emb * 9;
      p.set(x, y, h < 0.455 ? cloud[0] : pick(cloud, t, x, y));
    });
  });
}

// ───────────────────────── Voie (44×16, raccordable en hauteur) ─────────────────────────

export const TRACK_W = 44;

function track(scene) {
  paint(
    scene,
    'track',
    TRACK_W,
    16,
    (p) => {
      const r = rng(7);
      const gravel = ramp('#77726a', 5, 0.07);
      // ballast : gravier en petits volumes, bords effilochés
      for (let i = 0; i < 260; i++) {
        const x = 3 + r() * 38;
        const y = r() * 16;
        const edge = Math.min(x - 3, 41 - x);
        if (edge < 3 && r() > edge / 3) continue;
        p.blob(x, y, 1.3, 1.1, gravel, { r, grain: 0.3 });
      }
      // traverses en bois
      const wood = ramp('#5b4636', 5, 0.06);
      for (const y0 of [2, 10]) {
        p.rect(7, y0 + 3, 30, 1, '#2a2522', 0.5); // ombre
        for (let j = 0; j < 3; j++)
          for (let i = 0; i < 30; i++) p.set(7 + i, y0 + j, pick(wood, 0.75 - j * 0.28 + (r() - 0.5) * 0.2, i, j, 0.5));
        p.hline(9 + Math.floor(r() * 6), y0 + 1, 7, wood[1]);
        p.hline(22 + Math.floor(r() * 6), y0 + 1, 6, wood[1]);
        // selles et tire-fonds
        for (const rx of [12, 28]) {
          p.rect(rx, y0, 4, 3, '#3d3c3e');
          p.set(rx, y0 + 1, '#77777b');
          p.set(rx + 3, y0 + 1, '#77777b');
        }
      }
      // rails : ombre, flanc, champignon brillant
      for (const rx of [13, 29]) {
        p.rect(rx + 2, 0, 1, 16, '#1c1b1e', 0.45);
        p.rect(rx, 0, 1, 16, '#5c6068');
        p.rect(rx + 1, 0, 1, 16, '#c9ced6');
        for (let y = 0; y < 16; y += 4) p.set(rx + 1, y, '#e8ecf0');
      }
    },
    { wrap: true },
  );
}

// ───────────────────────── Train ─────────────────────────

const LOCO_GREEN = '#2f4a3c';
const BRASS = '#b8954f';
const BODY = '#5e2a2e';
const ROOF = '#4a5057';

function rivets(p, x, y, w, c, step = 3) {
  for (let i = 0; i < w; i += step) p.set(x + i, y, c);
}

function train(scene) {
  const brass = ramp(BRASS, 5, 0.09);
  const green = ramp(LOCO_GREEN, 6, 0.06);
  const steel = ramp('#3a3e45', 5, 0.06);
  const red = ramp('#8a2b24', 4, 0.07);

  // Locomotive : avant (traverse rouge) en haut, cabine en bas, ouverte vers le tender.
  paint(scene, 'loco', 32, TRAIN.loco.h, (p) => {
    // tabliers latéraux
    p.rect(3, 6, 26, 40, steel[1]);
    p.vline(3, 6, 40, steel[0]);
    p.vline(28, 6, 40, steel[0]);
    p.vline(4, 6, 40, steel[2]);
    for (let y = 9; y < 44; y += 6) {
      p.set(5, y, steel[3]);
      p.set(26, y, steel[3]);
    }
    // caisses à outils sur les tabliers
    p.rect(4, 30, 3, 8, steel[2]);
    p.hline(4, 30, 3, steel[4]);
    p.rect(25, 30, 3, 8, steel[2]);
    p.hline(25, 30, 3, steel[4]);
    // traverse avant, tampons, lanterne
    p.rect(2, 2, 28, 4, red[2]);
    p.hline(2, 2, 28, red[3]);
    p.hline(2, 5, 28, red[0]);
    for (const bx of [5, 26]) p.blob(bx, 1.5, 2, 1.6, ramp('#6c7078', 4, 0.08));
    p.rect(14, 1, 4, 2, '#e8e0c0');
    p.set(14, 1, '#fff8de');
    // boîte à fumée et cheminée
    p.cylinderV(8, 6, 16, 9, steel);
    p.hline(8, 14, 16, steel[0]);
    p.blob(16, 9.5, 3.4, 3, ramp('#2c2e33', 5, 0.08));
    p.ellipse(16, 9.5, 1.8, 1.5, '#0d0d10');
    // chaudière verte, cerclages laiton, dômes
    p.cylinderV(8, 15, 16, 27, green);
    for (const y of [18, 27, 36]) p.cylinderV(8, y, 16, 1, brass);
    p.blob(16, 23, 3.4, 3.2, brass, { r: rng(3) });
    p.blob(16, 32, 3, 2.8, green);
    p.set(16, 39, brass[4]);
    p.set(16, 40, brass[2]);
    // mains courantes
    p.vline(7, 15, 26, brass[1]);
    p.vline(24, 15, 26, brass[1]);
    // cabine : toit bombé avec gouttière
    p.rect(2, 42, 28, 16, green[1]);
    p.cylinderV(3, 42, 26, 15, ramp('#33373e', 6, 0.06));
    p.hline(3, 42, 26, '#5a6068');
    p.hline(3, 56, 26, '#1d1f24');
    p.rect(13, 45, 6, 4, '#2a2d33');
    p.hline(13, 45, 6, '#4b5058');
    // fenêtres latérales de cabine
    p.rect(2, 45, 1, 5, '#8fb2c8');
    p.rect(29, 45, 1, 5, '#8fb2c8');
    // plancher de cabine : lueur du foyer et conducteur (le joueur !)
    p.rect(3, 57, 26, 8, '#26211d');
    for (let y = 57; y < 65; y++)
      for (let x = 9; x < 19; x++) {
        const d = Math.hypot((x - 13.5) / 6, (y - 58) / 6);
        if (d < 1) p.set(x, y, mix('#f0a050', '#26211d', d), 1);
      }
    p.rect(11, 57, 5, 2, '#ffd27a');
    p.blob(21.5, 60, 2.8, 2.6, ramp('#2a3446', 4, 0.08)); // casquette
    p.hline(20, 58, 3, '#c9a45c');
    p.vline(3, 57, 8, green[2]);
    p.vline(28, 57, 8, green[0]);
    p.outline(0.6);
  });

  // Tender : charbon et trappe à eau.
  paint(scene, 'tender', 32, TRAIN.tender.h, (p) => {
    const r = rng(5);
    p.rect(2, 1, 28, 22, green[2]);
    p.vline(2, 1, 22, green[1]);
    p.vline(29, 1, 22, green[0]);
    p.hline(2, 1, 28, green[4]);
    p.rect(4, 3, 24, 13, '#16161a');
    const coal = ramp('#2c2c33', 5, 0.08);
    for (let i = 0; i < 60; i++) p.blob(5 + r() * 22, 4 + r() * 11, 1.6, 1.3, coal, { r, grain: 0.4 });
    p.rect(4, 17, 24, 5, green[3]);
    p.blob(16, 19.5, 3.5, 2, brass);
    p.ellipse(16, 19.5, 1.5, 0.9, brass[0]);
    // face arrière
    p.rect(2, 23, 28, 6, green[1]);
    p.hline(2, 23, 28, green[3]);
    p.hline(2, 24, 28, brass[2]);
    p.hline(2, 28, 28, green[0]);
    rivets(p, 4, 26, 24, green[3], 4);
    p.outline(0.6);
  });

  // Voitures voyageurs : toit bombé à nervures, 4 verrières, face arrière bordeaux.
  const coach = (key, last) =>
    paint(scene, key, 32, TRAIN.coach.h, (p) => {
      const roof = ramp(ROOF, 6, 0.06);
      const body = ramp(BODY, 5, 0.07);
      p.rect(1, 2, 30, 46, body[1]);
      p.vline(1, 2, 46, body[0]);
      p.vline(30, 2, 46, body[0]);
      p.cylinderV(2, 0, 28, 47, roof);
      for (let y = 3; y < 46; y += 4) {
        for (let x = 2; x < 30; x++) p.tone(x, y, -0.035);
      }
      p.hline(2, 0, 28, roof[5]);
      for (const y of TRAIN.skylights) {
        p.rect(8, y - 1, 16, 10, roof[0]);
        p.hline(8, y - 1, 16, roof[1]);
        p.hline(8, y + 8, 16, roof[4]);
        for (let j = 0; j < 8; j++)
          for (let i = 0; i < 14; i++) p.set(9 + i, y + j, mix('#3a3027', '#221d19', j / 8));
        p.rect(10, y + 5, 12, 2, body[1]); // dossiers des sièges
        p.hline(10, y + 5, 12, body[3]);
        // aérateurs
        p.blob(4.5, y + 4, 1.4, 1.4, roof);
        p.blob(27.5, y + 4, 1.4, 1.4, roof);
      }
      // débord du toit et face arrière
      p.hline(2, 47, 28, roof[1]);
      p.rect(1, 48, 30, 8, body[2]);
      p.hline(1, 48, 30, '#1c1416');
      p.hline(1, 49, 30, brass[3]);
      p.hline(1, 55, 30, body[0]);
      p.rect(12, 49, 8, 7, body[1]);
      p.rect(13, 50, 6, 3, '#2a3546');
      p.hline(13, 50, 6, '#4f6584');
      p.vline(11, 50, 5, brass[2]);
      p.vline(20, 50, 5, brass[2]);
      if (last) {
        for (const lx of [4, 25]) {
          p.rect(lx, 51, 3, 2, '#b8392e');
          p.set(lx, 51, '#ff8a6a');
        }
      } else {
        for (let i = 0; i < 3; i++) p.hline(11, 56 + i, 10, i % 2 ? '#2a2a2e' : '#45464c');
      }
      for (const bx of [5, 26]) p.blob(bx, 56.5, 2, 1.5, ramp('#6c7078', 4, 0.08));
      p.outline(0.6);
    });
  coach('coach', false);
  coach('coach_last', true);

  // Reflet posé par-dessus les têtes des passagers dans les verrières.
  paint(scene, 'skylight_glare', 14, 8, (p) => {
    for (let i = 0; i < 14; i++)
      for (let j = 0; j < 8; j++) {
        const d = i + j;
        if (d >= 3 && d <= 5) p.set(i, j, '#dfe8f2', 0.35);
        else if (d >= 9 && d <= 9) p.set(i, j, '#dfe8f2', 0.2);
      }
  });
}

// ───────────────────────── Effets ─────────────────────────

function effects(scene) {
  paint(scene, 'px', 1, 1, (p) => p.set(0, 0, '#ffffff'));

  paint(scene, 'smoke', 14, 14, (p) => {
    const r = rng(9);
    const pal = ramp('#b8b6b4', 4, 0.08);
    for (let i = 0; i < 5; i++) p.blob(4 + r() * 6, 4 + r() * 6, 3.4, 3, pal, { r });
  });

  paint(scene, 'leaf', 4, 3, (p) => {
    p.rect(0, 1, 3, 1, '#7a6a2e');
    p.set(1, 0, '#a08a3a');
    p.set(2, 2, '#5c5024');
  });
  paint(scene, 'confetti', 3, 2, (p) => p.rect(0, 0, 3, 2, '#ffffff'));
  paint(scene, 'mote', 3, 3, (p) => {
    p.set(1, 1, '#ffffff');
    p.set(0, 1, '#ffffff', 0.4);
    p.set(2, 1, '#ffffff', 0.4);
    p.set(1, 0, '#ffffff', 0.4);
    p.set(1, 2, '#ffffff', 0.4);
  });
  paint(scene, 'mist', 40, 14, (p) => {
    for (let y = 0; y < 14; y++)
      for (let x = 0; x < 40; x++) {
        const d = Math.hypot((x - 20) / 20, (y - 7) / 7);
        if (d < 1 && bayer(x, y) < (1 - d) * 0.8) p.set(x, y, '#e8efe8', 0.5);
      }
  });

  // Halo de lumière (fusion additive).
  const light = scene.textures.createCanvas('light', 64, 64);
  const lc = light.getContext();
  const g = lc.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  lc.fillStyle = g;
  lc.fillRect(0, 0, 64, 64);
  light.refresh();

  // Vignettage des bords d'écran.
  const vig = scene.textures.createCanvas('vignette', 240, 135);
  const vc = vig.getContext();
  const vg = vc.createRadialGradient(120, 67, 40, 120, 67, 150);
  vg.addColorStop(0, 'rgba(8,8,14,0)');
  vg.addColorStop(1, 'rgba(8,8,14,0.55)');
  vc.fillStyle = vg;
  vc.fillRect(0, 0, 240, 135);
  vig.refresh();
}

// ───────────────────────── Icônes du HUD (11×11) ─────────────────────────

function icons(scene) {
  const icon = (key, draw) =>
    paint(scene, key, 11, 11, (p) => {
      draw(p);
      p.outline(0.7);
    });
  icon('icon_sat', (p) => {
    const pal = ramp('#c0574c', 4, 0.09);
    p.blob(3.5, 3.8, 2.6, 2.4, pal);
    p.blob(7.5, 3.8, 2.6, 2.4, pal);
    for (let y = 4; y < 10; y++) {
      const half = 5 - (y - 4);
      for (let x = 5.5 - half; x <= 5.5 + half - 1; x++) p.set(x, y, pal[y < 6 ? 2 : 1]);
    }
    p.set(3, 2, pal[3]);
  });
  icon('icon_chaos', (p) => {
    const pal = ramp('#9579c8', 4, 0.09);
    const pts = [[5, 5], [6, 5], [6, 6], [5, 6], [4, 6], [4, 5], [4, 4], [5, 4], [6, 4], [7, 4], [7, 5], [7, 6], [7, 7], [6, 7], [5, 7], [4, 7], [3, 7], [3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [7, 8], [6, 8], [5, 8], [4, 8], [3, 8], [2, 8], [2, 7], [2, 6], [2, 5], [2, 4], [2, 3], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [9, 1]];
    pts.forEach(([x, y], i) => p.set(x, y, pal[Math.min(3, Math.floor(i / 13))]));
  });
  icon('icon_delay', (p) => {
    const pal = ramp('#c9a45c', 4, 0.09);
    p.blob(5, 5.5, 4.5, 4.5, pal, { flat: 0.6 });
    p.ellipse(5, 5.5, 3.2, 3.2, '#efe6cf');
    p.vline(5, 3, 3, '#2a2420');
    p.hline(5, 5, 2, '#2a2420');
    p.set(4, 0, pal[1]);
    p.set(5, 0, pal[1]);
    p.set(6, 0, pal[1]);
  });
  icon('icon_people', (p) => {
    p.blob(5, 3, 2.2, 2.2, ramp('#d8b294', 4, 0.08));
    p.blob(5, 8.5, 3.8, 2.6, ramp('#6d8297', 4, 0.08));
  });
}
