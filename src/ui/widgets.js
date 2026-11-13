// Briques d'interface : panneaux anthracite à filet laiton, boutons sobres, texte.

import { FONT, COLORS } from '../config.js';
import { hex, mix } from '../art/draw.js';
import { click, hover } from '../systems/audio.js';
import { UI_THEMES, MOTIFS } from './themes.js';

export function text(scene, x, y, str, size = 20, color = COLORS.text, opts = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    resolution: 2,
    ...opts,
  });
}

// Panneau : fond sombre légèrement translucide, filet fin, coins laiton.
export function panel(g, x, y, w, h, { fill = COLORS.panel, line = COLORS.line, accent = COLORS.brass, alpha = 0.94, corners = true } = {}) {
  g.fillStyle(0x05060a, 0.35);
  g.fillRect(x + 3, y + 4, w, h);
  g.fillStyle(hex(fill), alpha);
  g.fillRect(x, y, w, h);
  // léger dégradé : haut un peu plus clair
  g.fillStyle(hex(mix(fill, '#ffffff', 0.04)), alpha);
  g.fillRect(x, y, w, Math.min(24, h / 3));
  g.lineStyle(2, hex(line), 1);
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  if (!corners) return;
  g.fillStyle(hex(accent));
  const c = 10;
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    g.fillRect(sx > 0 ? cx : cx - c, sy > 0 ? cy : cy - 2, c, 2);
    g.fillRect(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - c, 2, c);
  }
}

// Bouton. Renvoie un objet { container, fire, setEnabled }.
export function button(scene, x, y, w, h, label, onClick, { size = 20, align = 'left', primary = false } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const t = text(scene, align === 'left' ? 22 : w / 2, h / 2, label, size, COLORS.text, {
    wordWrap: { width: w - 36 },
  }).setOrigin(align === 'left' ? 0 : 0.5, 0.5);
  c.add([g, t]);

  let state = 'idle';
  let enabled = true;
  const draw = () => {
    g.clear();
    const hot = state !== 'idle';
    const fill = primary ? (hot ? '#3a3020' : '#2a2418') : hot ? COLORS.panelLight : COLORS.panel;
    g.fillStyle(hex(fill), 0.95);
    g.fillRect(0, 0, w, h);
    g.lineStyle(2, hex(hot || primary ? COLORS.brass : COLORS.line), 1);
    g.strokeRect(1, 1, w - 2, h - 2);
    if (hot) {
      g.fillStyle(hex(COLORS.brass));
      g.fillRect(0, 0, 4, h);
    }
    t.setColor(hot ? COLORS.brassLight : primary ? COLORS.brassLight : COLORS.text);
    t.x = (align === 'left' ? 22 : w / 2) + (state === 'down' ? 2 : 0);
  };
  draw();

  const zone = scene.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
  c.add(zone);
  zone.on('pointerover', () => {
    if (!enabled) return;
    state = 'hover';
    hover();
    draw();
  });
  zone.on('pointerout', () => {
    state = 'idle';
    draw();
  });
  // Déclenché à l'appui : plus réactif, et fiable même avec des clics très brefs.
  zone.on('pointerdown', () => {
    if (!enabled) return;
    state = 'down';
    draw();
    scene.time.delayedCall(90, () => {
      if (!c.active) return;
      state = 'hover';
      draw();
    });
    fire();
  });

  const fire = () => {
    if (!enabled) return;
    click();
    onClick();
  };

  return {
    container: c,
    fire,
    setEnabled(v) {
      enabled = v;
      c.setAlpha(v ? 1 : 0.6);
    },
  };
}

// ───────────────────────── Cadres pixel art ─────────────────────────
// Tout est dessiné par pas de 2 px écran (= 1 pixel d'art). Les couleurs, l'arrondi des coins
// et l'ornement viennent du thème du biome (src/ui/themes.js).

// Rectangle aux coins en marches.
function steppedRect(g, x, y, w, h, steps, u, col, a = 1) {
  g.fillStyle(hex(col), a);
  for (let s = 0; s < steps; s++) {
    const off = (steps - s) * u;
    g.fillRect(x + off, y + s * u, w - 2 * off, u);
    g.fillRect(x + off, y + h - (s + 1) * u, w - 2 * off, u);
  }
  g.fillRect(x, y + steps * u, w, h - 2 * steps * u);
}

// kind : paper (boîte de texte), tab (panneaux sombres), choice, hot. ornate : ornement aux coins hauts.
export function pixelFrame(g, x, y, w, h, kind = 'paper', theme = UI_THEMES.city, { ornate = false } = {}) {
  const u = 2;
  const { frame, nail, round } = theme;
  const r = (xx, yy, ww, hh, col, a = 1) => {
    g.fillStyle(hex(col), a);
    g.fillRect(x + xx, y + yy, ww, hh);
  };
  // ombre portée et contour, coins selon le thème
  steppedRect(g, x + u, y + 2 * u, w - u, h, round, u, '#000000', 0.35);
  steppedRect(g, x, y, w, h, round, u, frame.ink);
  // cadre : haut éclairé, bas dans l'ombre
  const inner = Math.max(0, round - 1);
  steppedRect(g, x + u, y + u, w - 2 * u, h - 2 * u, inner, u, frame.mid);
  r(2 * u + inner * u, u, w - 4 * u - 2 * inner * u, u, frame.light);
  r(u, 2 * u + inner * u, u, h - 4 * u - 2 * inner * u, frame.light);
  r(2 * u + inner * u, h - 2 * u, w - 4 * u - 2 * inner * u, u, frame.dark);
  r(w - 2 * u, 2 * u + inner * u, u, h - 4 * u - 2 * inner * u, frame.dark);
  r(3 * u + inner * u, u, Math.min(14 * u, w / 4), u, frame.glint);
  // rainure intérieure
  steppedRect(g, x + 3 * u, y + 3 * u, w - 6 * u, h - 6 * u, Math.max(0, round - 2), u, frame.dark);
  // remplissage, dégradé en deux bandes tramées
  const [top, bottom] = theme[kind];
  const ix = 4 * u;
  const iw = w - 8 * u;
  const ih = h - 8 * u;
  r(ix, 4 * u, iw, ih, top);
  const band = Math.floor((ih * 0.62) / u) * u;
  r(ix, 4 * u + band + 2 * u, iw, ih - band - 2 * u, bottom);
  for (let xx = 0; xx < iw; xx += 2 * u) r(ix + xx + ((xx / (2 * u)) % 2 ? u : 0), 4 * u + band, u, u, bottom);
  for (let xx = u; xx < iw; xx += 2 * u) r(ix + xx, 4 * u + band + u, u, u, bottom);
  // ombre interne en haut
  r(ix, 4 * u, iw, u, bottom, kind === 'paper' ? 0.8 : 0.6);
  // clous aux coins (décalés quand les coins sont très arrondis)
  const off = u + Math.max(0, round - 1) * u;
  const nails = [[off, h - off - 2 * u], [w - off - 2 * u, h - off - 2 * u]];
  if (!ornate) nails.push([off, off], [w - off - 2 * u, off]);
  for (const [cx, cy] of nails) {
    r(cx, cy, 2 * u, 2 * u, frame.ink);
    r(cx, cy, u, u, nail[1]);
    r(cx + u, cy, u, u, nail[0]);
    r(cx, cy + u, u, u, nail[0]);
  }
  if (ornate) {
    stamp(g, x - u, y - u, MOTIFS[theme.motif], theme, false);
    stamp(g, x + w - 13 * u + 6 * u, y - u, MOTIFS[theme.motif], theme, true);
  }
}

// Ornement du thème, en miroir sur le coin droit.
function stamp(g, x, y, rows, theme, flip) {
  const u = 2;
  const colors = { a: theme.frame.glint, b: theme.nail[1], k: theme.frame.ink };
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = colors[row[flip ? row.length - 1 - i : i]];
      if (!c) continue;
      g.fillStyle(hex(c));
      g.fillRect(x + i * u, y + j * u, u, u);
    }
  });
}

// Case de choix : pastille numérotée à gauche, texte sur plusieurs lignes.
// Même interface que button() : { container, fire, setEnabled }.
export function choiceButton(scene, x, y, w, h, num, label, onClick, theme = UI_THEMES.city) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const badge = text(scene, 26, h / 2, num, 18, theme.frame.ink, { fontStyle: 'bold' }).setOrigin(0.5);
  const t = text(scene, 46, h / 2, label, 16, theme.choiceText, { wordWrap: { width: w - 62 }, lineSpacing: 2 }).setOrigin(0, 0.5);
  c.add([g, badge, t]);

  let state = 'idle';
  let enabled = true;
  const draw = () => {
    g.clear();
    const hot = state !== 'idle';
    const dy = state === 'down' ? 2 : 0;
    pixelFrame(g, 0, dy, w, h, hot ? 'hot' : 'choice', theme);
    // pastille
    g.fillStyle(hex(theme.frame.ink));
    g.fillRect(16, h / 2 - 10 + dy, 20, 20);
    g.fillStyle(hex(hot ? theme.nail[1] : theme.frame.light));
    g.fillRect(18, h / 2 - 8 + dy, 16, 16);
    g.fillStyle(hex(hot ? '#ffffff' : theme.nail[1]));
    g.fillRect(18, h / 2 - 8 + dy, 16, 2);
    badge.y = h / 2 + dy;
    t.y = h / 2 + dy;
    t.setColor(hot ? theme.hotText : theme.choiceText);
  };
  draw();

  const zone = scene.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
  c.add(zone);
  zone.on('pointerover', () => {
    if (!enabled) return;
    state = 'hover';
    hover();
    draw();
  });
  zone.on('pointerout', () => {
    state = 'idle';
    draw();
  });
  zone.on('pointerdown', () => {
    if (!enabled) return;
    state = 'down';
    draw();
    scene.time.delayedCall(90, () => {
      if (!c.active) return;
      state = 'hover';
      draw();
    });
    fire();
  });

  const fire = () => {
    if (!enabled) return;
    click();
    onClick();
  };

  return {
    container: c,
    fire,
    setEnabled(v) {
      enabled = v;
      c.setAlpha(v ? 1 : 0.6);
    },
  };
}
