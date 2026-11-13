# Terminus

Jeu narratif en pixel art (Phaser 3 + Vite) de Mohamed Bouaziz & Benjamin Granier.
Tu es le conducteur. À chaque arrêt, 1 à 3 passagers te parlent ; tes réponses changent la suite, les stats et la fin.

## Lancer

```bash
npm install
npm run dev          # http://localhost:5173
npm run check:story  # vérifie l'histoire et simule des milliers de parties
npm run build        # version jouable dans dist/
```

Contrôles : souris, ou `1` `2` `3` pour répondre, `Espace`/`Entrée` pour passer le texte ou continuer, `M` pour couper le son.

## Où modifier quoi

| Fichier | Contenu |
|---|---|
| `src/data/characters.js` | Personnages, apparence, dialogues et choix |
| `src/data/stops.js` | Arrêts, décor (biome), qui attend sur le quai |
| `src/data/incidents.js` | Incidents à bord entre deux arrêts |
| `src/data/endings.js` | Les 22 fins (une seule vraie fin) |
| `src/config.js` | Couleurs, vitesse du train, décors par biome |
| `src/art/` | Pixel art généré par code (décors, train, portraits) |
| `SPEC.md` | Règles du jeu et format complet des dialogues |

## Ajouter un passager (résumé)

```js
// src/data/characters.js
mamie: {
  name: 'Mamie Jo',
  role: 'Retraitée en roller',
  look: { skin: SKIN.pale, hair: 'bun', hairColor: '#d8d8e0', outfit: '#8a5ad8', extra: 'glasses' },
  voice: 320,
  dest: 'minuit',           // arrêt où elle descend
  start: 'intro',
  nodes: {
    intro: {
      text: "Bonjour mon petit ! Tu acceptes les rollers ?",
      choices: [
        { text: 'Bien sûr, montez.', fx: { sat: 5, chaos: 5 }, set: ['mamie_roller'], end: 'board' },
        { text: 'Pas de roues dans le train.', fx: { sat: -5 }, end: 'leave' },
        { text: 'Seulement si vous me faites une démo.', next: 'demo' },
      ],
    },
    demo: { text: '*fait un salto arrière sur le quai* Ça te va ?', end: 'board' },
  },
},
```

Puis ajoute `'mamie'` dans la liste `passengers` d'un arrêt de `src/data/stops.js`, et lance `npm run check:story`.
Les conditions (`if`), les effets (`fx`, `set`, `unset`, `add`) et les issues (`next`, `end`, `ending`) sont détaillés dans `SPEC.md`.
