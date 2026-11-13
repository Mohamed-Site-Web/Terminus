# Spec — Terminus (V7)

Document vivant : on le met à jour à chaque fois qu'une décision change.

## Objectif

Jeu narratif en pixel art. Le joueur est le **conducteur** d'un train qui avance tout seul et s'arrête à des
endroits de plus en plus absurdes (gare, coin de forêt, marais, gare fantôme, nuages…). À chaque arrêt,
1 à 3 passagers montent et parlent au conducteur **l'un après l'autre**. Chaque réplique propose
**3 choix** de réponse. Les choix modifient les statistiques et posent des « drapeaux » qui changent la suite
(passagers qui reviennent, incidents à bord, fins différentes). But : aller le plus loin possible dans une
aventure qui devient de plus en plus WTF.

Depuis la V4, la ligne **bifurque** : certains choix (des « aiguillages ») changent l'arrêt suivant, ce qui ouvre
des quêtes secondaires (Clairière de la Sylve, Grotte du Composté, Stade de Nulle-Part). Le suspense porte sur le
terminus : un compte à rebours « IL RESTE N ARRÊTS AVANT ??? » et une rumeur contradictoire à chaque gare.

Depuis la V5, l'**inventaire** porte la progression : les passagers donnent des objets, le conducteur en trouve
pendant ses rondes à bord, et ces objets ouvrent des choix (un passager ne monte que si on lui donne le bon objet)
et des fins. La première carte est un **champ**, et l'interface change de matière à chaque biome.

Depuis la V6, la distribution est entièrement refaite : des **personnages caricaturés** (voir « Les personnages »).
Chacun **veut** quelque chose et **donne** quelque chose : les objets passent de main en main et forment des chaînes
d'échanges. **Momo** et **Benjamin** sont les deux personnages principaux : une fois à bord, ils redescendent sur le
quai de plusieurs gares. **Momo** est tout petit (cheveux noirs ondulés, lunettes, bouc léger, survêtement et
sacoche) et ne veut que de l'argent. **Benjamin** (fin, cheveux bruns au-dessus des épaules, moustache courte,
maillot bleu) veut rencontrer Hoggy Rider, Lamine Yamal et Mélenchon.

Depuis la V7, il n'y a plus qu'**une seule vraie fin** : au Terminus, « Toi (dans 40 ans) » vient dire que le
terminus n'existe pas. **Tout mauvais choix arrête la partie sur-le-champ**, avec l'image de sa fin : le train peut
s'arrêter à tout moment. Trois personnages changent (**Zemmour**, **Clara** la poule en baskets, **Hoggy Rider**),
Jacky peut revenir riche, et les passagers ont des **intrigues entre eux** (voir « Intrigues entre passagers »).
Le menu et chaque fin ont une illustration dessinée par le code (`src/art/tableaux.js`).

## Hypothèses retenues (à corriger si besoin)

1. Jeu web (navigateur), Phaser 3.90 + Vite. Pas d'images externes pour la V1 : tout le pixel art est
   **généré par le code** (remplaçable plus tard par vos vrais sprites).
2. Vue **de dessus, depuis l'arrière** : le train monte l'écran sur une voie verticale, le décor défile vers le bas.
   Style « pixel art HD » sobre (palettes désaturées, éclairage ambiant par biome, nuit avec halos), interface aux couleurs du biome traversé (`src/ui/themes.js`).
3. Langue : français. Polices « DotGothic16 » (interface) et « Handjet » (titres) via Google Fonts ;
   « Dogica » (texte des dialogues) servie en local depuis `public/fonts/` (licence OFL jointe).
4. Statistiques **cachées** : **Satisfaction** (0 → mutinerie), **Chaos** (100 → le train part en vrille),
   **Retard** (minutes, influence la fin) décident toujours des fins et des drapeaux, mais ne s'affichent plus.
   Le HUD montre le trajet, les passagers à bord (capacité 8, surcharge = chaos) et l'inventaire (12 cases).
5. Personnages principaux inspirés de vous : **Momo** et **Benjamin**, deux jeunes de 19 ans.
   Les célébrités sont des caricatures ; les footballeurs et les vêtements n'ont ni écusson, ni logo, ni sponsor.
   La satire politique reste légère et équilibrée (Mélenchon et Zemmour en prennent autant l'un que l'autre).
6. Voix enregistrées : pas en V1. Des « blips » de voix synthétisés par personnage servent de place-holder ;
   le format des données prévoit déjà un champ pour un fichier audio.

## Commandes

```
npm install          # une seule fois
npm run dev          # lance le jeu sur http://localhost:5173
npm run check:story  # vérifie l'histoire (liens cassés, drapeaux jamais posés) + 2000 parties simulées
npm run build        # version jouable dans dist/
```

## Structure

```
index.html
src/main.js               → config Phaser, liste des scènes
src/config.js             → constantes (taille, palette, vitesses)
src/art/                  → génération du pixel art (train, décors ; cottage.js = maisons et gares de chaque biome, field.js = sol et décor du champ, hero.js = sprites des personnages, bust.js = gros plans de dialogue, portraits.js = textures des personnages, items.js = objets, tableaux.js = images de fin et couverture du menu)
src/ui/                   → widgets, themes.js (interface de chaque biome), inventory.js (panneau d'inventaire)
src/systems/state.js      → état de la partie (stats, drapeaux, passagers à bord)
src/systems/story.js      → moteur narratif (conditions, effets, choix de fin) — sans Phaser, testable
src/systems/audio.js      → sons synthétisés (blips, sifflet, roulement)
src/data/                 → TOUT le contenu narratif (arrêts, personnages, incidents, objets, fins)
src/scenes/               → Boot, Title, Ride (le trajet), Dialogue, End
public/fonts/             → police Dogica (aucune image : tout le dessin vient du code)
tools/check-story.js      → validation + simulation de l'histoire
```

## Écrire du contenu (le plus important pour la suite)

Tout se passe dans `src/data/`. Exemple de personnage :

```js
toxico: {
  name: 'Jacky',
  role: 'Vend des trucs tombés du camion',
  look: { skin: '#f6d7c3', hair: 'short', hairColor: '#5a4a3a', outfit: '#6a6a7a' },
  voice: 190,                       // hauteur des blips
  start: 'intro',
  nodes: {
    intro: {
      text: "Chef, chef, chef. T'aurais pas deux euros ? En échange j'ai une tondeuse.",
      choices: [
        { if: 'has:piece', text: 'Deux euros contre la tondeuse.', take: ['piece'], fx: { sat: 5 }, next: 'marche' },
        { if: '!has:piece', text: "Je n'ai pas de monnaie.", next: 'sans' },
        { text: 'Monte, mais tu ne vends rien à bord.', fx: { chaos: 5 }, set: ['toxico_aboard'], end: 'board' },
      ],
    },
  },
},
```

- `fx` : `sat`, `chaos`, `delay` (variations).
- `set` / `unset` : drapeaux posés ou retirés.
- `next` : nœud suivant. `end` : `board` (il monte), `leave` (il reste dans la gare), `stay` (incident terminé).
- `if` sur un choix, un passager ou un incident : `"momo_refused"`, `"!toxico_aboard"`, `"chaos>=50"`,
  combinables avec `&` → `"toxico_aboard & has:piece"`. Objets : `"has:piece"`, `"!has:piece"`.
- `give` / `take` sur un choix : le conducteur reçoit ou remet des objets (`take` exige `if: 'has:id'`).
  `give` existe aussi sur une réplique sans choix. `show: 'id'` montre l'objet à la place du buste.
- `start` peut être une liste : `[{ if: 'momo_refused', node: 'retour' }, 'intro']`.
- `add: 5` sur un choix : des passagers anonymes montent (les squatteurs du marais de Shrek) ; ils comptent dans la capacité.
- `ending: 'id'` sur un choix : la partie s'arrête tout de suite sur cette fin (voir « Les fins »).
- `snap: true` sur un choix : Thanos claque des doigts. `drop: ['id']` : un passager descend en route.
- Sur un personnage : `dust` (sa dernière phrase quand Thanos le fait disparaître ; obligatoire s'il peut monter),
  `small: true` (personnage petit, buste posé plus bas dans le dialogue), `finds: true` (ses objets sont « trouvés »).
- Le texte peut contenir `{sat}`, `{chaos}` ou `{delay}` → remplacés par la valeur actuelle (les textes de fin acceptent `{delay}`).
- Apparence : un personnage reçoit un dessin à lui en ajoutant une entrée au même id dans `ROSTER` (`src/art/hero.js`, sprite) et `BUSTS` (`src/art/bust.js`, gros plan). Sans entrée, il prend le modèle générique, habillé d'après son `look` (`skin`, `hair`, `hairColor`, `outfit` en couleurs hexadécimales). `look` sert aussi à sa tête vue du dessus dans le train.

### Objets et rondes

Les objets sont dans `src/data/items.js` (`ITEMS` : nom et description ; 12 cases au maximum), leur dessin dans
`src/art/items.js` sous le même id. `FINDS` place une **ronde de Clara** après un arrêt, comme un incident : la
poule a fouillé le train, le conducteur choisit un objet parmi ce qu'elle a trouvé. Clara est un personnage
(`ronde`, `finds: true` : ses objets sont « trouvés » et non « reçus »). Les passagers (`src/data/stops.js`)
acceptent aussi `has:`.

Objets à pouvoir : un objet avec un champ `use` se clique dans l'inventaire (liseré doré sur sa case, effet écrit dans
l'infobulle). Le clic ne marche que quand le train roule, jamais pendant un dialogue. `useItem` (`src/systems/story.js`)
applique l'effet ; un objet qui n'aurait aucun effet n'est pas consommé et affiche son texte `idle`.

| Objet | Obtenu auprès de | Clic (un seul usage, sauf l'hologramme) |
|---|---|---|
| Gant de Thanos | Thanos, contre la pierre | Chaos -25 |
| Bracelet doré de Hoggy Rider | Hoggy Rider, contre le ballon | Retard -15 |
| Ballon d'or | Messi, contre le thermos | Satisfaction +20 |
| Sabre de Zoro | Zoro, contre la boussole | Retard -20 |
| Médaille du sergent | Le Roi Pigeon, contre le miel | Chaos -15 |
| Projecteur à hologramme | Mélenchon, contre le clairon | Le prochain incident n'a pas lieu (réutilisable, mais l'incident évité ne rapporte rien) |

L'hologramme n'évite que les incidents, pas les rondes ni les aiguillages.

Chaînes d'échanges : gland → Scrat → pierre → Thanos → gant ; stylo → Contrôleur → carnet → Maître Biquette →
dossier ; chargeur → Kimberley → décolorant → Lamine Yamal → ballon → Hoggy Rider → bracelet ; thermos → Messi →
Ballon d'or ; squatteurs de Shrek → oignon → Zemmour → boussole → Zoro → sabre ; histoires du sergent → clairon →
Mélenchon → hologramme ; Bruno → miel → Roi Pigeon → médaille ; pièce → Jacky → tondeuse → Bruno tondu.

Les rondes donnent cinq objets de départ : stylo, thermos, gland, chargeur, pièce de deux euros. Plusieurs personnages
veulent le même objet (le stylo : Momo ou le Contrôleur ; la pièce : Momo ou Jacky ; le clairon : Momo ou
Mélenchon ; le décolorant : Lamine Yamal ou la guerre des odeurs…) : on ne peut pas contenter tout le monde dans une
seule partie.

### Les personnages

Chaque id ci-dessous a ses dialogues dans `src/data/characters.js`, son sprite dans `ROSTER` (`src/art/hero.js`) et
son buste dans `BUSTS` (`src/art/bust.js`).

| id | Personnage | Ce qu'il veut | Ce qu'il donne ou déclenche |
|---|---|---|---|
| `momo` | Momo, stagiaire en survêtement, sacoche en bandoulière | De l'argent : stylo à revendre (Bois-Joli), clairon pour faire la manche (après Minuit), pièce de deux euros (Terminus) | Fin `greve` s'il n'est jamais payé |
| `benjamin` | Benjamin, supporter en maillot bleu | Rencontrer Mélenchon, Lamine Yamal et Hoggy Rider | Satisfaction à bord |
| `ronde` | Clara, poule rousse en baskets, billet sous l'aile | Qu'on la laisse faire sa ronde | Les cinq objets de départ ; fin `picore` |
| `lamine` | Lamine Yamal, ailier blond platine | Décolorant | Ballon du match ; aiguillage vers le stade, fin `mercato` |
| `thanos` | Thanos | Pierre qui brille | Gant ; aiguillage vers la grotte ; son claquement de doigts (`snap`) |
| `scrat` | Scrat | Gland | Pierre qui brille ; sans gland, il ronge le plancher (fin `coupe`) |
| `messi` | Messi | Thermos de café | Ballon d'or |
| `gabin` | Jean Gabin, en noir et blanc | Monter sans payer | Prend la cabine ; fin `cinema` |
| `zoro` | Zoro | Boussole | Sabre ; aiguillage vers la Sylve |
| `melenchon` | Mélenchon | Clairon ou oignon | Projecteur à hologramme ; fins `president` et `debat` |
| `zemmour` | Zemmour | Oignon (« produit du terroir ») | Boussole qui indique la droite ; fins `vapeur` et `debat` |
| `poilu` | Bruno, « pas un ours », et il sent fort | Être pris pour un homme | Pot de miel ; tondu à la tondeuse, il ne fait plus paniquer le wagon 2 |
| `shrek` | Shrek | Qu'on embarque les squatteurs de son marais | Oignon ; fins `marais` et `asphyxie` |
| `hoggy` | Hoggy Rider, supporter torse nu, pouce levé, qui valide tout | Ballon du match | Bracelet doré ; valide les billets au contrôle ; fin `valide` |
| `controleur` | Le Contrôleur | Stylo ; au contrôle : liasse ou dossier | Carnet de contraventions ; fin `embarques` |
| `toxico` | Jacky | Pièce de deux euros ; le cœur de Kimberley | Tondeuse ; vend les sièges du wagon 2 ; recalé, il descend (`drop`) |
| `riche` | Jacky, revenu riche | Rendre la monnaie de sa pièce | Liasse si on a été bon avec lui ; sinon fin `licencie` |
| `blonde` | Kimberley, influenceuse | Chargeur | Décolorant platine |
| `veteran` | Sergent Marcel | Qu'on écoute ses histoires (retard) | Clairon |
| `pigeon` | Le Roi Pigeon | Pot de miel | Médaille du sergent ; fin `roi_pigeon` |
| `chevre` | Maître Biquette, chèvre avocate | Carnet de contraventions | Dossier de défense, à sortir au contrôle surprise |
| `vieux` | Toi (dans 40 ans) | Qu'on l'écoute | La vraie fin ; fins `boucle`, `neant`, `retraite` |

Momo et Benjamin : chaque envie satisfaite pose un drapeau (`momo_1` puis `momo_2`, `benjamin_1` puis `benjamin_2`).
Ces envies ne changent pas la fin : elles nourrissent la satisfaction. Momo est `small: true` : son buste est posé
plus bas dans le dialogue, on voit qu'il est plus petit que les autres.
Jean Gabin est dessiné comme les autres, puis passé en niveaux de gris (`grayscale` dans `hero.js`, `gray` dans `bust.js`).
Chaque personnage qui peut monter a aussi un buste « à moitié en fumée » (`bust_<id>_dust`, `dusted` dans
`src/art/portraits.js`), montré quand Thanos le fait disparaître.

### Intrigues entre passagers (V7)

Elles sont écrites comme des incidents (`src/data/incidents.js`), qui se déclenchent quand les bons passagers sont à
bord. Un seul incident par trajet : l'ordre du fichier fait la priorité.

- **Guerre Mélenchon / Zemmour** (`guerre`, puis `guerre_2` tant que le drapeau `guerre_froide` tient) : les deux à
  bord, le wagon 2 devient un plateau télé. L'oignon ou le clairon y mettent fin pour de bon ; les séparer ne fait
  que repousser ; laisser faire mène à la fin `debat`.
- **Jacky et Kimberley** (`declaration`) : Jacky se déclare. Recalé (`jacky_recale`), il descend en route (`drop`)
  et revient après Minuit en hélicoptère, riche et bien habillé (`riche`). Si on a été bon avec lui (`retour_riche`),
  il laisse une **liasse** : de quoi soudoyer le Contrôleur. Si on l'a humilié (`jacky_humilie`, `retour_vire`), il a
  racheté la ligne : fin `licencie`.
- **Guerre des odeurs** (`odeurs`) : Bruno et Shrek à bord. Le décolorant ou la tondeuse règlent l'affaire ;
  sinon, fin `asphyxie`.
- Et aussi : `terroir` (Zemmour reconnaît l'oignon), `perdu` (Zoro et la boussole), `dossier` (Maître Biquette et
  le carnet), `annonce` (Momo fait la manche au clairon).
- **Thanos** : un choix `snap: true` retire la moitié des passagers (arrondie au supérieur, `snapHalf`). Chacun dit
  sa dernière phrase (champ `dust` du personnage, obligatoire s'il peut monter) avant de partir en fumée ; une fois
  sur deux, le conducteur y passe aussi (fin `poussiere`).
- **Contrôle surprise** : avant le Terminus, le Contrôleur recompte. À 8 ou moins, rien. Au-delà, il faut la
  liasse, le dossier ou Hoggy Rider à bord ; sinon fin `embarques`.

### Itinéraire, aiguillages et suspense

Les arrêts (`src/data/stops.js`) forment un graphe. Le trajet part du premier arrêt et suit `next` jusqu'au
terminus, le seul arrêt sans `next` :

```js
{ id: 'bois_joli', ..., clue: "Un écureuil jure qu'il n'y a pas de terminus.",
  next: [{ if: 'voie_sylve', stop: 'sylve' }, 'flaque'] },   // dernier élément = arrêt par défaut
```

- `clue` : rumeur sur le terminus affichée dans la bannière d'arrivée. Elles se contredisent exprès.
- `JUNCTIONS` (`src/data/incidents.js`) : rencontres sur la voie après l'incident éventuel (Zoro, Thanos,
  Lamine Yamal) ; leurs choix posent les drapeaux (`voie_sylve`, `voie_grotte`, `voie_stade`) qui font bifurquer la ligne. Si l'arrêt suivant
  change, le jeu annonce « Changement d'itinéraire ! » et refait le compte à rebours. Le **contrôle surprise** du
  Contrôleur (`controle`, après le stade ou le nuage) est aussi une rencontre sur la voie.
- Itinéraire actuel : Saint-Banal → Bois-Joli → (Flaque | Sylve) → (Grotte ?) → Minuit → (Stade | Nuage 9) → Terminus ?
  soit 6 ou 7 arrêts.
- `state.route` garde les arrêts traversés (affichés sur l'écran de fin).

### Les fins (V7)

Il n'y a qu'**une vraie fin** : `vraie_fin` (« Le terminus n'existe pas », `terminus: true`, ton `'true'`). On
l'obtient en arrivant au Terminus sans faux pas et en écoutant jusqu'au bout **« Toi (dans 40 ans) »** (`vieux`),
qui vient dire que le terminus n'existe pas vraiment. Les 21 autres fins (`tone: 'bad'`, « Fin de service »)
arrêtent la partie **sur-le-champ** :

- un mauvais choix (`ending: 'id'`) : `coupe` (laisser Scrat ronger le plancher), `greve` (Momo jamais payé),
  `valide` (Hoggy Rider valide n'importe quoi), `debat` (la guerre Mélenchon / Zemmour dégénère), `vapeur`
  (Zemmour ramène le train à la vapeur), `asphyxie` (guerre des odeurs), `licencie` (Jacky riche et rancunier),
  `picore` (Clara), `president`, `marais`, `cinema`, `mercato`, `roi_pigeon`, et au Terminus `boucle`, `neant`,
  `retraite` ;
- le claquement de doigts de Thanos (`snap: true`) : `poussiere`, une fois sur deux ;
- le contrôle surprise à plus de 8 à bord, sans liasse, sans dossier et sans Hoggy Rider : `embarques` ;
- une jauge à bout (`checkGameOver`) : `mutinerie` (satisfaction à 0), `chaos_total` (chaos à 100), `retard`
  (60 minutes).

Chaque fin a son **image** (216×120 px, affichée ×2), dessinée par le code dans `src/art/tableaux.js` à partir des
sprites et des bustes : texture `tableau_<id>`, créée à la demande par `tableauKey(scene, id)`. Une nouvelle fin a
besoin d'une entrée du même id dans `SCENES` (sinon elle prend l'image de `retard`). L'écran de fin
(`src/scenes/End.js`) montre l'image, le récit, le bilan et la collection des fins en vignettes (« ? » tant qu'une
fin n'est pas découverte). La couverture du menu (`coverKey`, 320×180 px, ×3) vient du même fichier.

### Passagers tirés au sort

Dans `src/data/stops.js`, la liste `passengers` d'un arrêt mélange deux sortes d'entrées :

```js
{ id: 'bois_joli', ..., pick: 2,
  passengers: [
    { char: 'momo', node: 'stylo', if: 'momo_aboard', aboard: true },   // déjà à bord : il descend réclamer son stylo
    { char: 'scrat', weight: 30 },                                      // avec weight : tiré au sort
    { char: 'controleur', weight: 25 },
    ...
  ] },
```

- `weight` : part de chance du personnage dans cette gare. Quand les poids d'une gare font 100, un poids se lit
  comme un pourcentage. `pick` : nombre de personnages tirés (1 ou 2 selon la gare).
- Un personnage déjà croisé sur un quai (`state.met`) ou déjà à bord sort du tirage ; les autres se partagent les
  100 % en gardant leurs proportions. Exemple : Scrat 30, Jacky 20, Kimberley 50 ; si Kimberley a déjà été croisée,
  Scrat passe à 30/50 = 60 % et Jacky à 20/50 = 40 %. Le deuxième tiré est choisi de la même façon parmi ceux qui restent.
- Sans `weight` : personnages liés au lieu (Momo et Benjamin à Saint-Banal, Shrek à la Flaque, Bruno à la Sylve,
  Thanos dans la grotte, Jean Gabin à Minuit, Hoggy Rider et Messi au stade, le Roi Pigeon sur le nuage,
  « Toi (dans 40 ans) » au Terminus) et retours conditionnels (`{ char: 'momo', node: 'retour', if: 'momo_refused' }`).
- `aboard: true` (entrée sans `weight`) : un passager **déjà à bord** descend sur le quai pour parler au conducteur.
  C'est ainsi que Momo réclame son argent et que Benjamin demande des nouvelles de ses idoles ; la réplique doit finir par `end: 'board'`.
- Le quai garde 3 passagers au maximum, dans l'ordre du fichier : les entrées du haut passent avant les tirés au sort.
- Un personnage n'est jamais tiré dans la gare où il descend (`dest` : Kimberley à Minuit, Lamine Yamal au stade).
- `after` d'un incident (`src/data/incidents.js`) peut être une liste d'arrêts : le passager peut monter dans
  plusieurs gares, son incident a lieu une seule fois, au premier de ces trajets où sa condition est vraie.
- `npm run check:story` affiche, pour chaque arrêt, le poids et la fréquence réellement observée de chaque
  personnage, ainsi que le nombre de passagers sur le quai.

## Limites de la V1

- Les choix sont limités à 3 visibles par réplique (règle de game design). Deux choix qui s'excluent
  (`chaos>=30` / `chaos<30`, `has:x` / `!has:x`) ne comptent qu'une fois.
- Une partie fait environ 15-20 minutes, 6 ou 7 arrêts selon l'itinéraire.
- Sauvegarde : seulement la liste des fins découvertes (localStorage).

## Critères de réussite V1

- [ ] Le train roule, ralentit et s'arrête proprement à chaque arrêt ; le décor change selon le lieu.
- [ ] Les passagers attendent dans la gare (invisibles à l'arrivée, surprise au dialogue) ; s'ils montent, ils sortent par la porte et marchent jusqu'au train.
- [ ] Dialogue : gros plan du buste à droite, posé sur la boîte et coupé par elle (128×106 px, ×2), nom en onglet, grande boîte de texte en machine à écrire, 3 choix côte à côte en bas (souris ou touches 1/2/3), tout en pixel art.
- [ ] Monde en vue 3/4 aux couleurs chaudes ; le train est le héros.
- [ ] Première carte : un champ aéré, de l'herbe et quelques parcelles espacées, peu d'éléments à l'écran (densité réglée par biome avec `spacing` et `smallSpacing` dans `src/config.js`).
- [ ] Interface : boîtes de texte, choix et bandeaux changent de couleurs et de motifs à chacun des 9 biomes.
- [ ] HUD : trajet à gauche, inventaire en haut à droite (infobulle au survol), plus aucune jauge de stats.
- [ ] Objets : donnés par les passagers ou trouvés en ronde ; ils ouvrent des choix, des montées de passagers et des fins.
- [ ] Objets à pouvoir : un clic en roulant produit un effet visible et un message ; l'hologramme rend le train translucide et évite le prochain incident.
- [ ] V7 : chacun des 22 personnages veut quelque chose et donne ou déclenche quelque chose ; chacun des 22 objets ouvre au moins un choix ou un effet.
- [ ] V7 : Momo réclame de l'argent trois fois (stylo, clairon, pièce) ; Benjamin veut rencontrer Mélenchon, Lamine Yamal et Hoggy Rider.
- [ ] V7 : Momo est nettement plus petit que les autres, y compris en dialogue (buste posé plus bas) : survêtement et baskets sans logo, sacoche en bandoulière, lunettes, bouc léger. Benjamin est fin, cheveux bruns au-dessus des épaules, moustache courte, maillot bleu sans écusson.
- [ ] Les choix posent des drapeaux qui changent la suite, et le joueur voit les objets gagnés ou perdus.
- [ ] Au moins 2 conséquences « boule de neige » (personnage refusé qui revient, incident à bord).
- [ ] Une seule vraie fin au terminus ; toutes les autres sont des fins de service immédiates (mauvais choix, ou jauge à bout : mutinerie, chaos total, retard).
- [ ] `npm run check:story` passe sans erreur.
- [ ] Tirage des passagers : 2 par gare selon les `weight` de `src/data/stops.js` ; un personnage déjà croisé n'est
      jamais retiré au sort et les poids restants sont ramenés à 100 % (Scrat 30 / Jacky 20 / Kimberley 50,
      Kimberley déjà croisée → Scrat 60 %, Jacky 40 %).
- [ ] V4 : au moins 3 biomes atteints par aiguillage (sylve, grotte, stade), chacun avec ses personnages
      (Bruno, Thanos, Hoggy Rider, Messi, Lamine Yamal).
- [ ] Le stade et le Néant du terminus ont chacun un décor qui se reconnaît au premier regard.
- [ ] Lamine Yamal : buste et sprite avec boucles platine et côtés dégradés, maillot à bandes bleu et grenat n° 10, sans écusson ni logo de marque.
- [ ] V4 : le HUD et le grand compte à rebours donnent toujours le bon nombre d'arrêts restants, même après un aiguillage.
- [ ] Maisons : un même modèle (grand toit à deux pans, façade, porte, fenêtres, cheminée) décliné pour chacun des 9 biomes, gares comprises.
- [ ] V7 : les 22 personnages ont chacun un sprite et un buste caricaturés et reconnaissables ; Jean Gabin est en noir et blanc ; les footballeurs et les vêtements n'ont ni écusson, ni logo, ni sponsor.
- [ ] V7 : 22 fins, chacune avec son image ; une seule vraie fin (`vraie_fin`). `npm run check:story` les atteint toutes sauf `mercato`, trop rare pour les parties simulées (avertissement toléré).
- [ ] V7 : un mauvais choix arrête la partie tout de suite, sur l'image de sa fin (Scrat coupe le train en deux, le Contrôleur embarque tout le monde…).
- [ ] V7 : quand Thanos claque des doigts, la moitié des passagers disparaît ; chacun dit sa dernière phrase, le buste à moitié en fumée ; une fois sur deux, le conducteur part aussi (fin `poussiere`).
- [ ] V7 : contrôle surprise avant le Terminus ; à plus de 8 à bord, il faut la liasse de Jacky, le dossier de Maître Biquette ou Hoggy Rider, sinon fin `embarques`.
- [ ] V7 : intrigues entre passagers jouables de bout en bout : guerre Mélenchon / Zemmour, Jacky et Kimberley, guerre des odeurs Bruno / Shrek.
- [ ] V7 : le menu et l'écran de fin n'utilisent que des images dessinées par le code ; l'écran de fin montre la collection des fins en vignettes.
- [ ] Personnages : tous dans un seul style, aplats et contour sombre unique ; 128×106 px pour le buste de dialogue (×2), 28×39 px pour le sprite sur le quai (×2).

## Limites du projet

- Toujours : garder le contenu narratif dans `src/data/` ; lancer `npm run check:story` après avoir modifié l'histoire.
- Demander d'abord : changer de moteur, ajouter une dépendance, changer le format des données.
- Jamais : mettre du texte de dialogue en dur dans les scènes.
