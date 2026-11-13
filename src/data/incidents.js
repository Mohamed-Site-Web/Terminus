// Incidents à bord, entre deux arrêts : les conséquences des passagers qu'on a laissés monter.
// `after` = id de l'arrêt qu'on vient de quitter, ou liste d'arrêts quand le passager peut monter dans
// plusieurs gares (tirage au sort de stops.js) : l'incident a lieu une seule fois, au premier de ces trajets
// où sa condition est vraie. Un seul incident par trajet : le premier de la liste dont la condition est vraie
// (l'ordre sert donc de priorité). Le dialogue vient du personnage (`char`, `node`).

const AVANT_MINUIT = ['saint_banal', 'bois_joli', 'flaque', 'sylve', 'grotte'];
const APRES_MINUIT = ['minuit', 'stade', 'nuage'];
const PARTOUT = [...AVANT_MINUIT, ...APRES_MINUIT];

export const INCIDENTS = [
  // Les intrigues entre passagers.
  // Jacky aime Kimberley. Recalé, il descend et revient riche : généreux si on a été bon avec lui, rancunier sinon.
  { id: 'retour_vire', after: APRES_MINUIT, char: 'riche', node: 'vire', if: 'jacky_recale & jacky_humilie', title: 'Un hélicoptère sur le toit' },
  { id: 'retour_riche', after: APRES_MINUIT, char: 'riche', node: 'retour', if: 'jacky_recale & !jacky_humilie', title: 'Un hélicoptère sur le toit' },
  { id: 'declaration', after: AVANT_MINUIT, char: 'toxico', node: 'declaration', if: 'toxico_aboard & blonde_aboard', title: 'Un cœur bat au wagon 2' },
  // Mélenchon et Zemmour à bord en même temps : la guerre. Elle finit par une soupe, un clairon ou un ennemi commun.
  { id: 'guerre', after: PARTOUT, char: 'melenchon', node: 'guerre', if: 'melenchon_aboard & zemmour_aboard', title: 'Guerre au wagon 2' },
  { id: 'guerre_2', after: PARTOUT, char: 'zemmour', node: 'guerre', if: 'guerre_froide & melenchon_aboard & zemmour_aboard', title: 'La guerre reprend' },
  // Bruno sent le fauve, Shrek sent le marais : chacun veut sentir le plus fort.
  { id: 'odeurs', after: PARTOUT, char: 'shrek', node: 'odeurs', if: 'poilu_aboard & shrek_aboard', title: 'Alerte olfactive au wagon 2' },

  // Momo fait la manche : il lui faut un clairon.
  { id: 'annonce', after: 'minuit', char: 'momo', node: 'annonce', if: 'momo_aboard', title: 'La manche au wagon 2' },

  // Les échanges qui se dénouent à bord : le passager a vu l'objet qu'il cherche dans ta poche.
  { id: 'perdu', after: PARTOUT, char: 'zoro', node: 'perdu', if: 'zoro_aboard & has:boussole', title: 'Un sabreur dans la cabine' },
  { id: 'dossier', after: PARTOUT, char: 'chevre', node: 'dossier', if: 'chevre_aboard & has:carnet', title: 'Consultation au wagon 1' },
  { id: 'terroir', after: PARTOUT, char: 'zemmour', node: 'terroir', if: 'zemmour_aboard & has:oignon', title: 'Ça sent le terroir' },
  // Kimberley descend à la Gare de Minuit : son incident n'a lieu qu'avant.
  { id: 'live', after: AVANT_MINUIT, char: 'blonde', node: 'live', if: 'blonde_aboard & has:chargeur', title: 'Urgence au wagon 1' },

  // Les ennuis.
  { id: 'fissure', after: PARTOUT, char: 'scrat', node: 'fissure', if: 'scrat_aboard & !scrat_repu', title: 'Ça craque au wagon 2' },
  { id: 'ours', after: PARTOUT, char: 'poilu', node: 'ours', if: 'poilu_aboard & poilu_douce', title: 'Panique au wagon 2' },
  { id: 'vente', after: PARTOUT, char: 'toxico', node: 'vente', if: 'toxico_aboard & has:piece', title: 'Commerce au wagon 2' },
  { id: 'assemblee', after: PARTOUT, char: 'melenchon', node: 'assemblee', if: 'melenchon_aboard & !paix', title: 'Assemblée au wagon 2' },
  { id: 'nostalgie', after: PARTOUT, char: 'zemmour', node: 'nostalgie', if: 'zemmour_aboard & !paix', title: 'Nostalgie dans la locomotive' },
  { id: 'souvenirs', after: PARTOUT, char: 'veteran', node: 'souvenirs', if: 'veteran_aboard', title: 'Garde-à-vous au wagon 1' },
  { id: 'billets', after: PARTOUT, char: 'chevre', node: 'billets', if: 'chevre_aboard', title: 'Incident au wagon 1' },
  { id: 'cabine', after: PARTOUT, char: 'gabin', node: 'cabine', if: 'gabin_aboard', title: 'Incident en cabine' },
];

// Aiguillages : une rencontre sur la voie, après l'incident éventuel. Les choix posent des drapeaux
// (voie_sylve, voie_grotte, voie_stade) qui changent l'arrêt suivant (`next` dans stops.js).
// Le dernier n'aiguille rien : c'est le contrôle surprise, juste avant le Terminus.
export const JUNCTIONS = [
  { id: 'sentier', after: 'bois_joli', char: 'zoro', node: 'voie', title: "Quelqu'un sur la voie" },
  { id: 'tunnel_flaque', after: 'flaque', char: 'thanos', node: 'tunnel', title: 'Une voix dans le tunnel' },
  { id: 'tunnel_sylve', after: 'sylve', char: 'thanos', node: 'tunnel', title: 'Une voix dans le tunnel' },
  { id: 'ailier', after: 'minuit', char: 'lamine', node: 'course', title: "Quelqu'un court à côté du train" },
  { id: 'controle', after: ['stade', 'nuage'], char: 'controleur', node: 'controle', title: 'Contrôle surprise' },
];
