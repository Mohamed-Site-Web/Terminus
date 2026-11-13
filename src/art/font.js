// Police bitmap des répliques, tirée de Dogica (Roberto Mocci, SIL OFL, public/fonts).
// Dogica est un dessin pixel sur une grille de 8 unités, mais à 8 px le navigateur le pose
// à cheval sur les pixels (traits flous et doublés). On la trace donc à 64 px, où une unité
// vaut 8 px pile, et on lit le centre de chaque unité : on retrouve le dessin exact,
// rangé en cellules de 8×12 et affiché à ×2 avec une BitmapText.
// Ses lettres accentuées sont des majuscules tassées : on recompose donc les minuscules
// (base + accent dessiné au pixel) pour que le français reste lisible.

import Phaser from 'phaser';

export const DIALOG_FONT = 'dogica';
const CW = 8;
const CH = 12;
// Glyphe décalé d'une ligne : capitales dès la ligne 2, minuscules dès la ligne 3,
// descendantes jusqu'à la ligne 10. Les lignes 0–1 portent les accents.
const DY = 1;
const UNIT = 8; // taille d'une unité de Dogica tracée à 64 px
const PER_ROW = 32;

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const NATIVE = 'çÇ«»…’‘“”–—°';

// Accents dessinés à la main, en (colonne, ligne) dans la cellule.
const MARKS = {
  acute: [[4, 0], [3, 1]],
  grave: [[2, 0], [3, 1]],
  circ: [[3, 0], [2, 1], [4, 1]],
  trema: [[2, 1], [4, 1]],
};
// Retouches : le « l » de Dogica s'arrête à la hauteur des minuscules et se lit « ι ».
const EXTRA = { l: [[2, 2]] };
const COMPOSED = {
  é: ['e', 'acute'], è: ['e', 'grave'], ê: ['e', 'circ'], ë: ['e', 'trema'],
  à: ['a', 'grave'], â: ['a', 'circ'], ä: ['a', 'trema'],
  î: ['i', 'circ'], ï: ['i', 'trema'],
  ô: ['o', 'circ'], ö: ['o', 'trema'],
  ù: ['u', 'grave'], û: ['u', 'circ'], ü: ['u', 'trema'],
  É: ['E', 'acute'], È: ['E', 'grave'], Ê: ['E', 'circ'], À: ['A', 'grave'], Â: ['A', 'circ'],
  Î: ['I', 'circ'], Ô: ['O', 'circ'], Ù: ['U', 'grave'], Û: ['U', 'circ'],
};

export const DIALOG_CHARS = ASCII + NATIVE + Object.keys(COMPOSED).join('');

// Remplace ce que la police ne connaît pas par un équivalent.
export function dialogSafe(str) {
  return str.replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/[  ]/g, ' ');
}

export function generateDialogFont(scene) {
  if (scene.textures.exists(DIALOG_FONT)) return;
  const rows = Math.ceil(DIALOG_CHARS.length / PER_ROW);
  const canvas = document.createElement('canvas');
  canvas.width = PER_ROW * CW;
  canvas.height = rows * CH;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(canvas.width, canvas.height);
  const put = (px, py) => {
    const o = (py * canvas.width + px) * 4;
    img.data.fill(255, o, o + 4);
  };

  const big = document.createElement('canvas');
  big.width = CW * UNIT;
  big.height = (CH - DY) * UNIT;
  const bctx = big.getContext('2d', { willReadFrequently: true });
  bctx.font = `${UNIT * 8}px Dogica`;
  bctx.textBaseline = 'top';
  bctx.fillStyle = '#ffffff';

  [...DIALOG_CHARS].forEach((ch, i) => {
    const x = (i % PER_ROW) * CW;
    const y = Math.floor(i / PER_ROW) * CH;
    const [base, mark] = COMPOSED[ch] ?? [ch, null];
    bctx.clearRect(0, 0, big.width, big.height);
    bctx.fillText(base, 0, 0);
    const d = bctx.getImageData(0, 0, big.width, big.height).data;
    for (let v = 0; v < CH - DY; v++) {
      // le point du i disparaît sous l'accent
      if (mark && base === 'i' && v === 1) continue;
      for (let u = 0; u < CW; u++) {
        if (d[((v * UNIT + UNIT / 2) * big.width + u * UNIT + UNIT / 2) * 4 + 3] > 128) put(x + u, y + v + DY);
      }
    }
    if (mark) for (const [mx, my] of MARKS[mark]) put(x + mx, y + my);
    for (const [mx, my] of EXTRA[ch] ?? []) put(x + mx, y + my);
  });
  ctx.putImageData(img, 0, 0);

  scene.textures.addCanvas(DIALOG_FONT, canvas);
  // Parse renvoie l'entrée complète { data, texture, frame }
  const entry = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: DIALOG_FONT,
    width: CW,
    height: CH,
    chars: DIALOG_CHARS,
    charsPerRow: PER_ROW,
    spacing: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    lineSpacing: 0,
  });
  scene.cache.bitmapFont.add(DIALOG_FONT, entry);
}
