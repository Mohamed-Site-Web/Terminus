import Phaser from 'phaser';
import { W, COLORS, FONT_TITLE } from '../config.js';
import { hex } from '../art/draw.js';
import { tableauKey, TW, TH } from '../art/tableaux.js';
import { text, panel, button } from '../ui/widgets.js';
import { getEnding } from '../systems/story.js';
import { ENDINGS } from '../data/endings.js';
import { recordEnding, foundEndings } from '../systems/progress.js';
import { ending as endingJingle } from '../systems/audio.js';

const TONE = {
  true: { color: COLORS.good, label: 'La vraie fin' },
  good: { color: COLORS.good, label: 'Bonne fin' },
  bad: { color: COLORS.bad, label: 'Fin de service' },
  secret: { color: COLORS.chaos, label: 'Fin secrète' },
  neutral: { color: COLORS.delay, label: 'Fin' },
};

// Vignettes de la collection : 11 par ligne, au quart de la taille de l'image.
const THUMB = 0.25;
const PER_ROW = 11;
const GAP = 6;

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create({ endingId, state }) {
    const e = getEnding(endingId);
    const tone = TONE[e.tone] ?? TONE.neutral;
    const isNew = recordEnding(e.id);
    endingJingle(e.tone !== 'bad');

    this.cameras.main.setBackgroundColor(COLORS.ink);
    this.cameras.main.fadeIn(600, 14, 16, 22);

    const g = this.add.graphics();
    for (let i = 0; i < 90; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.05, 0.35));
      g.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 540), 2, 2);
    }

    text(this, W / 2, 20, `${tone.label}${isNew ? '  ·  Nouvelle !' : ''}`, 18, tone.color).setOrigin(0.5);
    const title = text(this, W / 2, 54, e.title, 44, COLORS.brassLight, { fontFamily: FONT_TITLE, fontStyle: '700' }).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: { from: 0.6, to: 1 }, duration: 500, ease: 'Back.out' });
    g.fillStyle(hex(tone.color));
    g.fillRect(W / 2 - 80, 80, 160, 3);

    // L'image de la fin, à gauche ; son récit, à droite.
    const ix = 48;
    const iy = 96;
    g.fillStyle(hex(COLORS.brass));
    g.fillRect(ix - 3, iy - 3, TW * 2 + 6, TH * 2 + 6);
    g.fillStyle(hex(COLORS.ink));
    g.fillRect(ix - 1, iy - 1, TW * 2 + 2, TH * 2 + 2);
    const pic = this.add.image(ix, iy, tableauKey(this, e.id)).setOrigin(0).setScale(2);
    this.tweens.add({ targets: pic, alpha: { from: 0, to: 1 }, duration: 700 });

    panel(g, 496, iy - 3, 416, TH * 2 + 6);
    text(this, 512, iy + 10, e.text.replace('{delay}', String(state.delay)), 18, COLORS.text, {
      wordWrap: { width: 384 },
      lineSpacing: 6,
    });

    // Bilan : le trajet et ce qui reste dans les poches
    const recap = `Arrêts traversés : ${state.route.length}   ·   Décisions prises : ${state.decisions}`;
    if (state.items.length) {
      const step = 34;
      const label = text(this, 0, 362, recap, 16, COLORS.textDim).setOrigin(0, 0.5);
      const total = label.width + 24 + state.items.length * step;
      label.x = W / 2 - total / 2;
      state.items.forEach((id, i) => this.add.image(label.x + label.width + 24 + step / 2 + i * step, 362, `item_${id}`).setScale(2));
    } else {
      text(this, W / 2, 362, `${recap}   ·   Les poches vides.`, 16, COLORS.textDim).setOrigin(0.5);
    }

    // Collection des fins : une vignette par fin découverte
    const found = foundEndings();
    const known = ENDINGS.filter((x) => found.has(x.id)).length;
    text(this, W / 2, 390, `Fins découvertes : ${known} / ${ENDINGS.length}`, 16, COLORS.brass).setOrigin(0.5);
    const tw = TW * THUMB;
    const th = TH * THUMB;
    const x0 = W / 2 - (PER_ROW * tw + (PER_ROW - 1) * GAP) / 2;
    ENDINGS.forEach((x, i) => {
      const tx = x0 + (i % PER_ROW) * (tw + GAP);
      const ty = 406 + Math.floor(i / PER_ROW) * (th + GAP);
      const current = x.id === e.id;
      g.fillStyle(hex(current ? tone.color : COLORS.line));
      g.fillRect(tx - (current ? 2 : 1), ty - (current ? 2 : 1), tw + (current ? 4 : 2), th + (current ? 4 : 2));
      if (found.has(x.id)) {
        this.add.image(tx, ty, tableauKey(this, x.id)).setOrigin(0).setScale(THUMB);
      } else {
        g.fillStyle(hex(COLORS.panel));
        g.fillRect(tx, ty, tw, th);
        text(this, tx + tw / 2, ty + th / 2, '?', 16, COLORS.line).setOrigin(0.5);
      }
    });

    const again = button(this, W / 2 - 230, 490, 220, 40, 'Rejouer', () => this.go('Ride'), { align: 'center', size: 22, primary: true });
    button(this, W / 2 + 10, 490, 220, 40, 'Menu', () => this.go('Title'), { align: 'center', size: 22 });
    this.input.keyboard.once('keydown-ENTER', () => again.fire());
  }

  go(scene) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(400, 14, 16, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.leaving = false;
      this.scene.start(scene);
    });
  }
}
