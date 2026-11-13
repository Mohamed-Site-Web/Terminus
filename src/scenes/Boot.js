import Phaser from 'phaser';
import { W, H, FONT, COLORS } from '../config.js';
import { generateTextures } from '../art/textures.js';
import { generatePortraits } from '../art/portraits.js';
import { generateItems } from '../art/items.js';
import { generateDialogFont } from '../art/font.js';

// Génère tout le pixel art puis attend les polices (au plus 2,5 s) avant le menu.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.add.text(W / 2, H / 2, 'Chargement…', { fontFamily: FONT, fontSize: '24px', color: COLORS.white }).setOrigin(0.5);
    generateTextures(this);
    generatePortraits(this);
    generateItems(this);

    const font = document.fonts
      ? Promise.all([document.fonts.load('24px "DotGothic16"'), document.fonts.load('24px "Handjet"'), document.fonts.load('600 24px "Handjet"'), document.fonts.load('8px "Dogica"')])
      : Promise.resolve();
    const timeout = new Promise((r) => setTimeout(r, 2500));
    Promise.race([font, timeout]).then(() => {
      generateDialogFont(this);
      this.scene.start('Title');
    });
  }
}
