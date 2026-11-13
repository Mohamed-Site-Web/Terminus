import Phaser from 'phaser';
import { W, COLORS, SPEED, FONT_TITLE } from '../config.js';
import { hex } from '../art/draw.js';
import { text, pixelFrame } from '../ui/widgets.js';
import { uiTheme } from '../ui/themes.js';
import { InventoryPanel, INVENTORY } from '../ui/inventory.js';
import { World, STATION_STOP_Y, PLATFORM_X, SEATS } from './World.js';
import { createState, passengerCount, CAPACITY } from '../systems/state.js';
import {
  currentStop,
  nextStop,
  stopsLeft,
  advance,
  stopPassengers,
  alightAt,
  departureEffects,
  pickIncident,
  markIncident,
  dodgeIncident,
  useItem,
  pickFind,
  pickJunction,
  checkGameOver,
  terminusEnding,
} from '../systems/story.js';
import { ITEMS, ITEM_NOT_NOW } from '../data/items.js';
import { whistle, brake, statUp, statDown } from '../systems/audio.js';

// Panneau du trajet, en haut à gauche, de la même hauteur que l'inventaire.
const ROUTE = { x: 8, y: INVENTORY.y, w: 356, h: INVENTORY.h };

// Le trajet : le train roule, s'arrête, les passagers montent et parlent, les incidents s'enchaînent.
// Tout le déroulé est écrit de façon séquentielle (async/await) dans run().
export class RideScene extends Phaser.Scene {
  constructor() {
    super('Ride');
  }

  create() {
    this.state = createState();
    // Phaser réutilise l'instance de scène quand on rejoue : tout remettre à zéro ici.
    this.over = false;
    this.started = false;
    this.arrived = null;
    this.mode = 'stopped';
    this.leaving = false;
    this.lastNotice = null;
    this.world = new World(this, currentStop(this.state).biome);
    this.buildHud();
    this.cameras.main.fadeIn(500, 14, 16, 22);
    this.run().catch((err) => console.error(err));
  }

  update(_, dt) {
    this.driveTrain(dt);
    this.world.update(dt);
  }

  // ───────────────────────── Déroulé d'une partie ─────────────────────────

  async run() {
    const state = this.state;
    for (;;) {
      const stop = currentStop(state);
      const waiting = stopPassengers(stop, state);

      await this.travelTo(stop, waiting);
      if (this.over) return;
      this.refreshHud();
      await this.stopBanner(stop);

      // Les passagers à bord qui descendent parler sur le quai (`aboard: true`) quittent leur verrière
      this.world.away = waiting.filter((p) => p.aboard).map((p) => p.char);
      if (this.world.away.length) this.world.refreshHeads(state);

      // Descentes
      const leaving = alightAt(stop, state);
      if (leaving.length) {
        this.world.refreshHeads(state);
        await this.animateAlight(leaving);
        this.refreshHud();
      }

      // Conversations avec les passagers du quai, l'un après l'autre
      for (let i = 0; i < waiting.length; i++) {
        const mini = this.world.station.minis[i];
        const outcome = await this.talk(waiting[i].char, waiting[i].node);
        if (this.over) return;
        if (await this.handleOutcome(outcome)) return;
        this.world.away = this.world.away.filter((id) => id !== waiting[i].char);
        if (outcome.type === 'board') await this.animateBoard(mini);
        else this.world.refreshHeads(state);
      }

      if (!nextStop(stop, state)) return this.finish(terminusEnding(state));

      // Départ
      this.leaving = true;
      whistle();
      await this.wait(500);
      const chaos = departureEffects(state);
      if (chaos) {
        this.notice('Surcharge !');
        statDown();
        this.refreshHud();
        if (await this.handleOutcome({ type: 'stay' })) return;
      }
      this.mode = 'depart';
      this.refreshHud();
      this.countdown();

      // Incident à bord, ronde du conducteur, puis aiguillage éventuel, pendant que le train roule
      const incident = pickIncident(stop.id, state);
      if (incident && (await this.onTheWay(incident, true))) return;
      const find = pickFind(stop.id, state);
      if (find && (await this.onTheWay(find))) return;
      const junction = pickJunction(stop.id, state);
      if (junction) {
        const before = nextStop(stop, state);
        if (await this.onTheWay(junction)) return;
        if (nextStop(stop, state) !== before) this.countdown("Changement d'itinéraire !");
      }

      this.leaving = false;
      advance(state);
      this.refreshHud();
      this.world.setBiome(currentStop(state).biome);
      this.applyTheme();
    }
  }

  // Dialogue pendant le trajet (incident ou aiguillage). Renvoie true si la partie est finie.
  // canDodge : un train invisible échappe à l'incident (pas aux rondes ni aux aiguillages).
  async onTheWay(event, canDodge = false) {
    await this.wait(2600);
    const dodged = canDodge && dodgeIncident(this.state);
    if (dodged) {
      this.world.setTrainGhost(false);
      this.notice(dodged, COLORS.brassLight);
      return false;
    }
    markIncident(event, this.state);
    const outcome = await this.talk(event.char, event.node, event.title);
    if (this.over) return true;
    this.world.refreshHeads(this.state, { pop: outcome.type === 'board' });
    return this.handleOutcome(outcome);
  }

  // Fin de partie éventuelle après un dialogue. Renvoie true si la partie est finie.
  async handleOutcome(outcome) {
    this.refreshHud();
    // Claquement de doigts : chaque disparu dit sa dernière phrase avant de partir en fumée.
    if (outcome.dusted) {
      this.world.refreshHeads(this.state);
      for (const id of outcome.dusted) await this.talk(id, null, 'Parti en fumée', true);
      if (outcome.type !== 'ending') this.notice('Toi, tu es encore là. Cette fois.', COLORS.chaos);
    }
    if (outcome.type === 'ending') {
      this.finish(outcome.ending);
      return true;
    }
    if (outcome.type === 'terminus') {
      this.finish(terminusEnding(this.state));
      return true;
    }
    const over = checkGameOver(this.state);
    if (over) {
      this.finish(over);
      return true;
    }
    return false;
  }

  finish(endingId) {
    if (this.over) return;
    this.over = true;
    this.mode = 'stopped';
    this.cameras.main.fadeOut(900, 14, 16, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('End', { endingId, state: this.state }));
  }

  talk(charId, node, title, dust = false) {
    return new Promise((resolve) => {
      this.scene.launch('Dialogue', {
        charId,
        node,
        title,
        dust,
        state: this.state,
        theme: uiTheme(this.world.biomeId),
        onChoice: (d) => this.onDeltas(d),
        onDone: resolve,
      });
    });
  }

  wait(ms) {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  // ───────────────────────── Conduite du train ─────────────────────────

  // Roule (au moins `legSeconds`, sauf au tout premier arrêt), puis freine pile devant le quai.
  travelTo(stop, waiting) {
    return new Promise((resolve) => {
      this.mode = 'depart';
      const first = this.state.stopIndex === 0 && !this.started;
      this.started = true;
      this.time.delayedCall(first ? 1500 : SPEED.legSeconds * 1000, () => {
        this.world.spawnStation(stop, waiting.map((p) => p.char));
        this.mode = 'arrive';
        this.arrived = resolve;
      });
    });
  }

  driveTrain(dt) {
    const s = dt / 1000;
    const w = this.world;
    if (this.mode === 'depart') {
      w.v = Math.min(SPEED.cruise, w.v + SPEED.accel * s);
    } else if (this.mode === 'arrive') {
      const d = STATION_STOP_Y - w.station.y;
      if (d <= 0.5) {
        w.station.y = STATION_STOP_Y;
        w.v = 0;
        this.mode = 'stopped';
        brake();
        const done = this.arrived;
        this.arrived = null;
        done?.();
        return;
      }
      // Vitesse maximale qui permet encore de s'arrêter à temps : v² = 2·a·d
      const vmax = Math.sqrt(2 * SPEED.accel * d);
      w.v = Math.min(vmax, w.v + SPEED.accel * s, SPEED.cruise);
      // Éviter de ne jamais arriver quand la vitesse est quasi nulle
      w.v = Math.max(w.v, Math.min(30, d * 4));
      w.v = Math.min(w.v, d / s);
    }
  }

  // ───────────────────────── Animations des passagers ─────────────────────────

  // Le voyageur sort de la gare, traverse le quai jusqu'à la voiture,
  // puis sa tête apparaît dans une verrière.
  animateBoard(mini) {
    return new Promise((resolve) => {
      const st = this.world.station;
      const seat = SEATS[Math.max(0, Math.min(SEATS.length - 1, this.state.aboard.indexOf(mini.charId)))];
      mini.setVisible(true).setAlpha(0);
      this.tweens.chain({
        targets: mini,
        tweens: [
          { alpha: 1, y: st.door.y + 8, duration: 220 },
          { x: PLATFORM_X + 40, y: seat.y - st.y + 26, duration: 900, ease: 'Sine.inOut' },
          { x: PLATFORM_X + 14, duration: 260 },
          { x: PLATFORM_X - 6, alpha: 0, duration: 260 },
        ],
        onComplete: () => {
          mini.setVisible(false);
          this.world.refreshHeads(this.state, { pop: true });
          this.refreshHud();
          resolve();
        },
      });
      // petit pas sautillant pendant la marche
      this.tweens.add({ targets: mini, scaleY: mini.scaleY * 0.92, duration: 120, yoyo: true, repeat: 6, delay: 220 });
    });
  }

  // Les voyageurs qui descendent sortent des voitures et s'éloignent sur le quai.
  animateAlight(ids) {
    const jobs = ids.map(
      (id, i) =>
        new Promise((resolve) => {
          const seat = SEATS[i % SEATS.length];
          const m = this.add
            .image(PLATFORM_X - 4, seat.y + 26, this.textures.exists(`char_${id}`) ? `char_${id}` : 'char_anon')
            .setOrigin(0.5, 1)
            .setScale(2)
            .setDepth(7)
            .setAlpha(0);
          this.tweens.add({
            targets: m,
            x: PLATFORM_X + 24,
            alpha: 1,
            duration: 300,
            delay: i * 220,
            onComplete: () =>
              this.tweens.add({
                targets: m,
                // ils rentrent dans la gare par la porte
                x: this.world.station.x + this.world.station.door.x,
                y: this.world.station.y + this.world.station.door.y,
                alpha: 0,
                duration: 1300,
                onComplete: () => {
                  m.destroy();
                  resolve();
                },
              }),
          });
        }),
    );
    return Promise.all(jobs);
  }

  // ───────────────────────── Interface ─────────────────────────

  // HUD : le trajet à gauche, l'inventaire à droite. Satisfaction, chaos et retard ne s'affichent plus :
  // ils continuent de décider des fins, mais le joueur les devine à ce que disent les passagers.
  buildHud() {
    const x = ROUTE.x + 18;
    this.routeFrame = this.add.graphics().setDepth(100);
    this.hudLabel = text(this, x, ROUTE.y + 12, '', 12, COLORS.textDim).setDepth(101);
    this.hudStop = text(this, x, ROUTE.y + 24, '', 28, COLORS.brassLight, { fontFamily: FONT_TITLE, fontStyle: '600' }).setDepth(101);
    this.hudCount = text(this, x, ROUTE.y + 56, '', 12, COLORS.brass).setOrigin(0, 0.5).setDepth(101);
    this.hudTrack = this.add.graphics().setDepth(101);
    this.hudPeople = this.add.image(ROUTE.x + ROUTE.w - 74, ROUTE.y + 19, 'icon_people').setScale(2).setDepth(101);
    this.hudAboard = text(this, ROUTE.x + ROUTE.w - 60, ROUTE.y + 19, '', 15, COLORS.text).setOrigin(0, 0.5).setDepth(101);
    this.inventory = new InventoryPanel(this, uiTheme(this.world.biomeId), this.state.items);
    this.inventory.onUse = (id) => this.clickItem(id);
    this.applyTheme();
  }

  // L'interface suit le biome traversé.
  applyTheme() {
    this.theme = uiTheme(this.world.biomeId);
    this.routeFrame.clear();
    pixelFrame(this.routeFrame, ROUTE.x, ROUTE.y, ROUTE.w, ROUTE.h, 'tab', this.theme);
    this.inventory.setTheme(this.theme);
    this.hudLabel.setColor(this.theme.role);
    this.hudStop.setColor(this.theme.name);
    this.refreshHud();
  }

  refreshHud() {
    const s = this.state;
    const moving = this.leaving || this.mode !== 'stopped';
    const here = currentStop(s);
    const target = (this.leaving && nextStop(here, s)) || here;
    this.hudLabel.setText(moving ? 'PROCHAIN ARRÊT' : 'EN GARE');
    this.hudStop.setText(target.name);
    const left = this.stopsToGo();
    this.hudCount
      .setText(left === 0 ? 'TERMINUS. ET MAINTENANT ?' : `IL RESTE ${left} ARRÊT${left > 1 ? 'S' : ''} AVANT ???`)
      .setColor(left <= 1 ? COLORS.bad : this.theme.accent);
    const n = passengerCount(s);
    this.hudAboard.setText(`${n}/${CAPACITY}`).setColor(n > CAPACITY ? COLORS.bad : this.theme.name);
    this.drawTrack(left);
    this.inventory.set(s.items);
  }

  // La ligne : gares passées, position du train, gares à venir, et un dernier point d'interrogation.
  drawTrack(left) {
    const g = this.hudTrack;
    const { frame, accent, name } = this.theme;
    const passed = this.leaving || this.mode === 'stopped' ? this.state.route.length : this.state.route.length - 1;
    const total = passed + left;
    const x0 = ROUTE.x + 20;
    const step = Math.min(30, (ROUTE.w - 44) / Math.max(1, total - 1));
    const y = ROUTE.y + 70;
    g.clear();
    g.fillStyle(hex(frame.mid));
    g.fillRect(x0, y - 1, step * (total - 1), 2);
    for (let i = 0; i < total; i++) {
      const x = Math.round(x0 + i * step);
      const last = i === total - 1;
      const current = i === passed - 1;
      g.fillStyle(hex(frame.ink));
      g.fillRect(x - 4, y - 4, 8, 8);
      g.fillStyle(hex(last ? COLORS.bad : current ? name : i < passed ? accent : frame.dark));
      g.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  // Arrêts restants jusqu'au terminus inclus (celui vers lequel on roule compte encore).
  stopsToGo() {
    const s = this.state;
    const here = currentStop(s);
    if (this.leaving) return stopsLeft(here, s);
    return stopsLeft(here, s) + (this.mode === 'stopped' ? 0 : 1);
  }

  // Grand compte à rebours au départ, et quand un aiguillage change la ligne.
  countdown(note) {
    const left = this.stopsToGo();
    const big = left === 1 ? 'DERNIER ARRÊT' : `IL RESTE ${left} ARRÊTS`;
    const c = this.add.container(W / 2, 236).setDepth(95).setAlpha(0);
    const t = text(this, 0, 0, big, 40, left <= 1 ? COLORS.bad : COLORS.brassLight, {
      fontFamily: FONT_TITLE,
      fontStyle: '700',
      stroke: COLORS.ink,
      strokeThickness: 6,
    }).setOrigin(0.5);
    c.add(t);
    if (note) c.add(text(this, 0, -38, note, 18, COLORS.chaos, { stroke: COLORS.ink, strokeThickness: 4 }).setOrigin(0.5));
    const sub = left === 1 ? 'Prochain arrêt : Terminus ?' : 'avant le terminus. Personne ne sait ce qui vous y attend.';
    c.add(text(this, 0, 34, sub, 14, COLORS.text, { stroke: COLORS.ink, strokeThickness: 4 }).setOrigin(0.5));
    if (note) statDown();
    this.tweens.add({ targets: c, alpha: 1, scale: { from: 1.25, to: 1 }, duration: 380, ease: 'Back.out' });
    this.tweens.add({ targets: t, scale: 1.06, duration: 260, yoyo: true, repeat: 3, delay: 420 });
    this.tweens.add({ targets: c, alpha: 0, duration: 600, delay: 2600, onComplete: () => c.destroy() });
  }

  onDeltas(d) {
    this.refreshHud();
    let good = 0;
    for (const key of ['sat', 'chaos', 'delay']) {
      if (d[key]) good += key === 'sat' ? Math.sign(d[key]) : -Math.sign(d[key]);
    }
    if (good > 0) statUp();
    else if (good < 0) statDown();
  }

  // Clic sur un objet qui a un pouvoir : seulement en roulant, hors dialogue.
  clickItem(id) {
    if (!ITEMS[id]?.use || this.over || this.scene.isActive('Dialogue')) return;
    if (!this.leaving && this.mode === 'stopped') {
      this.notice(ITEM_NOT_NOW, COLORS.text);
      return;
    }
    const used = useItem(id, this.state);
    this.notice(used.message, used.done ? COLORS.brassLight : COLORS.text);
    if (!used.done) return;
    statUp();
    this.inventory.hideTip();
    if (used.flag) this.world.setTrainGhost(true);
    this.refreshHud();
  }

  // Message bref sous le panneau du trajet.
  notice(str, color = COLORS.bad) {
    this.lastNotice?.destroy();
    const t = text(this, ROUTE.x + 18, ROUTE.y + ROUTE.h + 8, str, 18, color, { stroke: COLORS.ink, strokeThickness: 4 }).setDepth(102);
    this.lastNotice = t;
    this.tweens.add({ targets: t, y: t.y + 26, alpha: 0, duration: 1000, delay: 2000, ease: 'Sine.in', onComplete: () => t.destroy() });
  }

  // Nom de la gare à l'arrivée. Le dialogue ne commence qu'une fois la bannière lue.
  stopBanner(stop) {
    const theme = this.theme;
    const c = this.add.container(W / 2, 150).setDepth(90).setAlpha(0);
    const g = this.add.graphics();
    const w = 600;
    const h = stop.clue ? 112 : 84;
    pixelFrame(g, -w / 2, -38, w, h, 'tab', theme, { ornate: true });
    const name = text(this, 0, -12, stop.name, 34, theme.name, { fontFamily: FONT_TITLE, fontStyle: '600' }).setOrigin(0.5);
    const sub = text(this, 0, 20, stop.subtitle, 15, theme.role).setOrigin(0.5);
    c.add([g, name, sub]);
    // Rumeur sur le terminus : chaque gare contredit la précédente.
    if (stop.clue) c.add(text(this, 0, 50, `Rumeur : « ${stop.clue} »`, 13, theme.accent).setOrigin(0.5));
    const hold = stop.clue ? 2600 : 1400;
    this.tweens.add({ targets: c, alpha: 1, y: 160, duration: 350, ease: 'Sine.out' });
    return new Promise((resolve) => {
      this.tweens.add({
        targets: c,
        alpha: 0,
        duration: 300,
        delay: hold,
        onComplete: () => {
          c.destroy();
          resolve();
        },
      });
    });
  }
}
