// Les objets de l'inventaire et les rondes à bord.
//
// Sur un choix : give: ['id'] (le conducteur reçoit), take: ['id'] (il remet, avec if: 'has:id').
// Sur une réplique sans choix : give seulement. Conditions : "has:id" ou "!has:id", partout où un `if` existe.
// Le dessin de chaque objet est dans src/art/items.js, sous le même id.
//
// use : l'objet se clique dans l'inventaire pendant que le train roule (voir useItem dans systems/story.js).
//   hint : ce qu'en dit l'infobulle ; message : ce qui s'affiche au clic ; fx : effet sur les jauges ;
//   idle : ce qui s'affiche si l'objet n'aurait aucun effet (il n'est alors pas consommé) ;
//   consume : l'objet disparaît ; flag : drapeau posé, levé par dodgeIncident, jamais lu dans un `if` de données.
//
// Qui veut quoi (les chaînes d'échanges) :
//   gland → Scrat → pierre → Thanos → gant
//   stylo → Contrôleur → carnet → Maître Biquette → dossier (à sortir au contrôle surprise)
//   chargeur → Kimberley → décolorant → Lamine Yamal → ballon → Hoggy Rider → bracelet doré
//   thermos → Messi → Ballon d'or
//   squatteurs de Shrek → oignon → Zemmour → boussole → Zoro → sabre
//   histoire du sergent → clairon → Mélenchon → hologramme
//   Bruno → miel → Roi Pigeon → médaille
//   pièce → Jacky → tondeuse → Bruno monte tondu : pas de panique à l'ours dans le wagon 2
//   Jacky recalé par Kimberley → revient riche → liasse → Contrôleur (contrôle surprise, plus de 8 à bord)
//   L'oignon ou le clairon arrêtent aussi la guerre Mélenchon/Zemmour ; le décolorant, celle des odeurs.
//   Momo réclame : stylo, clairon, chargeur. Benjamin réclame : thermos, pièce, boussole.
//   Plusieurs personnages veulent le même objet : on ne peut pas contenter tout le monde.

export const INVENTORY_SLOTS = 12;

export const ITEM_NOT_NOW = 'Cet objet ne sert que quand le train roule.';

export const ITEMS = {
  // Trouvés pendant les rondes
  stylo: { name: 'Stylo quatre couleurs', desc: 'Trois couleurs sur quatre marchent encore. De quoi signer un badge. Ou un procès-verbal.' },
  thermos: { name: 'Thermos de café', desc: 'Encore brûlant. Personne ne sait depuis quand, et il vaut mieux ne pas chercher.' },
  gland: { name: 'Gland', desc: 'Un gland parfait, coincé sous un siège. Quelque part, un écureuil hurle.' },
  chargeur: { name: 'Chargeur de téléphone', desc: "Câble mâchouillé, mais il charge. Pour certains, c'est une question de vie ou de mort." },
  piece: { name: 'Pièce de deux euros', desc: "Rendue par le distributeur. C'est bien la seule chose qu'il ait jamais rendue." },

  // Donnés par les passagers
  pierre: { name: 'Pierre qui brille', desc: 'Déterrée par Scrat à la place de son gland. Elle bourdonne. Un grand violet la cherche partout.' },
  carnet: { name: 'Carnet de contraventions', desc: 'Le carnet à souche du Contrôleur. Une bonne avocate y trouve trois vices de procédure par page.' },
  dossier: { name: 'Dossier de défense', desc: "Monté par Maître Biquette. Il manque un coin : elle dit que c'était la partie faible." },
  decolorant: { name: 'Décolorant platine', desc: 'Le flacon de secours de Kimberley. Blond polaire garanti. Un jeune ailier en rêve la nuit.' },
  ballon: { name: 'Ballon du match', desc: 'Offert par Lamine. Au stade, un supporter torse nu en cherche un. Il validera.' },
  oignon: { name: 'Oignon du marais', desc: 'Les ogres paient en oignons. Il a des couches. Un nostalgique y verrait un produit du terroir.' },
  boussole: { name: 'Boussole de Zemmour', desc: "Elle indique la droite, pas le nord. Toujours. C'est déjà mieux que rien, quand on est perdu." },
  clairon: { name: 'Clairon du sergent', desc: 'A sonné une retraite, une fois. De quoi se faire entendre du dernier wagon.' },
  tondeuse: { name: 'Tondeuse', desc: "Tombée d'un camion. Le camion va bien. Elle viendrait à bout d'un ours." },
  miel: { name: 'Pot de miel', desc: 'Bruno en a toujours sur lui. Il dit que ça ne veut rien dire. Un roi se lasse des miettes.' },
  medaille: { name: 'Médaille du sergent', desc: 'Volée par des pigeons en 1962. Épinglée sur ta veste, elle impose le respect.', use: { hint: 'Clic en roulant : tu épingles la médaille, le train se tient droit. Un seul usage.', fx: { chaos: -15 }, consume: true, message: 'Médaille épinglée : tout le monde se tient droit. Le chaos retombe.', idle: 'Le train est calme. Garde la médaille pour plus tard.' } },

  // Pouvoirs : à cliquer pendant que le train roule
  gant: {
    name: 'Gant de Thanos',
    desc: "L'ancien modèle, à cinq trous. Il sent le titan.",
    use: {
      hint: 'Clic en roulant : un claquement de doigts, la moitié du chaos disparaît. Un seul usage.',
      fx: { chaos: -25 },
      consume: true,
      message: 'Clac. La moitié des ennuis part en poussière.',
      idle: "Il n'y a aucun chaos à faire disparaître.",
    },
  },
  liasse: { name: 'Liasse de Jacky', desc: 'Des billets tout neufs. De quoi faire recompter un Contrôleur trop zélé.' },
  bracelet: {
    name: 'Bracelet doré de Hoggy Rider',
    desc: 'Tu lèves le pouce, et tout est validé. Même le retard.',
    use: {
      hint: 'Clic en roulant : pouce levé, 15 minutes de retard validées. Un seul usage.',
      fx: { delay: -15 },
      consume: true,
      message: 'Pouce levé : retard validé. 15 minutes rattrapées !',
      idle: "Le train est à l'heure. Rien à valider.",
    },
  },
  ballon_or: {
    name: "Ballon d'or",
    desc: 'Messi en avait huit. Il ne lui en reste que sept.',
    use: {
      hint: 'Clic en roulant : tu le fais passer dans les wagons, les passagers sont ravis. Un seul usage.',
      fx: { sat: 20 },
      consume: true,
      message: "Le Ballon d'or fait le tour des wagons. Tout le monde veut sa photo.",
      idle: 'Les passagers ne peuvent pas être plus ravis.',
    },
  },
  sabre: {
    name: 'Sabre de Zoro',
    desc: 'Il en avait trois. Celui-ci coupe tout, même les virages.',
    use: {
      hint: 'Clic en roulant : tu tranches le prochain virage, 20 minutes rattrapées. Un seul usage.',
      fx: { delay: -20 },
      consume: true,
      message: 'Un coup de sabre : le train coupe tout droit. 20 minutes rattrapées !',
      idle: "Le train est à l'heure. Rengaine.",
    },
  },
  hologramme: {
    name: 'Projecteur à hologramme',
    desc: "Celui de Mélenchon. Il n'en a plus besoin : il est déjà partout.",
    use: {
      hint: "Clic en roulant : le train devient un hologramme, le prochain incident n'a pas lieu.",
      flag: 'train_invisible',
      message: "Le train n'est plus qu'un hologramme. Le vrai est ailleurs. Peut-être.",
      idle: 'Le train est déjà un hologramme.',
      dodged: "On ne peut rien faire à un hologramme : incident évité.",
    },
  },
};

// Une ronde par trajet après l'arrêt `after`, comme les incidents : trois endroits, un seul objet.
export const FINDS = [
  { id: 'ronde_1', after: 'saint_banal', char: 'ronde', node: 'premiere', title: 'La ronde de Clara' },
  { id: 'ronde_2', after: 'bois_joli', char: 'ronde', node: 'deuxieme', title: 'La ronde de Clara' },
  { id: 'ronde_flaque', after: 'flaque', char: 'ronde', node: 'troisieme', title: 'La ronde de Clara' },
  { id: 'ronde_sylve', after: 'sylve', char: 'ronde', node: 'troisieme', title: 'La ronde de Clara' },
  { id: 'ronde_grotte', after: 'grotte', char: 'ronde', node: 'troisieme', title: 'La ronde de Clara' },
  { id: 'ronde_minuit', after: 'minuit', char: 'ronde', node: 'derniere', title: 'La ronde de Clara' },
];
