import Phaser from 'phaser';
import { W, H, COLORS, FONT_TITLE } from '../config.js';
import { coverKey } from '../art/tableaux.js';
import { text, button } from '../ui/widgets.js';
import { whistle } from '../systems/audio.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.leaving = false;
    this.cameras.main.setBackgroundColor(COLORS.ink);

    // Couverture dessinée par code (src/art/tableaux.js), à l'échelle des pixels du jeu.
    const bg = this.add.image(0, 0, coverKey(this)).setOrigin(0);
    bg.setScale(W / bg.width, H / bg.height);

    const title = text(this, W / 2, 96, 'TERMINUS', 112, COLORS.brassLight, {
      fontFamily: FONT_TITLE,
      fontStyle: '700',
      stroke: COLORS.ink,
      strokeThickness: 12,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 100, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    text(this, W / 2, 168, 'Prochain arrêt : on verra bien.', 18, COLORS.text, { stroke: COLORS.ink, strokeThickness: 5 }).setOrigin(0.5);

    const play = button(this, W / 2 - 150, 462, 300, 50, 'Prendre le service', () => this.start(), { size: 24, align: 'center', primary: true });
    play.container.setDepth(100);

    this.input.keyboard.once('keydown-ENTER', () => this.start());
    this.input.keyboard.once('keydown-SPACE', () => this.start());
  }

  start() {
    if (this.leaving) return;
    this.leaving = true;
    whistle();
    this.cameras.main.fadeOut(500, 14, 16, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Ride'));
  }
}
