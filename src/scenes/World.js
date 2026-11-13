// Le monde qui défile, vu de dessus : sol, voie, décors, gare, train, lumière et particules.
// Le train reste fixe et « monte » l'écran : c'est le paysage qui descend (vitesse `v` en px/s).

import Phaser from 'phaser';
import { W, H, S, LAYOUT, BIOMES } from '../config.js';
import { TRAIN, TRACK_W } from '../art/textures.js';
import { LIGHTS, PLATFORM } from '../art/decor.js';
import { FLAT } from '../art/forest.js';

const DEPTH = {
  ground: 0,
  small: 2,
  flat: 3, // mares, dalles : au sol, sous les arbres
  track: 4,
  station: 6,
  decor: 10, // + y/1000 : les éléments plus bas passent devant
  train: 30,
  heads: 31,
  glare: 32,
  smoke: 34,
  particles: 36,
  light: 50,
  glow: 51,
  vignette: 60,
};

const TRACK_LEFT = LAYOUT.trackX - (TRACK_W / 2) * S;
export const PLATFORM_X = TRACK_LEFT + TRACK_W * S; // bord du quai côté voie
const BUILDING_X = PLATFORM_X + PLATFORM.w * S + 4;
const PLATFORM_KIND = { city: 'wood', night: 'stone', forest: 'wood', swamp: 'wood', sky: 'cloud', void: 'void', cave: 'stone', sylve: 'marble', stade: 'stone' };

// Le train de haut en bas : [texture, y écran du haut].
const PARTS = (() => {
  let y = LAYOUT.trainTopY;
  const out = [['loco', y]];
  y += TRAIN.loco.h * S;
  for (const [key, spec] of [['tender', TRAIN.tender], ['coach', TRAIN.coach], ['coach_last', TRAIN.coach]]) {
    y -= spec.overlap * S;
    out.push([key, y]);
    y += spec.h * S;
  }
  return out;
})();
export const TRAIN_BOTTOM = PARTS[PARTS.length - 1][1] + TRAIN.coach.h * S;

// Les 8 places : centre de chaque verrière (y écran), voiture de tête d'abord.
export const SEATS = PARTS.filter(([k]) => k.startsWith('coach')).flatMap(([, top], part) =>
  TRAIN.skylights.map((sy) => ({ part: part + 2, y: top + (sy + 4) * S })),
);
// Centre des voitures : la gare s'arrête à cette hauteur.
export const STATION_STOP_Y = Math.round((SEATS[0].y + SEATS[SEATS.length - 1].y) / 2);

const pick = (list) => {
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of list) if ((r -= w) <= 0) return k;
  return list[0][0];
};

const GHOST_ALPHA = 0.3;

export class World {
  constructor(scene, biome) {
    this.scene = scene;
    this.biomeId = biome;
    this.v = 0;
    this.time = 0;
    this.decor = [];
    this.lights = [];
    this.particles = [];
    this.station = null;
    this.next = { left: 0, right: 0, small: 0 };
    this.smokeTimer = 0;
    this.partTimer = 0;
    this.night = BIOMES[biome].night ? 1 : 0;

    this.ground = this.makeGround(biome);
    this.track = scene.add
      .tileSprite(TRACK_LEFT, 0, TRACK_W, H / S, 'track')
      .setOrigin(0, 0)
      .setScale(S)
      .setDepth(DEPTH.track);

    // Éclairage : un calque multiplicatif teinte toute la scène, les halos s'ajoutent par-dessus.
    this.shade = scene.add
      .rectangle(0, 0, W, H, BIOMES[biome].ambient)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(DEPTH.light);
    this.ambient = Phaser.Display.Color.IntegerToColor(BIOMES[biome].ambient);
    scene.add.image(0, 0, 'vignette').setOrigin(0, 0).setScale(4).setDepth(DEPTH.vignette);

    this.buildTrain();

    this.populate();
  }

  // Décor déjà présent au démarrage
  populate() {
    const gap = this.biome.spacing ? this.biome.spacing * 0.7 : this.biome.dense ? 24 : 40;
    const smallGap = this.biome.smallSpacing ?? 14;
    for (const side of ['left', 'right']) for (let y = -40; y < H + 120; y += gap + Math.random() * gap) this.spawnDecor(side, y);
    for (let y = -20; y < H + 40; y += smallGap) this.spawnSmall(y);
  }

  // Distance avant le prochain décor d'un côté, puis avant le prochain petit élément.
  decorGap() {
    const { spacing, dense } = this.biome;
    if (spacing) return spacing * (0.6 + Math.random() * 0.8);
    return dense ? 18 + Math.random() * 30 : 34 + Math.random() * 60;
  }

  smallGap() {
    const { smallSpacing } = this.biome;
    return smallSpacing ? smallSpacing * (0.6 + Math.random() * 0.8) : 12 + Math.random() * 16;
  }

  clearDecor() {
    for (const d of this.decor) d.destroy();
    this.decor = [];
  }

  get biome() {
    return BIOMES[this.biomeId];
  }

  makeGround(biome) {
    return this.scene.add
      .tileSprite(0, 0, W / S, H / S, `ground_${biome}`)
      .setOrigin(0, 0)
      .setScale(S)
      .setDepth(DEPTH.ground);
  }

  // Changement de lieu : nouveau sol en fondu, nouvelle lumière, le nouveau décor arrive par le haut.
  setBiome(biome) {
    if (biome === this.biomeId) return;
    this.biomeId = biome;
    const old = this.ground;
    const fresh = this.makeGround(biome).setAlpha(0).setDepth(DEPTH.ground + 0.5);
    fresh.tilePositionY = old.tilePositionY;
    this.ground = fresh;
    this.scene.tweens.add({
      targets: fresh,
      alpha: 1,
      duration: 1800,
      onComplete: () => {
        old.destroy();
        fresh.setDepth(DEPTH.ground);
      },
    });
    const from = this.ambient;
    const to = Phaser.Display.Color.IntegerToColor(BIOMES[biome].ambient);
    this.scene.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 1800,
      onUpdate: (tw) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue());
        this.shade.fillColor = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      },
    });
    this.ambient = to;
    this.scene.tweens.add({ targets: this, night: BIOMES[biome].night ? 1 : 0, duration: 1800 });
  }

  // ───────────────────────── Train ─────────────────────────

  buildTrain() {
    const sc = this.scene;
    this.parts = PARTS.map(([key, y]) =>
      sc.add.image(LAYOUT.trackX, y, key).setOrigin(0.5, 0).setScale(S).setDepth(DEPTH.train),
    );
    this.parts.forEach((p) => (p.baseY = p.y));
    this.heads = SEATS.map((seat) =>
      sc.add.image(LAYOUT.trackX, seat.y, 'head_anon').setScale(S).setCrop(0, 2, 12, 8).setDepth(DEPTH.heads).setVisible(false),
    );
    this.glares = SEATS.map((seat) =>
      sc.add.image(LAYOUT.trackX, seat.y, 'skylight_glare').setScale(S).setDepth(DEPTH.glare),
    );

    // Phare, feux arrière et verrières éclairées (visibles la nuit seulement).
    const loco = this.parts[0];
    this.addLight(loco, 0, 2 * S, { scale: 3.2, color: 0xffe2a8, alpha: 0.9 });
    this.addLight(loco, 0, -40, { scale: 2.4, color: 0xffe2a8, alpha: 0.35 });
    const last = this.parts[this.parts.length - 1];
    for (const lx of [-10.5, 10.5]) this.addLight(last, lx * S, 52 * S, { scale: 0.7, color: 0xff5a40, alpha: 0.9 });
    this.addLight(loco, -3 * S, 60 * S, { scale: 1.2, color: 0xff9a4a, alpha: 0.6 }); // foyer
    SEATS.forEach((seat) => this.addLight(this.parts[seat.part], 0, seat.y - this.parts[seat.part].baseY, { scale: 0.9, color: 0xffc070, alpha: 0.45 }));
  }

  // Train invisible (hologramme de Mélenchon) : il ne reste qu'une silhouette.
  setTrainGhost(on) {
    this.ghost = on;
    this.scene.tweens.add({ targets: [...this.parts, ...this.heads, ...this.glares], alpha: on ? GHOST_ALPHA : 1, duration: 500 });
  }

  // Têtes visibles dans les verrières : les passagers nommés d'abord, puis la foule anonyme.
  // `away` : passagers descendus parler sur le quai, leur verrière reste vide en attendant.
  refreshHeads(state, { pop = false } = {}) {
    const away = this.away ?? [];
    const ids = [...state.aboard.filter((id) => !away.includes(id)), ...Array.from({ length: state.extra }, (_, i) => `anon${i % 4 ? i % 4 : ''}`)];
    this.heads.forEach((h, i) => {
      const id = ids[i];
      const wasVisible = h.visible && h.texture.key === `head_${id}`;
      h.setVisible(!!id);
      if (!id) return;
      h.setTexture(this.scene.textures.exists(`head_${id}`) ? `head_${id}` : 'head_anon').setCrop(0, 2, 12, 8);
      if (pop && !wasVisible) {
        h.setAlpha(0);
        this.scene.tweens.add({ targets: h, alpha: this.ghost ? GHOST_ALPHA : 1, duration: 400 });
      }
    });
  }

  // ───────────────────────── Décor ─────────────────────────

  texSize(key) {
    const img = this.scene.textures.get(key).getSourceImage();
    return [img.width * S, img.height * S];
  }

  spawnDecor(side, y = -10) {
    // forêt dense : plusieurs essais par rangée pour remplir la bande
    for (let i = this.biome.dense ? 3 : 1; i > 0; i--) this.placeDecor(side, y + (i - 1) * 6);
  }

  placeDecor(side, y) {
    const key = pick(this.biome.decor);
    const [w, h] = this.texSize(key);
    const [b0, b1] = side === 'left' ? LAYOUT.leftBand : LAYOUT.rightBand;
    if (b1 - b0 < w) return;
    const x = Phaser.Math.Between(b0 + w / 2, b1 - w / 2);
    // pas sur un élément déjà posé du même côté
    // (en forêt dense, les canopées se recouvrent en partie, comme vues d'avion)
    const house = key.startsWith('house');
    const [mx, my] = this.biome.dense && !FLAT.has(key) && !house ? [w * 0.3, 0.3] : [8, 0.6];
    const blocked = this.decor.some((d) => !d.small && Math.abs(d.x - x) < (d.displayWidth + w) / 2 - (d.flat || d.house ? 8 : mx) && Math.abs(d.y - y) < Math.min(h, d.displayHeight) * (d.flat || d.house ? 0.6 : my));
    if (blocked) return;
    const img = this.scene.add
      .image(x, y + h * 0.15, key)
      .setOrigin(0.5, 1)
      .setScale(S)
      .setFlipX(Math.random() < 0.5)
      .setDepth((FLAT.has(key) ? DEPTH.flat : DEPTH.decor) + (y + h * 0.15) / 1000);
    img.flat = FLAT.has(key);
    img.house = house;
    img.drift = key === 'cloud' ? 6 : key === 'birds' ? -25 : key === 'balloon' ? 4 : 0;
    this.decor.push(img);
    for (const [lx, ly] of LIGHTS[key] ?? []) {
      const tw = w / S;
      const ox = (lx - tw / 2) * S * (img.flipX ? -1 : 1);
      this.addLight(img, ox, (ly - h / S) * S, { scale: key.startsWith('house') ? 1.4 : 1.1, color: 0xffc070, alpha: 0.8 });
    }
  }

  spawnSmall(y = -10) {
    const list = this.biome.small;
    if (!list.length) return;
    const key = list[Math.floor(Math.random() * list.length)];
    const side = Math.random() < 0.5 ? LAYOUT.leftBand : LAYOUT.rightBand;
    const x = Phaser.Math.Between(side[0], side[1]);
    const img = this.scene.add.image(x, y, key).setOrigin(0.5, 1).setScale(S).setFlipX(Math.random() < 0.5).setDepth(DEPTH.small);
    img.small = true;
    img.drift = 0;
    this.decor.push(img);
  }

  // Gare, quai et passagers en attente, placés hors écran en haut, à droite de la voie.
  spawnStation(stop, waitingIds) {
    const sc = this.scene;
    const kind = this.biome.station;
    const c = sc.add.container(0, -PLATFORM.h * S / 2 - 60).setDepth(DEPTH.station);
    const plat = sc.add.image(PLATFORM_X, 0, `platform_${PLATFORM_KIND[kind]}`).setOrigin(0, 0.5).setScale(S);
    const [bw, bh] = this.texSize(`station_${kind}`);
    const bx = BUILDING_X + bw / 2;
    const building = sc.add.image(bx, 0, `station_${kind}`).setScale(S);
    c.add([plat, building]);
    // Les décors de la bande droite ne doivent pas chevaucher le bâtiment.
    for (const d of this.decor)
      if (d.x > LAYOUT.rightBand[0] - 40 && d.x - d.displayWidth / 2 < bx + bw / 2 && d.y > c.y - bh && d.y - d.displayHeight < c.y + bh) d.setVisible(false);
    for (const [lx, ly] of LIGHTS[`station_${kind}`] ?? [])
      this.addLight(c, bx + (lx - bw / S / 2) * S, (ly - bh / S / 2) * S, { scale: 1.6, color: 0xffc070, alpha: 0.85 });

    // Les voyageurs attendent à l'intérieur : on ne les découvre qu'au dialogue.
    // Ceux qui montent sortent ensuite par la porte de la gare.
    c.door = { x: bx, y: bh / 2 - 14 };
    c.minis = waitingIds.map((id) => {
      const m = sc.add.image(c.door.x, c.door.y, sc.textures.exists(`char_${id}`) ? `char_${id}` : 'char_anon').setOrigin(0.5, 1).setScale(S).setVisible(false);
      m.charId = id;
      c.add(m);
      return m;
    });
    this.station = c;
    return c;
  }

  // ───────────────────────── Lumières ─────────────────────────

  addLight(target, ox, oy, { scale = 1, color = 0xffc070, alpha = 0.8 } = {}) {
    const img = this.scene.add
      .image(0, 0, 'light')
      .setScale(scale)
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow)
      .setAlpha(0);
    this.lights.push({ img, target, ox, oy, alpha, flicker: Math.random() * 10 });
  }

  updateLights() {
    this.lights = this.lights.filter((l) => {
      if (!l.target.active) {
        l.img.destroy();
        return false;
      }
      const t = l.target;
      l.img.setPosition(t.x + l.ox, (t.baseY ?? t.y) + l.oy + (t.baseY != null ? t.y - t.baseY : 0));
      const flick = 0.93 + Math.sin(this.time / 140 + l.flicker) * 0.04 + Math.sin(this.time / 53 + l.flicker * 3) * 0.03;
      l.img.setAlpha(this.night * l.alpha * flick * (t.visible === false ? 0 : 1));
      return true;
    });
  }

  // ───────────────────────── Particules ─────────────────────────

  spawnParticle() {
    const sc = this.scene;
    const type = this.biome.particles;
    if (!type) return;
    const x = Math.random() * W;
    let p;
    if (type === 'leaves') {
      p = sc.add.image(x, -10, 'leaf').setScale(S).setTint(Phaser.Utils.Array.GetRandom([0xc8a040, 0x9a7a3a, 0x7a9a4a]));
      p.vx = 20 + Math.random() * 25;
      p.vy = 40 + Math.random() * 30;
      p.spin = (Math.random() - 0.5) * 4;
    } else if (type === 'chaff') {
      p = sc.add.image(x, -10, 'leaf').setScale(S).setTint(Phaser.Utils.Array.GetRandom([0xf0d070, 0xd8ae48, 0xe8c860]));
      p.vx = 28 + Math.random() * 30;
      p.vy = 20 + Math.random() * 20;
      p.spin = (Math.random() - 0.5) * 5;
    } else if (type === 'fireflies') {
      p = sc.add.image(x, Math.random() * H, 'mote').setScale(S).setTint(0xd8f080).setBlendMode(Phaser.BlendModes.ADD);
      p.vx = (Math.random() - 0.5) * 20;
      p.vy = (Math.random() - 0.5) * 20;
      p.life = 4000;
    } else if (type === 'mist') {
      p = sc.add.image(x, -40, 'mist').setScale(S * (1.5 + Math.random())).setAlpha(0.55);
      p.vx = 6;
      p.vy = 0;
    } else if (type === 'spores') {
      p = sc.add.image(x, H + 10, 'mote').setScale(S).setTint(0x7af0e0).setBlendMode(Phaser.BlendModes.ADD);
      p.vx = (Math.random() - 0.5) * 16;
      p.vy = -12 - Math.random() * 14;
    } else if (type === 'confetti') {
      p = sc.add.image(x, -10, 'confetti').setScale(S).setTint(Phaser.Utils.Array.GetRandom([0x2a50b8, 0xb02850, 0xffffff, 0xffd23a]));
      p.vx = (Math.random() - 0.5) * 40;
      p.vy = 50 + Math.random() * 40;
      p.spin = (Math.random() - 0.5) * 8;
    } else if (type === 'motes') {
      p = sc.add.image(x, H + 10, 'mote').setScale(S).setTint(0xffd890).setBlendMode(Phaser.BlendModes.ADD); // le sable remonte
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = -25 - Math.random() * 20;
    }
    p.setDepth(DEPTH.particles);
    p.type = type;
    p.age = 0;
    this.particles.push(p);
  }

  updateParticles(dtMs, dy) {
    const dt = dtMs / 1000;
    const rate = { leaves: 260, chaff: 420, fireflies: 180, mist: 900, motes: 200, spores: 220, confetti: 240 }[this.biome.particles];
    this.partTimer -= dtMs;
    if (rate && this.partTimer <= 0 && this.particles.length < 60) {
      this.spawnParticle();
      this.partTimer = rate;
    }
    this.particles = this.particles.filter((p) => {
      p.age += dtMs;
      p.x += p.vx * dt;
      p.y += p.vy * dt + (p.type === 'motes' || p.type === 'spores' ? 0 : dy);
      if (p.type === 'leaves' || p.type === 'confetti' || p.type === 'chaff') {
        p.rotation += p.spin * dt;
        p.x += Math.sin(p.age / 300) * 0.6;
      }
      if (p.type === 'fireflies') {
        p.setAlpha(Math.max(0, Math.sin((p.age / p.life) * Math.PI)) * (0.5 + 0.5 * Math.sin(p.age / 120)));
        if (p.age > p.life) p.y = H + 100;
      }
      if (p.y > H + 60 || p.y < -60 || p.x > W + 60) {
        p.destroy();
        return false;
      }
      return true;
    });
  }

  // ───────────────────────── Boucle ─────────────────────────

  update(dtMs) {
    const dt = dtMs / 1000;
    const dy = this.v * dt;
    this.time += dtMs;

    this.ground.tilePositionY -= dy / S;
    this.track.tilePositionY -= dy / S;

    for (const d of this.decor) {
      d.y += dy;
      d.x += d.drift * dt;
    }
    this.decor = this.decor.filter((d) => {
      if (d.y - d.displayHeight < H + 20) return true;
      d.destroy();
      return false;
    });

    if (this.station) {
      this.station.y += dy;
      if (this.station.y > H + PLATFORM.h * S) {
        this.station.destroy();
        this.station = null;
      }
    }

    // Nouveau décor en fonction de la distance parcourue
    for (const side of ['left', 'right']) {
      this.next[side] -= dy;
      if (this.next[side] > 0) continue;
      const nearStation = side === 'right' && this.station && this.station.y < PLATFORM.h * S + 120;
      if (!nearStation) this.spawnDecor(side);
      this.next[side] = this.decorGap();
    }
    this.next.small -= dy;
    if (this.next.small <= 0) {
      this.spawnSmall();
      this.next.small = this.smallGap();
    }

    // Le train vibre un peu quand il roule
    const moving = this.v > 8;
    this.parts.forEach((p, i) => {
      p.y = p.baseY + (moving && Math.floor(this.time / 140 + i * 0.5) % 2 ? 1 : 0);
    });
    SEATS.forEach((seat, i) => {
      const off = this.parts[seat.part].y - this.parts[seat.part].baseY;
      this.heads[i].y = seat.y + off;
      this.glares[i].y = seat.y + off;
    });

    this.updateLights();
    this.updateParticles(dtMs, dy);

    // Fumée : plus dense quand le train roule vite
    this.smokeTimer -= dtMs;
    if (this.smokeTimer <= 0) {
      this.puff();
      this.smokeTimer = moving ? 200 - Math.min(140, this.v * 0.6) : 650;
    }
  }

  // La fumée sort de la cheminée et traîne derrière le train (vers le bas de l'écran).
  puff() {
    const loco = this.parts[0];
    const s = this.scene.add
      .image(loco.x + (Math.random() - 0.5) * 4, loco.y + 9.5 * S, 'smoke')
      .setScale(S * (0.5 + Math.random() * 0.3))
      .setDepth(DEPTH.smoke)
      .setAlpha(0.85)
      .setRotation(Math.random() * 6);
    this.scene.tweens.add({
      targets: s,
      x: s.x + (Math.random() - 0.3) * 50,
      y: s.y + 40 + this.v * 1.1,
      scale: S * (1.6 + Math.random() * 0.6),
      alpha: 0,
      rotation: s.rotation + 1,
      duration: 1500,
      onComplete: () => s.destroy(),
    });
  }
}
