import Phaser from 'phaser';
import { W, H, COLORS, FONT_TITLE } from '../config.js';
import { DIALOG_FONT, dialogSafe } from '../art/font.js';
import { text, pixelFrame, choiceButton } from '../ui/widgets.js';
import { uiTheme } from '../ui/themes.js';
import { InventoryPanel } from '../ui/inventory.js';
import { ITEMS } from '../data/items.js';
import { getCharacter, startNode, nodeText, nodeChoices, applyChoice, checkGameOver, lastWords } from '../systems/story.js';
import { blip, statUp, statDown } from '../systems/audio.js';

// Disposition : grande boîte sur toute la largeur, nom en onglet à gauche,
// personnage en gros plan posé sur la boîte à droite, trois choix côte à côte en dessous.
const BOX = { x: 24, y: 300, w: 912, h: 132 };
const PORTRAIT = { x: 772, y: 306 };
const VIGNETTE = { x: 772, w: 176, h: 176 };
const CHOICE = { y: 444, h: 80, gap: 12 };
const CHARS_PER_SEC = 45;
// Un personnage `small` dépasse moins de la boîte que les autres.
const SMALL_DROP = 24;

// Une conversation complète avec un passager, en surimpression de la scène de trajet.
// data : { charId, node?, title?, dust?, state, theme, onChoice(deltas), onDone(outcome) }
// dust : le personnage part en fumée ; il dit sa dernière phrase (champ `dust`) et disparaît.
export class DialogueScene extends Phaser.Scene {
  constructor() {
    super('Dialogue');
  }

  create(data) {
    this.data_ = data;
    this.char = getCharacter(data.charId);
    this.theme = data.theme ?? uiTheme();
    this.buttons = [];
    // Phaser réutilise l'instance de scène d'une conversation à l'autre.
    this.locked = false;
    this.typing = false;
    this.typer = null;

    this.shade = this.add.rectangle(0, 0, W, H, 0x07080c, 0).setOrigin(0, 0);
    this.tweens.add({ targets: this.shade, fillAlpha: 0.55, duration: 250 });

    const root = this.add.container(0, 40).setAlpha(0);
    this.root = root;
    this.tweens.add({ targets: root, y: 0, alpha: 1, duration: 280, ease: 'Back.out' });

    if (data.title) this.drawBanner(data.title);
    this.drawPortrait();
    this.drawBox();
    this.inventory = new InventoryPanel(this, this.theme, data.state.items);

    this.input.keyboard.on('keydown', (e) => this.onKey(e));
    this.input.on('pointerdown', (p) => {
      if (this.typing && p.y < CHOICE.y) this.finishTyping();
    });

    if (data.dust) {
      this.clearButtons();
      this.say(lastWords(data.charId));
    } else this.showNode(startNode(data.charId, data.state, data.node));
  }

  bustKey() {
    return `bust_${this.data_.charId}${this.data_.dust ? '_dust' : ''}`;
  }

  bustY() {
    return PORTRAIT.y + (this.char.small ? SMALL_DROP : 0);
  }

  drawBanner(title) {
    const g = this.add.graphics();
    const w = 460;
    const x = BOX.x;
    pixelFrame(g, x, 200, w, 56, 'tab', this.theme, { ornate: true });
    const t = text(this, x + w / 2, 228, title.toUpperCase(), 26, this.theme.title, { fontFamily: FONT_TITLE, fontStyle: '600' }).setOrigin(0.5);
    this.root.add([g, t]);
    this.tweens.add({ targets: t, alpha: 0.6, duration: 600, yoyo: true, repeat: -1 });
  }

  // Le personnage en gros plan, posé sur le haut de la boîte (le bas du buste passe derrière).
  // À la place du buste, une vignette quand la réplique montre un objet.
  drawPortrait() {
    const key = this.bustKey();
    const img = this.add.image(PORTRAIT.x, 0, this.textures.exists(key) ? key : 'item_lampe').setOrigin(0.5, 1).setScale(2);
    this.portraitY = this.bustY();
    img.y = this.portraitY;
    this.portrait = img;
    this.vignette = this.add.graphics();
    this.root.add([this.vignette, img]);
    pixelFrame(this.vignette, VIGNETTE.x - VIGNETTE.w / 2, BOX.y - VIGNETTE.h - 2, VIGNETTE.w, VIGNETTE.h, 'tab', this.theme, { ornate: true });
    this.vignette.setVisible(false);
    // petite entrée : le personnage se lève derrière la boîte
    this.tweens.add({ targets: img, y: { from: this.portraitY + 40, to: this.portraitY }, duration: 360, ease: 'Back.out' });
  }

  // Buste du personnage, ou objet montré par la réplique.
  showVisual(nodeId) {
    const item = this.char.nodes[nodeId]?.show;
    this.vignette.setVisible(Boolean(item));
    if (item) {
      this.portraitY = BOX.y - VIGNETTE.h / 2 - 2;
      this.portrait.setTexture(`item_${item}`).setOrigin(0.5).setScale(8).setY(this.portraitY);
    } else {
      this.portraitY = this.bustY();
      this.portrait.setTexture(this.bustKey()).setOrigin(0.5, 1).setScale(2).setY(this.portraitY);
    }
  }

  drawBox() {
    const g = this.add.graphics();
    const theme = this.theme;
    pixelFrame(g, BOX.x, BOX.y, BOX.w, BOX.h, 'paper', theme, { ornate: true });

    // Onglet du nom, à cheval sur le bord haut de la boîte
    const name = this.add.bitmapText(0, 0, DIALOG_FONT, dialogSafe(this.char.name), 16).setTint(hex(theme.name));
    const role = text(this, 0, 0, this.char.role, 14, theme.role);
    const tabW = Math.ceil((name.width + role.width + 52) / 2) * 2;
    const tab = this.add.graphics();
    const tabY = BOX.y - 24;
    pixelFrame(tab, BOX.x + 20, tabY, tabW, 40, 'tab', theme);
    name.setPosition(BOX.x + 40, tabY + 6);
    role.setPosition(name.x + name.width + 14, tabY + 11);

    this.body = this.add.bitmapText(BOX.x + 30, BOX.y + 22, DIALOG_FONT, '', 16).setTint(hex(theme.ink));
    this.more = text(this, BOX.x + BOX.w - 28, BOX.y + BOX.h - 26, '▼', 14, theme.frame.mid).setOrigin(0.5).setVisible(false);
    this.tweens.add({ targets: this.more, y: '+=4', duration: 380, yoyo: true, repeat: -1 });

    this.root.add([g, tab, name, role, this.body, this.more]);
  }

  showNode(nodeId) {
    const { charId, state } = this.data_;
    this.nodeId = nodeId;
    this.clearButtons();
    this.showVisual(nodeId);
    this.say(nodeText(charId, nodeId, state));
  }

  say(str) {
    // retours à la ligne calculés d'avance : un mot ne saute pas de ligne en cours de frappe
    this.full = wrapText(dialogSafe(str), Math.floor((BOX.w - 70) / 16));
    this.shown = 0;
    this.body.setText('');
    this.typing = true;
    this.more.setVisible(false);
    this.talk();
  }

  // Effet machine à écrire avec un blip de voix toutes les deux lettres.
  talk() {
    if (this.typer) this.typer.remove();
    this.typer = this.time.addEvent({
      delay: 1000 / CHARS_PER_SEC,
      loop: true,
      callback: () => {
        this.shown++;
        this.body.setText(this.full.slice(0, this.shown));
        const ch = this.full[this.shown - 1];
        if (this.shown % 2 === 0 && /\S/.test(ch)) {
          blip(this.char.voice);
          this.portrait.y = this.portraitY - (this.shown % 4 === 0 ? 4 : 0);
        }
        if (this.shown >= this.full.length) this.finishTyping();
      },
    });
  }

  finishTyping() {
    if (!this.typing) return;
    this.typing = false;
    this.typer.remove();
    this.body.setText(this.full);
    this.portrait.y = this.portraitY;
    this.showChoices();
  }

  showChoices() {
    const { charId, state, dust } = this.data_;
    const choices = dust ? [{ continue: true, dust: true }] : nodeChoices(charId, this.nodeId, state);
    const n = 3;
    const w = (BOX.w - CHOICE.gap * (n - 1)) / n;
    choices.forEach((choice, i) => {
      // « Continuer » seul se range à droite, sous le personnage
      const slot = choice.continue && choices.length === 1 ? n - 1 : i;
      const x = BOX.x + slot * (w + CHOICE.gap);
      const label = choice.continue ? 'Continuer ▶' : choice.text;
      const b = choiceButton(this, x, CHOICE.y, w, CHOICE.h, String(i + 1), label, () => this.choose(choice), this.theme);
      b.container.setAlpha(0);
      this.tweens.add({ targets: b.container, alpha: 1, y: { from: CHOICE.y + 14, to: CHOICE.y }, duration: 200, delay: i * 80 });
      this.buttons.push(b);
    });
  }

  clearButtons() {
    for (const b of this.buttons) b.container.destroy();
    this.buttons = [];
  }

  // Le personnage s'élève et s'efface, puis la scène se ferme.
  vanish() {
    this.clearButtons();
    this.tweens.add({
      targets: this.portrait,
      y: this.portraitY - 46,
      alpha: 0,
      duration: 700,
      ease: 'Sine.in',
      onComplete: () => this.close({ type: 'stay' }),
    });
  }

  choose(choice) {
    if (this.locked) return;
    this.locked = true;
    if (choice.dust) return this.vanish();
    const { charId, state, onChoice } = this.data_;
    const { outcome, deltas } = applyChoice(charId, choice, state);
    onChoice?.(deltas);

    const over = checkGameOver(state);
    this.playItems(deltas, () => {
      this.locked = false;
      // la fin choisie passe avant la fin calculée : c'est elle qui a son image
      if (outcome.type === 'ending') return this.close(outcome);
      if (over) return this.close({ type: 'ending', ending: over, dusted: outcome.dusted });
      if (outcome.type === 'next') return this.showNode(outcome.node);
      this.close(outcome);
    });
  }

  // Objets remis puis objets reçus, un par un, avant la suite du dialogue.
  playItems({ gained, lost }, done) {
    const queue = [...lost.map((id) => () => this.flyOut(id)), ...gained.map((id) => () => this.flyIn(id))];
    if (!queue.length) {
      this.time.delayedCall(160, done);
      return;
    }
    this.clearButtons();
    const next = () => {
      const job = queue.shift();
      if (!job) return done();
      job().then(next);
    };
    next();
  }

  // L'objet quitte sa case et rejoint le personnage.
  flyOut(id) {
    const { x, y } = this.inventory.slotCenter(this.inventory.items.indexOf(id));
    this.inventory.remove(id);
    const icon = this.add.image(x, y, `item_${id}`).setScale(2).setDepth(200);
    const label = this.itemCaption(`Objet remis : ${ITEMS[id].name}`);
    statDown();
    return new Promise((resolve) => {
      this.tweens.add({
        targets: icon,
        x: PORTRAIT.x,
        y: 200,
        scale: 5,
        duration: 480,
        ease: 'Sine.inOut',
        onComplete: () => {
          this.tweens.add({
            targets: [icon, label],
            alpha: 0,
            duration: 320,
            delay: 480,
            onComplete: () => {
              icon.destroy();
              label.destroy();
              resolve();
            },
          });
        },
      });
    });
  }

  // L'objet apparaît en grand, puis file dans sa case.
  flyIn(id) {
    const icon = this.add.image(360, 170, `item_${id}`).setScale(1).setDepth(200);
    const label = this.itemCaption(`${this.char.finds ? 'Objet trouvé' : 'Objet reçu'} : ${ITEMS[id].name}`);
    statUp();
    return new Promise((resolve) => {
      this.tweens.chain({
        targets: icon,
        tweens: [
          { scale: 6, duration: 300, ease: 'Back.out' },
          { y: 164, duration: 500, ease: 'Sine.inOut' },
          {
            x: this.inventory.slotCenter(this.inventory.items.length).x,
            y: this.inventory.slotCenter(this.inventory.items.length).y,
            scale: 2,
            duration: 420,
            ease: 'Sine.in',
          },
        ],
        onComplete: () => {
          icon.destroy();
          label.destroy();
          this.inventory.add(id);
          this.time.delayedCall(160, resolve);
        },
      });
    });
  }

  itemCaption(str) {
    const t = text(this, 360, 232, str, 20, this.theme.name, { stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5).setDepth(200);
    return t;
  }

  close(outcome) {
    this.clearButtons();
    this.tweens.add({ targets: this.root, alpha: 0, y: 30, duration: 200 });
    this.tweens.add({
      targets: this.shade,
      fillAlpha: 0,
      duration: 220,
      onComplete: () => {
        const done = this.data_.onDone;
        this.scene.stop();
        done(outcome);
      },
    });
  }

  onKey(e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (this.typing) return this.finishTyping();
      if (this.buttons.length === 1) return this.buttons[0].fire();
    }
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n !== undefined && !this.typing && this.buttons[n]) this.buttons[n].fire();
  }
}

const hex = (str) => Phaser.Display.Color.HexStringToColor(str).color;

function wrapText(str, cols) {
  return str
    .split('\n')
    .map((para) => {
      const lines = [];
      let line = '';
      for (const word of para.split(' ')) {
        if (line && line.length + 1 + word.length > cols) {
          lines.push(line);
          line = word;
        } else line = line ? `${line} ${word}` : word;
      }
      lines.push(line);
      return lines.join('\n');
    })
    .join('\n');
}
