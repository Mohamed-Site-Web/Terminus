// Les arrêts. Le trajet part du premier et suit `next` jusqu'au terminus (le seul arrêt sans `next`).
// next    : id de l'arrêt suivant, ou liste [{ if, stop }, ..., 'défaut'] : les aiguillages
//           (JUNCTIONS dans incidents.js) posent les drapeaux qui font bifurquer la ligne.
// clue    : rumeur sur le terminus, affichée à l'arrivée. Elles se contredisent exprès.
// passengers : qui attend sur le quai. Deux sortes d'entrées :
//   - { char, weight } : personnage TIRÉ AU SORT. `weight` est sa part de chance dans cette gare. Si les poids
//     d'une gare font 100, chaque poids se lit comme un pourcentage (30 = 30 %).
//   - 'id' ou { char, node, if } sans `weight` : personnage TOUJOURS là (si sa condition `if` est vraie).
//     Sert aux personnages liés au lieu et aux retours : { char: 'momo', node: 'retour', if: 'momo_refused' }.
//     Le `if` peut demander un objet : { char: 'chevre', if: 'has:carnet' }.
//   - `aboard: true` sur une entrée sans `weight` : un passager DÉJÀ À BORD descend sur le quai pour parler
//     au conducteur (les demandes de Momo et de Benjamin). Sa réplique doit finir par `end: 'board'`.
// pick    : nombre de personnages tirés au sort dans cette gare. Le quai garde 3 passagers au maximum, dans
//           l'ordre du fichier : les entrées du haut passent avant les tirés au sort.
//
// Règle du tirage (src/systems/story.js, stopPassengers) :
//   1. Un personnage déjà croisé dans une gare précédente, ou déjà à bord, sort du tirage.
//   2. Ceux qui restent se partagent les 100 % en gardant leurs proportions.
//      Exemple : Scrat 30, Jacky 20, Kimberley 50. Si Kimberley a déjà été croisée, il reste Scrat 30 et
//      Jacky 20, donc Scrat 30/50 = 60 % et Jacky 20/50 = 40 %.
//   3. Le deuxième tiré est choisi de la même façon parmi ceux qui restent après le premier.
// Pour changer une probabilité : changer le nombre `weight`. Pour enlever un personnage d'une gare :
// supprimer sa ligne (ou mettre weight: 0). Pour l'ajouter ailleurs : copier sa ligne dans une autre gare.
// `npm run check:story` affiche ensuite la fréquence réelle de chaque personnage dans chaque gare.
// biome   : city | forest | swamp | night | sky | cave | sylve | stade | void (voir src/config.js)

export const STOPS = [
  {
    id: 'saint_banal',
    name: 'Gare de Saint-Banal',
    subtitle: 'Un quai, un champ, et rien à des kilomètres.',
    clue: "On raconte qu'au terminus, quelqu'un vous attend depuis toujours.",
    biome: 'city',
    pick: 1,
    passengers: [
      'momo',
      'benjamin',
      { char: 'blonde', weight: 35 },
      { char: 'toxico', weight: 25 },
      { char: 'veteran', weight: 25 },
      { char: 'melenchon', weight: 15 },
    ],
    next: 'bois_joli',
  },
  {
    id: 'bois_joli',
    name: 'Halte du Bois-Joli',
    subtitle: 'Un panneau cloué sur un arbre. Pas de quai.',
    clue: "Un écureuil jure qu'il n'y a pas de terminus. Juste un mur.",
    biome: 'forest',
    pick: 2,
    passengers: [
      { char: 'momo', node: 'stylo', if: 'momo_aboard', aboard: true },
      { char: 'scrat', weight: 30 },
      { char: 'controleur', weight: 25 },
      { char: 'toxico', weight: 20 },
      { char: 'veteran', weight: 15 },
      { char: 'chevre', weight: 10 },
      { char: 'blonde', weight: 20 },
      { char: 'melenchon', weight: 15 },
    ],
    next: [{ if: 'voie_sylve', stop: 'sylve' }, 'flaque'],
  },
  {
    id: 'flaque',
    name: 'Flaque-sur-Mer',
    subtitle: "Il n'y a pas de mer. Il y a une flaque.",
    clue: 'La flaque affirme que le terminus est sous l\'eau. Prévoir un maillot.',
    biome: 'swamp',
    pick: 1,
    passengers: [
      { char: 'momo', node: 'retour', if: 'momo_refused' },
      { char: 'benjamin', node: 'nouvelles', if: 'benjamin_aboard', aboard: true },
      'shrek',
      { char: 'zemmour', weight: 40 },
      { char: 'blonde', weight: 25 },
      { char: 'controleur', weight: 20 },
      { char: 'poilu', weight: 20 },
      { char: 'toxico', weight: 15 },
    ],
    next: [{ if: 'voie_grotte', stop: 'grotte' }, 'minuit'],
  },
  {
    id: 'sylve',
    name: 'Clairière de la Sylve',
    subtitle: 'Les rails sont des racines. Ils poussent devant le train.',
    clue: 'Les arbres disent que le terminus est un trou dans le monde.',
    biome: 'sylve',
    pick: 1,
    passengers: [
      { char: 'momo', node: 'retour', if: 'momo_refused' },
      { char: 'benjamin', node: 'nouvelles', if: 'benjamin_aboard', aboard: true },
      'poilu',
      { char: 'scrat', weight: 35 },
      { char: 'chevre', weight: 30 },
      { char: 'zemmour', weight: 20 },
      { char: 'blonde', weight: 20 },
      { char: 'toxico', weight: 15 },
    ],
    next: [{ if: 'voie_grotte', stop: 'grotte' }, 'minuit'],
  },
  {
    id: 'grotte',
    name: 'Grotte du Composté',
    subtitle: "Il fait noir. Quelque chose respire. Ce n'est pas le train.",
    clue: 'Gravé dans la roche : « LE TERMINUS, C\'EST NOUS ».',
    biome: 'cave',
    passengers: ['thanos'],
    next: 'minuit',
  },
  {
    id: 'minuit',
    name: 'Gare de Minuit',
    subtitle: "Il est toujours minuit ici. L'horloge a abandonné.",
    clue: "L'horloge murmure qu'au terminus, il est midi pile. Pour toujours.",
    biome: 'night',
    pick: 2,
    passengers: [
      { char: 'benjamin', node: 'retour', if: 'benjamin_refused' },
      { char: 'benjamin', node: 'rumeur', if: 'benjamin_aboard', aboard: true },
      'gabin',
      { char: 'melenchon', weight: 30 },
      { char: 'veteran', weight: 20 },
      { char: 'poilu', weight: 35 },
      { char: 'chevre', weight: 15 },
      { char: 'zemmour', weight: 25 },
    ],
    next: [{ if: 'voie_stade', stop: 'stade' }, 'nuage'],
  },
  {
    id: 'stade',
    name: 'Stade de Nulle-Part',
    subtitle: 'Le quai est sur la ligne de touche. Le train est hors-jeu.',
    clue: 'Le speaker annonce : terminus complet, à guichets fermés.',
    biome: 'stade',
    passengers: [{ char: 'lamine', node: 'finale', if: 'lamine_aboard', aboard: true }, 'hoggy', 'messi'],
    next: 'terminus',
  },
  {
    id: 'nuage',
    name: 'Station Nuage 9',
    subtitle: 'Les rails montent. Personne ne sait pourquoi.',
    clue: 'Un pigeon affirme que le terminus est en dessous. Très en dessous.',
    biome: 'sky',
    pick: 2,
    passengers: [
      'pigeon',
      { char: 'melenchon', weight: 30 },
      { char: 'messi', weight: 25 },
      { char: 'veteran', weight: 15 },
      { char: 'chevre', weight: 15 },
      { char: 'zemmour', weight: 15 },
    ],
    next: 'terminus',
  },
  {
    id: 'terminus',
    name: 'Terminus ?',
    subtitle: "Le point d'interrogation fait partie du nom.",
    biome: 'void',
    passengers: [
      { char: 'momo', node: 'paie', if: 'momo_aboard', aboard: true },
      { char: 'benjamin', node: 'album', if: 'benjamin_aboard', aboard: true },
      'vieux',
    ],
  },
];
