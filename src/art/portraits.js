// Textures de tous les personnages :
//  - portrait_<id> (56×78) : personnage en pied des dialogues (hero.js) ;
//  - char_<id>    (28×39) : le même, réduit de moitié, sur les quais ;
//  - bust_<id>    (128×106) : gros plan des dialogues (bust.js), et bust_<id>_dust sa version évaporée ;
//  - head_<id>    (12×12) : tête vue du dessus, dans les verrières du train, d'après son `look`.
// Les couleurs des looks sont un peu désaturées pour les têtes, afin de garder une palette sobre.

import { Pix, ramp, mute } from './draw.js';
import { CHARACTERS } from '../data/characters.js';
import { heroOf, heroAnon, heroSmall } from './hero.js';
import { bustOf, dusted } from './bust.js';

const ANON = { skin: '#c99a72', hair: 'short', hairColor: '#3a2e26', outfit: '#5f6e82' };
const ANON_VARIANTS = [
  ANON,
  { skin: '#eac0a0', hair: 'long', hairColor: '#6a4a30', outfit: '#7a5a5a' },
  { skin: '#8a5a3c', hair: 'curly', hairColor: '#1e1612', outfit: '#5a6a4a' },
  { skin: '#e8c4a8', hair: 'bun', hairColor: '#b8a080', outfit: '#4a4a5e' },
];

export function generatePortraits(scene) {
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const L = soften(c.look);
    const hero = heroOf(id, c.look);
    hero.big.toTexture(scene, `portrait_${id}`);
    const bust = bustOf(id, c.look);
    bust.toTexture(scene, `bust_${id}`);
    if (c.dust) dusted(bust).toTexture(scene, `bust_${id}_dust`); // version « partie en fumée »
    heroSmall(hero).toTexture(scene, `char_${id}`);
    topHead(L).toTexture(scene, `head_${id}`);
  }
  ANON_VARIANTS.forEach((v, i) => {
    const L = soften(v);
    topHead(L).toTexture(scene, i ? `head_anon${i}` : 'head_anon');
    heroSmall(heroAnon(v, i)).toTexture(scene, i ? `char_anon${i}` : 'char_anon');
  });
}

function soften(look) {
  const L = { ...look };
  for (const k of ['outfit', 'hatColor', 'hairColor']) if (L[k]) L[k] = mute(L[k], 0.3);
  return L;
}

// ═════════════════════════ Têtes vues du dessus (12×12) ═════════════════════════

function topHead(L) {
  const p = new Pix(12, 12);
  const outfit = ramp(L.outfit ?? '#5f6e82', 4, 0.07);
  const hair = ramp(L.hairColor ?? '#3a2e26', 5, 0.06);
  p.blob(6, 9, 5.5, 3, outfit, { flat: 0.3 }); // épaules
  switch (L.special) {
    case 'bear': {
      const fur = ramp('#6a4a32', 5, 0.06);
      p.blob(2.5, 2.5, 1.6, 1.6, fur);
      p.blob(9.5, 2.5, 1.6, 1.6, fur);
      p.blob(6, 5.5, 4.4, 4.4, fur);
      break;
    }
    case 'goat':
      p.blob(6, 5.5, 3.4, 4, ramp('#d8d0c0', 5, 0.05));
      p.line(4, 3, 2, 0, '#8a8070');
      p.line(8, 3, 10, 0, '#8a8070');
      break;
    case 'fish':
      p.blob(6, 5, 3.6, 4.6, ramp('#5a7488', 5, 0.06));
      p.set(6, 0, '#7a5a7a');
      break;
    case 'ghost':
      p.d.fill(0);
      p.blob(6, 6, 5, 5, ramp('#c8d2e4', 5, 0.05));
      break;
    case 'pigeon':
      p.blob(6, 6, 4.5, 4.5, ramp('#7a8090', 5, 0.06));
      p.rect(5, 1, 2, 2, '#4a4446');
      break;
    case 'astronaut':
      p.blob(6, 5.5, 4.8, 4.8, ramp('#d6d8dc', 5, 0.05));
      p.hline(4, 2, 4, '#9a7a3a');
      break;
    default:
      if (L.hat) p.blob(6, 5, 4.2, 4.2, ramp(L.hatColor, 5, 0.07));
      else if (L.hair === 'long') p.blob(6, 6, 4.2, 5, hair);
      else p.blob(6, 5, 3.8, 3.8, hair);
      if (L.hat === 'conductor') p.set(6, 1, '#c9a45c');
      if (L.hair === 'bun' && !L.hat) p.blob(6, 4, 1.8, 1.8, ramp(hair[3], 3, 0.08));
  }
  p.outline(0.6);
  return p;
}
