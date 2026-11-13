// Panneau d'inventaire, en haut à droite. Le trajet et le dialogue ont chacun le leur, au même endroit :
// le dialogue assombrit le trajet, et on doit toujours voir ses objets.

import { W } from '../config.js';
import { hex } from '../art/draw.js';
import { ITEMS, INVENTORY_SLOTS } from '../data/items.js';
import { pixelFrame, text } from './widgets.js';

const COLS = 6;
const SLOT = 34;
const GAP = 2;
const PAD = 8;
const BAG = 38;
const WIDTH = PAD * 2 + BAG + COLS * SLOT + (COLS - 1) * GAP;
const ROWS = Math.ceil(INVENTORY_SLOTS / COLS);
export const INVENTORY = { x: W - WIDTH - 8, y: 6, w: WIDTH, h: PAD * 2 + ROWS * SLOT + (ROWS - 1) * GAP };

export class InventoryPanel {
  constructor(scene, theme, items, depth = 100) {
    this.scene = scene;
    this.items = [...items];
    this.depth = depth;
    this.frame = scene.add.graphics().setDepth(depth);
    this.bag = scene.add.image(INVENTORY.x + PAD + BAG / 2 - 1, INVENTORY.y + 32, 'item_sac').setScale(2).setDepth(depth + 1);
    this.count = text(scene, INVENTORY.x + PAD + BAG / 2 - 1, INVENTORY.y + 62, '', 13, '#ffffff').setOrigin(0.5).setDepth(depth + 1);
    this.icons = [];
    this.marks = scene.add.graphics().setDepth(depth + 1);
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const { x, y } = this.slotCenter(i);
      const icon = scene.add.image(x, y, 'item_sac').setScale(2).setDepth(depth + 1).setVisible(false);
      const zone = scene.add.zone(x, y, SLOT, SLOT).setDepth(depth + 2).setInteractive();
      zone.on('pointerover', () => this.showTip(i));
      zone.on('pointerout', () => this.hideTip());
      // onUse n'est fourni que par le trajet : dans un dialogue, les objets ne se cliquent pas.
      zone.on('pointerdown', () => {
        if (this.items[i]) this.onUse?.(this.items[i]);
      });
      this.icons.push(icon);
    }
    this.setTheme(theme);
    this.draw();
  }

  slotCenter(i) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      x: INVENTORY.x + PAD + BAG + col * (SLOT + GAP) + SLOT / 2,
      y: INVENTORY.y + PAD + row * (SLOT + GAP) + SLOT / 2,
    };
  }

  setTheme(theme) {
    this.theme = theme;
    this.count.setColor(theme.accent);
    const g = this.frame;
    g.clear();
    pixelFrame(g, INVENTORY.x, INVENTORY.y, INVENTORY.w, INVENTORY.h, 'tab', theme);
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const { x, y } = this.slotCenter(i);
      const left = x - SLOT / 2;
      const top = y - SLOT / 2;
      g.fillStyle(hex(theme.frame.ink));
      g.fillRect(left, top, SLOT, SLOT);
      g.fillStyle(hex(theme.slot));
      g.fillRect(left + 2, top + 2, SLOT - 2, SLOT - 2);
      g.fillStyle(hex(theme.frame.dark));
      g.fillRect(left + 2, top + SLOT - 2, SLOT - 2, 2);
      g.fillRect(left + SLOT - 2, top + 2, 2, SLOT - 2);
    }
    this.hideTip();
  }

  set(items) {
    this.items = [...items];
    this.draw();
  }

  add(id) {
    if (!this.items.includes(id)) this.items.push(id);
    this.draw();
    const icon = this.icons[this.items.indexOf(id)];
    icon.setScale(3.5);
    this.scene.tweens.add({ targets: icon, scale: 2, duration: 260, ease: 'Back.out' });
  }

  remove(id) {
    this.items = this.items.filter((x) => x !== id);
    this.draw();
  }

  draw() {
    this.icons.forEach((icon, i) => {
      const id = this.items[i];
      icon.setVisible(Boolean(id));
      if (id) icon.setTexture(`item_${id}`);
    });
    this.count.setText(`${this.items.length}/${INVENTORY_SLOTS}`);
    // Un liseré sur les objets qui ont un pouvoir.
    this.marks.clear();
    this.marks.lineStyle(2, hex(this.theme.accent));
    this.items.forEach((id, i) => {
      if (!ITEMS[id]?.use) return;
      const { x, y } = this.slotCenter(i);
      this.marks.strokeRect(x - SLOT / 2 + 1, y - SLOT / 2 + 1, SLOT - 2, SLOT - 2);
    });
  }

  // Nom et description de l'objet survolé, sous le panneau.
  showTip(i) {
    this.hideTip();
    const item = ITEMS[this.items[i]];
    if (!item) return;
    const s = this.scene;
    const w = 320;
    const x = W - w - 8;
    const y = INVENTORY.y + INVENTORY.h + 4;
    const name = text(s, x + 18, y + 14, item.name, 16, this.theme.ink, { fontStyle: 'bold' });
    const desc = text(s, x + 18, y + 36, item.desc, 14, this.theme.ink, { wordWrap: { width: w - 36 }, lineSpacing: 2 });
    const hint = item.use && text(s, x + 18, y + 42 + desc.height, item.use.hint, 14, this.theme.good ?? this.theme.ink, { wordWrap: { width: w - 36 }, lineSpacing: 2, fontStyle: 'bold' });
    const h = Math.ceil((desc.height + 54 + (hint ? hint.height + 6 : 0)) / 2) * 2;
    const g = s.add.graphics();
    pixelFrame(g, x, y, w, h, 'paper', this.theme);
    this.tip = s.add.container(0, 0, hint ? [g, name, desc, hint] : [g, name, desc]).setDepth(this.depth + 20);
  }

  hideTip() {
    this.tip?.destroy();
    this.tip = null;
  }
}
