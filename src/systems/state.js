// État d'une partie. Volontairement sans Phaser pour pouvoir le simuler en Node (tools/check-story.js).

import { STOPS } from '../data/stops.js';

export const START_STATS = { sat: 50, chaos: 0, delay: 0 };
export const CAPACITY = 8;

export function createState() {
  return {
    ...START_STATS,
    flags: new Set(),
    items: [], // ids des objets dans l'inventaire du conducteur (src/data/items.js)
    aboard: [], // ids des personnages à bord
    met: [], // ids des personnages déjà croisés sur un quai : ils ne sont plus tirés au sort
    extra: 0, // passagers anonymes (squatteurs du marais de Shrek…)
    stop: STOPS[0].id, // arrêt actuel (ou celui qu'on vient de quitter, tant que le train n'est pas arrivé)
    route: [STOPS[0].id], // arrêts traversés, dans l'ordre
    stopIndex: 0, // nombre d'arrêts déjà quittés
    decisions: 0,
    history: [], // { char, choice } pour l'écran de fin
  };
}

export function passengerCount(state) {
  return state.aboard.length + state.extra;
}

export function clampStats(state) {
  state.sat = Math.max(0, Math.min(100, state.sat));
  state.chaos = Math.max(0, Math.min(100, state.chaos));
  state.delay = Math.max(0, state.delay);
}
