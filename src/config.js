// Constantes partagées par les scènes.

export const W = 960;
export const H = 540;
export const S = 2; // 1 pixel de texture = 2 pixels écran

export const FONT = '"DotGothic16", monospace';
export const FONT_TITLE = '"Handjet", "DotGothic16", monospace';

// Palette de l'interface : sobre, anthracite / bleu nuit, accents laiton.
export const COLORS = {
  ink: '#0e1016',
  panel: '#151a24',
  panelLight: '#1f2633',
  line: '#3a4456',
  brass: '#c9a45c',
  brassLight: '#e6c98a',
  text: '#e8e2d4',
  textDim: '#9aa0ac',
  // anciens noms, gardés pour les scènes
  paper: '#e8e2d4',
  paperDark: '#9aa0ac',
  frame: '#3a4456',
  frameLight: '#c9a45c',
  accent: '#c9a45c',
  accentLight: '#e6c98a',
  hudBg: '#151a24',
  good: '#7fbf7a',
  bad: '#d9675a',
  chaos: '#a98ad8',
  delay: '#d8b25a',
  white: '#e8e2d4',
};

// Mise en page de la scène de trajet (pixels écran). La voie est verticale, le train monte l'écran.
export const LAYOUT = {
  hudH: 56,
  trackX: 480, // axe de la voie
  trackHalf: 44, // demi-largeur réservée à la voie (aucun décor dedans)
  trainTopY: 92, // haut de la locomotive
  stationStopY: 392, // y de la gare (centre du quai) quand le train est arrêté
  leftBand: [16, 400], // zone de décor à gauche de la voie
  rightBand: [560, 944], // zone de décor à droite de la voie
};

export const SPEED = {
  cruise: 200, // px/s
  accel: 105, // px/s²
  legSeconds: 7, // durée de trajet entre deux arrêts (hors incident)
};

// Ambiance de chaque lieu : sol, éclairage (multiplicatif), nuit (lumières allumées), décors qui défilent.
// decor : [clé, poids]. small : petits éléments au sol, très fréquents.
export const BIOMES = {
  city: {
    ambient: 0xfff4e6,
    night: false,
    // Le champ de Saint-Banal (l'identifiant `city` est resté).
    // Peu de choses, bien espacées : `spacing` est la distance moyenne (px) entre deux décors d'un même côté,
    // `smallSpacing` celle entre deux petits éléments au sol.
    decor: [['wheat_tall', 5], ['haybale', 3], ['tree_round', 2], ['fence', 1], ['scarecrow', 1], ['house_b', 1], ['mill', 1]],
    small: ['wheat_tuft', 'poppies', 'tuft'],
    spacing: 300,
    smallSpacing: 110,
    station: 'city',
    particles: null,
  },
  forest: {
    ambient: 0xfff8ea,
    night: false,
    decor: [['house_forest', 2], ['canopy', 6], ['canopy_duo', 3], ['canopy_s', 3], ['canopy_dark', 2], ['shrub', 2], ['boulder', 1], ['pond', 1], ['slabs', 1], ['cliff', 1]],
    small: ['tuft', 'flowers_bright', 'mushrooms', 'stone', 'tuft'],
    dense: true,
    station: 'forest',
    particles: 'leaves',
  },
  swamp: {
    ambient: 0xc8d8c0,
    night: false,
    decor: [['house_swamp', 2], ['deadtree', 3], ['reeds', 5], ['mossrock', 2], ['willow', 2], ['bush', 1]],
    small: ['reed_tuft', 'lily'],
    station: 'swamp',
    particles: 'mist',
  },
  night: {
    ambient: 0x4c5690,
    night: true,
    decor: [['house_night', 3], ['grave', 4], ['grave_cross', 2], ['deadtree', 3], ['lantern', 2], ['pine', 3]],
    small: ['tuft', 'stone'],
    station: 'night',
    particles: 'fireflies',
  },
  sky: {
    ambient: 0xf4f0ff,
    night: false,
    decor: [['house_sky', 2], ['cloud', 6], ['balloon', 1], ['islet', 1], ['birds', 2]],
    small: [],
    station: 'sky',
    particles: null,
  },
  cave: {
    ambient: 0x8a88c8,
    night: true,
    decor: [['house_cave', 2], ['stalag', 4], ['stalag_s', 3], ['crystals', 3], ['amethyst', 2], ['glowshroom', 3], ['cave_rock', 3], ['cave_lake', 1]],
    small: ['stone', 'glowshroom', 'stone'],
    dense: true,
    station: 'cave',
    particles: 'spores',
  },
  sylve: {
    ambient: 0xf4eeff,
    night: false,
    decor: [['house_sylve', 2], ['canopy_gold', 4], ['canopy_lilac', 3], ['canopy_elven', 3], ['canopy_s', 2], ['elf_arch', 1], ['moonwell', 1], ['lantern_flower', 3]],
    small: ['flowers_bright', 'tuft', 'lantern_flower'],
    dense: true,
    station: 'sylve',
    particles: 'fireflies',
  },
  stade: {
    ambient: 0xfff4e6,
    night: false,
    // Le terrain et les tribunes sont dans le sol : on ne pose presque rien dessus.
    decor: [['bench', 2], ['dummies', 2], ['goal', 1], ['ball_net', 2], ['team_flag', 2], ['house_stade', 1]],
    small: ['ball', 'cone', 'divot', 'bottle'],
    spacing: 460,
    smallSpacing: 150,
    station: 'stade',
    particles: 'confetti',
  },
  void: {
    ambient: 0xe0dcf8,
    night: true,
    // Le temps arrêté : le cadran géant est dans le sol, le reste flotte autour.
    decor: [['house_void', 1], ['hourglass', 3], ['gear_big', 3], ['gear_small', 3], ['grandfather', 2], ['clock', 2], ['sundial', 2]],
    small: ['cog', 'sand_mound', 'fallen_hand'],
    spacing: 300,
    smallSpacing: 120,
    station: 'void',
    particles: 'motes',
  },
};
