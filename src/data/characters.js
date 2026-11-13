// Tous les personnages et leurs dialogues. Format décrit dans SPEC.md (« Écrire du contenu »).
//
// look    : tête vue du dessus dans les verrières (src/art/portraits.js), et habits du modèle générique
//           si le personnage n'a pas de dessin à lui dans src/art/hero.js (ROSTER).
// voice   : hauteur des blips de voix (Hz). Plus tard : `voiceFile` pour vos vraies voix.
// dest    : id de l'arrêt où le passager descend tout seul.
// nodes   : répliques. `text` peut être une liste [{ if, text }, ..., 'défaut'].
// Objets (src/data/items.js) : `give` et `take` sur un choix, `show` sur une réplique pour montrer l'objet
//           à la place du personnage.
// dust    : dernière phrase du passager quand Thanos claque des doigts (obligatoire s'il peut monter).
// small   : personnage petit, son buste est dessiné plus bas dans le dialogue (Momo).
// finds   : ses objets sont « trouvés » et non « reçus » (Clara et ses rondes).
// Choix   : `ending` arrête la partie sur cette fin ; `snap` fait claquer les doigts de Thanos ;
//           `drop: ['id']` fait descendre un passager en route.
//
// Momo et Benjamin sont les deux personnages principaux. Momo veut de l'argent : un stylo à revendre, un
// clairon pour faire la manche, puis sa paie de deux euros. Benjamin veut rencontrer Mélenchon, Lamine Yamal
// et Hoggy Rider : il fait le compte au Terminus (drapeaux melenchon_aboard, lamine_aboard, voie_stade).
// Les drapeaux momo_1, momo_2 (et benjamin_1, benjamin_2) comptent les envies satisfaites : la première
// pose _1, la suivante pose _2. Comme une condition ne sait pas compter, la réplique de remerciement a deux
// choix identiques, l'un avec `if: 'momo_1'` (pose momo_2), l'autre avec `if: '!momo_1'` (pose momo_1).
// Ces envies ne changent pas la fin : elles nourrissent la satisfaction, donc la survie du train.
//
// Intrigues entre passagers (incidents.js) : Mélenchon contre Zemmour, Jacky amoureux de Kimberley,
// Bruno contre Shrek pour l'odeur, et le Contrôleur qui recompte tout le monde avant le Terminus.

const SKIN = { pale: '#f6d7c3', light: '#eebf98', tan: '#d29a6a', brown: '#a8693f', dark: '#6e4329' };

export const CHARACTERS = {
  // ─────────────────────────── Les deux personnages principaux ───────────────────────────
  momo: {
    name: 'Momo',
    role: 'Stagiaire. Petit, mais déterminé. Veut être payé.',
    dust: "Chef… et ma paie ? Elle part en fumée aussi ?",
    small: true,
    look: { skin: '#dcae84', hair: 'short', hairColor: '#1c1410', outfit: '#3a74d0', mouth: 'smile' },
    voice: 210,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "Chef ! Plus bas. Encore. Voilà. Momo, votre nouveau stagiaire. Personne ne m'a engagé, alors je me suis engagé tout seul. " +
          "Reste un détail : ma paie. C'est combien, et c'est quand ?",
        choices: [
          { text: 'Monte. On verra pour la paie.', fx: { sat: 5 }, set: ['momo_aboard'], next: 'besoin' },
          { text: 'Un stagiaire, ça ne se paie pas.', fx: { chaos: 5 }, set: ['momo_aboard'], next: 'besoin' },
          { text: 'Non. Tu restes sur le quai.', fx: { sat: -5 }, set: ['momo_refused'], end: 'leave' },
        ],
      },
      besoin: {
        text:
          "Alors je me paie en nature, chef. Tout ce qui se revend m'intéresse. Un stylo de la compagnie, " +
          'ça part à trois euros. Je descends vous le réclamer à la prochaine gare !',
        end: 'board',
      },

      // Si on l'a laissé à Saint-Banal : il rattrape le train à Flaque ou à la Sylve.
      retour: {
        text:
          "Chef ! J'ai couru le long de la voie. Bon, j'ai pris le bus. Deux euros, le bus ! " +
          'Vous me les devez. Vous me prenez, cette fois ?',
        choices: [
          { text: "Monte. Tu l'as mérité.", fx: { sat: 5 }, set: ['momo_aboard'], next: 'retour_ok' },
          { text: "C'est toujours non, Momo.", fx: { sat: -5 }, end: 'leave' },
        ],
      },
      retour_ok: {
        text:
          'Merci chef ! Je note : deux euros de bus. Et si vous trouvez un truc qui fait du bruit, ' +
          "gardez-le-moi : j'ai une idée pour gagner des sous au wagon 2.",
        end: 'board',
      },

      // Envie 1 : le stylo à revendre, sur le quai du Bois-Joli.
      stylo: {
        text:
          'Chef ! Mon acompte ? Vous aviez dit « on verra », et on voit. Un stylo de la compagnie, ' +
          "ça part à trois euros. J'ai déjà un acheteur.",
        choices: [
          { if: 'has:stylo', text: 'Tiens. Vends-le bien.', take: ['stylo'], fx: { sat: 10 }, set: ['momo_1'], next: 'stylo_merci' },
          { if: '!has:stylo', text: "Je n'ai pas trouvé de stylo.", next: 'stylo_non' },
          { text: 'Plus tard, Momo. Remonte.', fx: { sat: -3 }, next: 'stylo_non' },
        ],
      },
      stylo_merci: {
        text:
          "Vendu ! À moi-même, mais vendu. Prochaine affaire : il me faut un truc qui fait du bruit, " +
          'pour faire la manche au wagon 2. Et au Terminus, chef : ma paie. Deux euros.',
        end: 'board',
      },
      stylo_non: {
        text:
          'Pas grave, chef : je vous fais crédit. Mais trouvez-moi un truc qui fait du bruit, ' +
          "j'ai une idée pour le wagon 2. Et au Terminus : ma paie. Deux euros.",
        end: 'board',
      },

      // Envie 2 : le clairon pour faire la manche, à bord après la Gare de Minuit.
      annonce: {
        text:
          "Chef, j'ai fait la manche au wagon 2. Recette : un bouton et un ticket de métro. " +
          "Personne ne m'entend ! Il me faut un truc qui sonne. Une trompette, un clairon…",
        choices: [
          { if: 'has:clairon', text: 'Prends le clairon du sergent.', take: ['clairon'], fx: { sat: 10, chaos: 5 }, next: 'annonce_merci' },
          { if: '!has:clairon', text: "Je n'ai rien qui fasse du bruit.", next: 'annonce_non' },
          { text: 'Chante plus fort, Momo.', fx: { chaos: 5, sat: -3 }, next: 'annonce_non' },
        ],
      },
      annonce_merci: {
        text:
          "POUËËËT ! Vous avez vu, chef ? Ils paient pour que j'arrête ! Quarante centimes en dix minutes. " +
          "N'oubliez pas : au Terminus, ma paie. Deux euros.",
        choices: [
          { if: 'momo_1', text: 'On verra au Terminus.', set: ['momo_2'], end: 'stay' },
          { if: '!momo_1', text: 'On verra au Terminus.', set: ['momo_1'], end: 'stay' },
        ],
      },
      annonce_non: {
        text:
          'Bon. Je ferai la manche en mime. Ça rapporte moins, mais ça fatigue moins. ' +
          "N'oubliez pas, chef : au Terminus, ma paie. Deux euros.",
        end: 'stay',
      },

      // Envie 3 : la paie, sur le quai du Terminus.
      paie: {
        text:
          "Chef, c'est le Terminus. Fin du stage. J'ai fait mes comptes : vous me devez deux euros. " +
          "J'ai arrondi en votre faveur.",
        choices: [
          { if: 'has:piece', text: 'Deux euros. Tu les as mérités.', take: ['piece'], fx: { sat: 10 }, next: 'paie_merci' },
          { if: '!has:piece', text: "Je n'ai pas un centime, Momo.", next: 'paie_non' },
          { text: 'Un stage, ça se paie en expérience.', ending: 'greve' },
        ],
      },
      paie_merci: {
        text: 'Deux euros ! Une vraie pièce ! Chef, je ne la dépenserai jamais. Enfin, pas avant ce soir.',
        choices: [
          { if: 'momo_1', text: "File, avant que je change d'avis.", set: ['momo_2'], end: 'board' },
          { if: '!momo_1', text: "File, avant que je change d'avis.", set: ['momo_1'], end: 'board' },
        ],
      },
      paie_non: {
        text: "Alors je vous envoie la facture, chef. Avec les intérêts. Je ne sais pas ce que c'est, mais j'en veux.",
        end: 'board',
      },
    },
  },

  benjamin: {
    name: 'Benjamin',
    role: 'Supporter. Veut trois selfies.',
    dust: "Allez les Bl… Chef, un selfie de moi, vite ! Je deviens flou !",
    look: { skin: SKIN.light, hair: 'long', hairColor: '#5a3a22', outfit: '#1f3f9a', mouth: 'smile' },
    voice: 150,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "Chef ! Allez les Bleus ! Moi, c'est Benjamin. J'ai une mission : rencontrer Hoggy Rider, Lamine Yamal " +
          "et Mélenchon. Les trois. On m'a dit qu'ils prenaient tous ce train.",
        choices: [
          { text: 'Montez. On va les trouver.', fx: { sat: 5 }, set: ['benjamin_aboard'], next: 'besoin' },
          { text: 'Mélenchon ? Dans mon train ?', fx: { chaos: 5 }, set: ['benjamin_aboard'], next: 'besoin' },
          { text: 'Attendez le prochain.', fx: { sat: -5 }, set: ['benjamin_refused'], end: 'leave' },
        ],
      },
      besoin: {
        text:
          "Merci chef ! J'ai l'appareil photo et la moustache des grands soirs. " +
          "Si l'un des trois veut monter, laissez-le monter : je m'occupe du selfie.",
        end: 'board',
      },

      // Si on l'a laissé à Saint-Banal : il attend à la Gare de Minuit.
      retour: {
        text:
          "Chef ! J'ai attendu le prochain train. Il n'y a que le vôtre. Hoggy Rider, Yamal, Mélenchon : " +
          "ils sont à bord ? Dites-moi qu'ils sont à bord.",
        choices: [
          { text: 'Montez, vous verrez bien.', fx: { sat: 5 }, set: ['benjamin_aboard'], next: 'retour_ok' },
          { text: 'Non. Le prochain arrive. Promis.', fx: { sat: -5 }, end: 'leave' },
        ],
      },
      retour_ok: {
        text:
          "Merci ! On dit qu'un ailier blond court le long de la voie après cette gare. " +
          'Si vous le voyez, suivez-le, chef !',
        end: 'board',
      },

      // Sur le quai de Flaque ou de la Sylve : des nouvelles de Mélenchon.
      nouvelles: {
        text:
          "Chef, je suis descendu regarder le quai. Pas de Hoggy Rider. Pas de Yamal. " +
          "Et Mélenchon, vous l'avez vu ?",
        choices: [
          { if: 'melenchon_aboard', text: 'Il harangue le wagon 2.', fx: { sat: 5 }, next: 'nouvelles_oui' },
          { if: '!melenchon_aboard', text: 'Pas encore vu.', next: 'nouvelles_non' },
          { text: 'Remontez, on repart.', next: 'nouvelles_non' },
        ],
      },
      nouvelles_oui: {
        text: "Au wagon 2 ?! J'y cours. Je lui demande un selfie dès qu'il reprend son souffle. Ça peut être long.",
        end: 'board',
      },
      nouvelles_non: {
        text: "Tant pis. S'il veut monter, laissez-le monter, chef ! Même s'il parle fort. Surtout s'il parle fort.",
        end: 'board',
      },

      // Sur le quai de la Gare de Minuit : la piste de Yamal, qui mène au stade et à Hoggy Rider.
      rumeur: {
        text:
          "Chef ! Un type sur le quai me l'a juré : après Minuit, un ailier blond court le long de la voie. " +
          "C'est Yamal ! Suivez-le : il mène au stade. Et au stade, il y a Hoggy Rider.",
        choices: [
          { text: 'Promis, je le suis.', fx: { sat: 3 }, next: 'rumeur_ok' },
          { text: 'Je conduis un train, pas un fan-club.', fx: { sat: -3 }, next: 'rumeur_ok' },
        ],
      },
      rumeur_ok: {
        text: "Je garde l'appareil photo chargé. Et la moustache peignée. On ne sait jamais.",
        end: 'board',
      },

      // Au Terminus : le compte des rencontres. Chacune pose benjamin_1, puis benjamin_2.
      album: {
        text: "Le Terminus, chef ! L'heure de l'album. Commençons : Mélenchon. Il est monté dans ce train ?",
        choices: [
          { if: 'melenchon_aboard', text: 'Oui. Wagon 2, debout sur un siège.', fx: { sat: 5 }, next: 'album_m' },
          { if: '!melenchon_aboard', text: 'Jamais vu de la journée.', next: 'album_l' },
        ],
      },
      album_m: {
        text: "Je l'ai eu ! Le selfie est flou, il bougeait les bras. Mais c'est lui !",
        choices: [{ text: 'Au suivant.', set: ['benjamin_1'], next: 'album_l' }],
      },
      album_l: {
        text: "Lamine Yamal, maintenant. L'ailier blond platine. Il est monté ?",
        choices: [
          { if: 'lamine_aboard', text: 'Oui. Il courait plus vite que le train.', fx: { sat: 5 }, next: 'album_l_ok' },
          { if: '!lamine_aboard', text: 'Pas vu.', next: 'album_k' },
        ],
      },
      album_l_ok: {
        text: "Selfie ! Flou aussi : il dribblait. J'ai surtout photographié ma moustache.",
        choices: [
          { if: 'benjamin_1', text: 'Au suivant.', set: ['benjamin_2'], next: 'album_k' },
          { if: '!benjamin_1', text: 'Au suivant.', set: ['benjamin_1'], next: 'album_k' },
        ],
      },
      album_k: {
        text: 'Et le dernier : Hoggy Rider. On est passés par le stade, chef ?',
        choices: [
          { if: 'voie_stade', text: 'Oui. Il était sur le quai.', fx: { sat: 5 }, next: 'album_k_ok' },
          { if: '!voie_stade', text: "Non. Pas de stade aujourd'hui.", next: 'album_fin' },
        ],
      },
      album_k_ok: {
        text:
          "Hoggy Rider ! Je lui ai crié « Allez les Bleus ». Il a levé le pouce. " +
          'Il a dit « validé ». Selfie validé !',
        choices: [
          { if: 'benjamin_1', text: 'Remontez, on arrive.', set: ['benjamin_2'], end: 'board' },
          { if: '!benjamin_1', text: 'Remontez, on arrive.', set: ['benjamin_1'], end: 'board' },
        ],
      },
      album_fin: {
        text: "Alors l'album a des trous, chef. Tant pis. Je mettrai des dessins.",
        end: 'board',
      },
    },
  },

  // ─────────────────────────── Passagers tirés au sort ───────────────────────────
  blonde: {
    name: 'Kimberley',
    role: 'Influenceuse. 12 abonnés, dont sa mère.',
    dust: "Attendez, je suis en live ! Mes douze abonnés vont ador…",
    look: { skin: SKIN.tan, hair: 'long', hairColor: '#f2df8a', outfit: '#e04890', mouth: 'smile', eyes: 'wide' },
    voice: 250,
    dest: 'minuit',
    start: 'intro',
    nodes: {
      intro: {
        text:
          'Attends, je suis en live. Les bébés, dites bonjour au chauffeur ! Bon. Il me faut une place ' +
          "côté fenêtre et un chargeur : je suis à 9 %. T'as ça ?",
        choices: [
          { text: 'Montez. Côté fenêtre, promis.', fx: { sat: 5, delay: 5 }, set: ['blonde_aboard'], end: 'board' },
          { text: 'Conducteur. Pas chauffeur.', fx: { chaos: 5 }, set: ['blonde_aboard'], end: 'board' },
          { text: 'Pas de tournage dans mon train.', fx: { sat: -5 }, end: 'leave' },
        ],
      },
      live: {
        text:
          'URGENCE. Mon téléphone est à 2 %. Douze personnes me regardent. Onze : ma mère vient ' +
          "de partir. Si l'écran s'éteint, je n'existe plus !",
        choices: [
          { if: 'has:chargeur', text: 'Tiens, un chargeur. Respire.', take: ['chargeur'], fx: { sat: 10 }, next: 'live_merci' },
          { text: 'Garde ta batterie, coupe le live.', fx: { sat: -3 }, next: 'live_noir' },
          { text: 'Regarde par la fenêtre, pour changer.', fx: { chaos: 5 }, next: 'live_noir' },
        ],
      },
      live_merci: {
        show: 'decolorant',
        give: ['decolorant'],
        text:
          'Tu me sauves la vie, bébé. Tiens : mon décolorant de secours. Blond polaire, tient ' +
          'trois matchs. Je te mets en story. Tu fais quoi dans la vie, déjà ?',
        end: 'stay',
      },
      live_noir: {
        text:
          "Écran noir. Je vois… mon reflet. Et derrière, des arbres ? Ça existe encore, ça ? " +
          "C'est super mal cadré.",
        end: 'stay',
      },
    },
  },

  toxico: {
    name: 'Jacky',
    role: 'Vend des trucs tombés du camion',
    dust: "Chef… t'aurais pas deux eur…",
    look: { skin: SKIN.pale, hair: 'short', hairColor: '#5a4a3a', outfit: '#6a6a7a', eyes: 'tired', mouth: 'grin' },
    voice: 190,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "Chef, chef, chef. T'aurais pas deux euros ? C'est pour un sandwich. Un sandwich très urgent. " +
          "En échange j'ai une tondeuse. Presque neuve. Tombée d'un camion.",
        choices: [
          { if: 'has:piece', text: 'Deux euros contre la tondeuse.', take: ['piece'], fx: { sat: 5, delay: 5 }, set: ['jacky_ami'], next: 'marche' },
          { if: '!has:piece', text: "Je n'ai pas de monnaie.", next: 'sans' },
          { text: 'Monte, mais tu ne vends rien à bord.', fx: { chaos: 5 }, set: ['toxico_aboard'], end: 'board' },
        ],
      },
      marche: {
        show: 'tondeuse',
        text:
          'Parole de Jacky, elle tond tout. La pelouse, la moquette, un ours. ' +
          "Tu me prends jusqu'à la prochaine ? J'ai un camion à rattraper.",
        choices: [
          { text: 'Monte, Jacky.', give: ['tondeuse'], fx: { chaos: 5 }, set: ['toxico_aboard'], end: 'board' },
          { text: 'Non. Bonne route.', give: ['tondeuse'], end: 'leave' },
        ],
      },
      sans: {
        text:
          'Pas grave, pas grave, pas grave. Je te la garde. Tu me prends quand même ? ' +
          "Je me fais tout petit. Je tremble un peu, mais c'est le froid.",
        choices: [
          { text: 'Monte. Et tiens-toi tranquille.', fx: { chaos: 5 }, set: ['toxico_aboard'], end: 'board' },
          { text: "Pas aujourd'hui, Jacky.", fx: { sat: -3 }, end: 'leave' },
        ],
      },
      // À bord avec Kimberley : il l'aime. Recalé, il saute du train et revient riche (personnage `riche`).
      declaration: {
        text:
          "Chef. Chef. Chef. La dame du wagon 1, celle qui parle à son téléphone. Je crois que je l'aime. " +
          'Elle m\'a regardé. Enfin, elle a regardé derrière moi. Mais dans ma direction. Je lui dis ?',
        choices: [
          { text: 'Fonce, Jacky. Sois toi-même.', fx: { sat: 3 }, set: ['jacky_ami', 'jacky_recale'], drop: ['toxico'], next: 'recale' },
          { text: 'Regarde-toi. Elle ne te verra jamais.', fx: { sat: -5 }, set: ['jacky_humilie', 'jacky_recale'], drop: ['toxico'], next: 'humilie' },
          { text: 'Laisse-la, elle est en live.', end: 'stay' },
        ],
      },
      recale: {
        text:
          "(Il y va. Il revient.) Elle a dit : « T'es qui ? » Puis elle m'a bloqué. Avec son bras. " +
          "Arrête pas le train, chef, je saute. J'ai l'habitude, je tombe des camions. Je reviendrai quand je serai quelqu'un.",
        end: 'stay',
      },
      humilie: {
        text:
          "(Il te regarde longtemps.) … D'accord, chef. Je note. Jacky note tout, dans sa tête. Arrête pas le train, " +
          "je saute. Un jour, t'entendras parler de moi. Et ce jour-là, t'auras pas deux euros.",
        end: 'stay',
      },
      vente: {
        text:
          "Chef, bonne nouvelle : j'ai vendu trois sièges du wagon 2. Mauvaise nouvelle : " +
          "y'avait des gens dessus. Je te fais moitié-moitié ?",
        choices: [
          { if: 'has:piece & !has:tondeuse', text: 'Deux euros, ta tondeuse, et tu arrêtes.', take: ['piece'], fx: { chaos: -5 }, set: ['jacky_ami'], next: 'vente_tondeuse' },
          { text: 'Rends les sièges. Tout de suite.', fx: { sat: 5 }, end: 'stay' },
          { text: 'Moitié-moitié. Vendu.', fx: { chaos: 10, sat: -5 }, end: 'stay' },
        ],
      },
      vente_tondeuse: {
        show: 'tondeuse',
        give: ['tondeuse'],
        text:
          'Marché conclu, chef. Elle tond tout : la pelouse, la moquette, un ours. ' +
          'Je rends les sièges. Enfin, deux sur trois. Le troisième a déjà un nouveau propriétaire.',
        end: 'stay',
      },
    },
  },

  veteran: {
    name: 'Sergent Marcel',
    role: 'Vétéran. De quelle guerre ? Ça dépend des jours.',
    dust: "J'ai connu pire. En 14. Enfin, je crois. Rompez…",
    look: { skin: SKIN.pale, hair: 'short', hairColor: '#d8d8d8', beard: 'mustache', outfit: '#5a6a3a', mouth: 'flat' },
    voice: 110,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "Garde à vous ! Sergent Marcel, 3e régiment de… peu importe. J'ai fait toutes les guerres, " +
          "soldat. Même celles qu'on n'a pas eues. Je vous raconte ?",
        choices: [
          { text: "Racontez, sergent. J'ai le temps.", fx: { delay: 15, sat: 10 }, set: ['clairon_donne'], next: 'histoire' },
          { text: 'Montez, vous raconterez à bord.', fx: { sat: 3 }, set: ['veteran_aboard'], end: 'board' },
          { text: 'Rompez, sergent. Le train part.', fx: { sat: -5 }, end: 'leave' },
        ],
      },
      histoire: {
        show: 'clairon',
        text:
          "… et là, j'ai sonné la retraite. Tout seul. En 62. Ou en 14. Tenez, soldat : mon clairon. " +
          "Vous savez écouter, c'est rare. Je monte ?",
        choices: [
          { text: 'À bord, sergent !', give: ['clairon'], set: ['veteran_aboard'], end: 'board' },
          { text: 'Gardez le quai, sergent.', give: ['clairon'], end: 'leave' },
        ],
      },
      souvenirs: {
        text:
          'Soldat ! Je racontais la bataille du wagon-restaurant de 1962 aux passagers. ' +
          "Ils dorment tous. C'est une désertion ! Je fais sonner le réveil ?",
        choices: [
          { if: '!clairon_donne', text: 'Racontez-la-moi, à moi.', fx: { delay: 10, sat: 10 }, set: ['clairon_donne'], next: 'souvenirs_clairon' },
          { if: 'clairon_donne', text: 'Laissez-les dormir, sergent.', fx: { sat: 5 }, end: 'stay' },
          { text: 'Sonnez le réveil, sergent !', fx: { chaos: 10, sat: -5 }, end: 'stay' },
        ],
      },
      souvenirs_clairon: {
        show: 'clairon',
        give: ['clairon'],
        text:
          "… et voilà toute l'histoire. Vous avez écouté jusqu'au bout, soldat. " +
          "Prenez mon clairon. Moi, je n'ai plus le souffle.",
        end: 'stay',
      },
    },
  },

  melenchon: {
    name: 'Mélenchon',
    role: "Tribun. Le wagon, c'est lui.",
    dust: "La République, c'est moi ! Et la poussière… c'est moi aussi.",
    look: { skin: SKIN.light, hair: 'short', hairColor: '#b8b8b8', outfit: '#3a3a44', extra: 'glasses', mouth: 'flat' },
    voice: 130,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "Conducteur ! Ce train appartient au peuple. Et le peuple, c'est moi ! Je monte, je parle, " +
          'on vote. Mais ma voix ne porte plus : trois meetings ce matin, dont deux en hologramme.',
        choices: [
          { if: 'has:clairon', text: 'Prenez ce clairon, on vous entendra.', take: ['clairon'], fx: { sat: 5, delay: 5 }, next: 'tribune' },
          { if: '!has:clairon', text: 'Parlez moins fort, ça repose.', next: 'sans' },
          { text: 'Montez, mais pas de meeting à bord.', fx: { chaos: 5 }, set: ['melenchon_aboard'], end: 'board' },
        ],
      },
      tribune: {
        show: 'hologramme',
        text:
          "TARATATA ! Ça, c'est une sono ! Tenez, camarade : mon projecteur à hologramme. " +
          "Je n'en ai plus besoin, on m'entend jusqu'au terminus. Je monte !",
        choices: [
          { text: 'Montez, tribun.', give: ['hologramme'], fx: { chaos: 5 }, set: ['melenchon_aboard'], end: 'board' },
          { text: 'Restez haranguer le quai.', give: ['hologramme'], end: 'leave' },
        ],
      },
      sans: {
        text:
          'Me taire ? MOI ? Monsieur, je ne me tais pas, je reprends mon souffle. Bon. ' +
          "Vous me prenez ? Le wagon 3 n'a pas encore entendu mon programme.",
        choices: [
          { text: 'Montez. Programme court, alors.', fx: { chaos: 5 }, set: ['melenchon_aboard'], end: 'board' },
          { text: "Le wagon 3 s'en passera.", fx: { sat: -3 }, end: 'leave' },
        ],
      },
      assemblee: {
        text:
          "Camarade conducteur ! Le wagon 2 s'est constitué en assemblée. On a voté : le train " +
          'roulera à gauche. Et il leur faut un président. Ils hésitent entre moi et moi.',
        choices: [
          { text: 'Un train roule sur des rails. Assis.', fx: { sat: -3, chaos: -5 }, end: 'stay' },
          { text: 'Votons. Qui est pour ?', fx: { chaos: 10, sat: 5, delay: 10 }, end: 'stay' },
          { text: 'Vous avez ma voix, président.', ending: 'president' },
        ],
      },
      // À bord avec Zemmour : la guerre. Un oignon ou un clairon font la paix ; choisir un camp arrête le train.
      guerre: {
        text:
          "Conducteur ! Cet individu veut des banquettes en bois dans MON wagon ! — Votre wagon ? Avant, les wagons " +
          "n'étaient à personne, et c'était mieux ! — Arbitrez, camarade ! Le peuple vous regarde. Le peuple, c'est moi.",
        choices: [
          { if: 'has:oignon', text: "Une soupe à l'oignon. Pour deux.", take: ['oignon'], fx: { sat: 10, chaos: -10 }, set: ['paix'], next: 'paix_soupe' },
          { if: '!has:oignon & has:clairon', text: '(Sonner le clairon.) SILENCE !', fx: { sat: 5, chaos: -5 }, set: ['paix'], next: 'paix_clairon' },
          { if: '!has:oignon & !has:clairon', text: 'Chacun son côté de la voiture.', fx: { chaos: 5 }, set: ['guerre_froide'], end: 'stay' },
          { text: 'À gauche, toute !', ending: 'debat' },
          { text: 'À droite, toute !', ending: 'debat' },
        ],
      },
      paix_soupe: {
        text:
          '(Ils goûtent. Silence.) … Elle est bonne. — Elle est comme avant. — Elle est au peuple. — ' +
          'Bon. Trêve, camarade conducteur. Le temps de finir la marmite. Elle est grande.',
        end: 'stay',
      },
      paix_clairon: {
        text:
          '(Les deux se taisent, pour la première fois depuis 1998.) … Belle sono. — Bel instrument. ' +
          "D'époque. — On le partage : un discours chacun, à tour de rôle. Trêve, camarade conducteur.",
        end: 'stay',
      },
    },
  },

  scrat: {
    name: 'Scrat',
    role: 'Écureuil préhistorique. Un gland, vite.',
    dust: "(Il serre son gland très fort.) Skrii…",
    look: { skin: '#b9a184', hair: 'bald', hairColor: '#8a7358', outfit: '#b9a184', eyes: 'wide', mouth: 'flat' },
    voice: 320,
    start: 'intro',
    nodes: {
      intro: {
        text:
          '(Un écureuil aux yeux exorbités gratte le quai. Il te fixe. Il fixe ta poche. ' +
          'Il mime un gland, puis une fissure, puis la fin du monde.) Skriiii ?',
        choices: [
          { if: 'has:gland', text: '(Lui tendre le gland.)', take: ['gland'], fx: { sat: 10 }, next: 'gland_ok' },
          { if: '!has:gland', text: "Je n'ai pas de gland, désolé.", next: 'gland_non' },
          { text: '(Le laisser monter.)', fx: { chaos: 5 }, set: ['scrat_aboard'], end: 'board' },
        ],
      },
      gland_ok: {
        show: 'pierre',
        text:
          '(Il serre le gland, pleure, et te pousse en échange un caillou qui brille, déterré par ' +
          'erreur. Puis il plante le gland dans le quai. Le quai se fend.) Skri !',
        choices: [
          { text: "(L'emmener avant que tout casse.)", give: ['pierre'], set: ['scrat_aboard', 'scrat_repu'], end: 'board' },
          { text: '(Le laisser à son gland.)', give: ['pierre'], end: 'leave' },
        ],
      },
      gland_non: {
        text:
          '(Il s\'effondre. Il se relève. Il renifle vers le train : il y a un gland là-dedans, ' +
          'il le sent. Il te regarde avec espoir.) Skri ?',
        choices: [
          { text: '(Le laisser monter.)', fx: { chaos: 5 }, set: ['scrat_aboard'], end: 'board' },
          { text: '(Fermer la porte.)', fx: { sat: -3 }, end: 'leave' },
        ],
      },
      fissure: {
        text:
          '(Scrat a trouvé un gland sous un siège. Il essaie de le planter dans le plancher ' +
          "du wagon 2. Une fissure court déjà jusqu'au wagon-bar.) SKRIII !",
        choices: [
          { if: 'has:gland', text: '(Lui offrir le tien, à planter dehors.)', take: ['gland'], fx: { sat: 5 }, next: 'fissure_ok' },
          { if: '!has:gland', text: '(Lui montrer la fenêtre : dehors !)', fx: { chaos: 5 }, end: 'stay' },
          { text: '(Le laisser planter.)', ending: 'coupe' },
        ],
      },
      fissure_ok: {
        show: 'pierre',
        give: ['pierre'],
        text:
          '(Il lance les deux glands par la fenêtre et saute derrière. Trois secondes plus tard ' +
          "il remonte, ravi, avec un caillou qui brille. Il te l'offre.)",
        end: 'stay',
      },
    },
  },

  controleur: {
    name: 'Le Contrôleur',
    role: 'Verbalise tout ce qui bouge',
    look: { skin: SKIN.pale, hair: 'short', hairColor: '#555566', beard: 'mustache', hat: 'conductor', hatColor: '#262a33', outfit: '#4a4f5c', extra: 'glasses', mouth: 'flat' },
    voice: 120,
    start: 'intro',
    nodes: {
      intro: {
        text:
          'Contrôle. Votre train a onze infractions, dont « roule tout seul ». Je verbaliserais bien, ' +
          'mais mon stylo est à sec. Trente ans de service. Jamais vu ça.',
        choices: [
          { if: 'has:stylo', text: 'Prenez le mien.', take: ['stylo'], fx: { chaos: -5, delay: 10 }, next: 'verbalise' },
          { if: '!has:stylo', text: 'Quel dommage. Bonne journée.', fx: { chaos: 3 }, next: 'sec' },
          { text: 'On en reparle plus tard.', end: 'leave' },
        ],
      },
      verbalise: {
        show: 'carnet',
        give: ['carnet'],
        text:
          'Quatre couleurs ! Une par infraction. … Voilà, onze amendes. Ah. Dernière page. ' +
          'Gardez le carnet, il est plein. Je repasserai avant le Terminus. Par surprise.',
        end: 'leave',
      },
      sec: {
        text:
          "Hmm. Je note mentalement. J'ai une excellente mémoire. Vous êtes… le train bleu ? " +
          'Rouge ? Peu importe. Je repasserai avant le Terminus. Par surprise.',
        end: 'leave',
      },

      // Le contrôle surprise, sur la voie avant le Terminus (JUNCTIONS). Plus de huit à bord : il faut une
      // liasse (Jacky), un dossier (Maître Biquette) ou Hoggy Rider pour valider les billets. Sinon, tout le monde descend.
      controle: {
        text:
          'Contrôle surprise ! Capacité du train : huit voyageurs. Je recompte toujours deux fois. ' +
          'Trente ans de service, jamais une erreur de calcul. Voyons… un, deux…',
        choices: [
          { if: 'aboard<=8', text: 'Comptez. Nous sommes en règle.', fx: { sat: 5 }, next: 'regle' },
          { if: 'aboard<=8', text: 'Vous êtes monté comment, vous ?', fx: { chaos: 3 }, next: 'regle' },
          { if: 'aboard>8 & has:liasse', text: '(Glisser la liasse dans son carnet.)', take: ['liasse'], next: 'soudoye' },
          { if: 'aboard>8 & has:dossier', text: 'Mon avocate a un dossier.', take: ['dossier'], next: 'vice' },
          { if: 'aboard>8 & hoggy_aboard', text: 'Hoggy, tu valides les billets ?', next: 'valides' },
          { if: 'aboard>8 & !has:liasse & !has:dossier & !hoggy_aboard', text: 'Ils sont très serrés, voilà tout.', ending: 'embarques' },
          { if: 'aboard>8 & !has:liasse & !has:dossier & !hoggy_aboard & has:piece', text: "Deux euros, et on n'a rien vu ?", ending: 'embarques' },
          { if: 'aboard>8 & !has:liasse & !has:dossier & !hoggy_aboard & !has:piece', text: '(Cacher trois passagers sous ta casquette.)', ending: 'embarques' },
        ],
      },
      regle: {
        text:
          "… sept, huit. Pas un de plus. C'est suspect, un train en règle. Je note : « rien à noter ». " +
          "C'est la première fois que j'écris ça. Circulez.",
        end: 'stay',
      },
      soudoye: {
        text:
          '(Il recompte les billets. Puis les passagers. Puis les billets.) … Huit. ' +
          "J'en compte huit. Les autres sont des bagages. Bonne route, conducteur.",
        end: 'stay',
      },
      vice: {
        text:
          '(Il lit. Il pâlit.) Onze vices de procédure… dont un sur ma moustache ? Elle est très forte, ' +
          'votre chèvre. Contrôle annulé. Je ne suis jamais monté dans ce train.',
        end: 'stay',
      },
      valides: {
        text:
          '(Hoggy lève le pouce devant chaque passager.) « Validé. Validé. Validé. » … ' +
          "C'est irrégulier. Mais tous les billets sont validés. Je n'ai plus rien à contrôler.",
        end: 'stay',
      },
    },
  },
  chevre: {
    name: 'Maître Biquette',
    role: 'Chèvre. Avocate au barreau.',
    dust: "Objection ! Vice de procédure ! Je fais app…",
    look: { special: 'goat' },
    voice: 230,
    start: 'intro',
    nodes: {
      intro: {
        text:
          'Maître Biquette, avocate au barreau. Bêêê. Je défends les trains accusés à tort. ' +
          "Mes honoraires : du papier. J'en lis beaucoup. J'en mange un peu. C'est pareil.",
        choices: [
          { if: 'has:carnet', text: "J'ai un carnet d'amendes à contester.", take: ['carnet'], fx: { sat: 5, delay: 5 }, next: 'plaide' },
          { if: '!has:carnet', text: 'Montez, on trouvera du papier.', fx: { chaos: 3 }, set: ['chevre_aboard'], end: 'board' },
          { text: 'Pas de chèvre à bord, même diplômée.', fx: { sat: -5 }, end: 'leave' },
        ],
      },
      plaide: {
        show: 'dossier',
        text:
          '(Elle mâche le carnet page par page.) Mmh. Vice de forme. Vice de procédure. ' +
          'Petit goût de carbone. Voilà votre dossier : du béton. Je garde un coin pour la route.',
        choices: [
          { text: 'Montez, Maître.', give: ['dossier'], set: ['chevre_aboard'], end: 'board' },
          { text: 'Merci, Maître. Bon appétit.', give: ['dossier'], end: 'leave' },
        ],
      },
      // À bord, dès que le conducteur a le carnet du Contrôleur.
      dossier: {
        text:
          "Bêêê. Je sens du papier officiel. C'est un carnet de contraventions, ça ? " +
          'Onze amendes ? Confiez-le-moi. Je vais le lire de très, très près.',
        choices: [
          { if: 'has:carnet', text: 'Régalez-vous, Maître.', take: ['carnet'], fx: { sat: 5 }, next: 'dossier_ok' },
          { text: 'Non. Vous avez déjà mangé les horaires.', fx: { sat: -3 }, end: 'stay' },
        ],
      },
      dossier_ok: {
        show: 'dossier',
        give: ['dossier'],
        text:
          '(Elle dévore le carnet.) Onze amendes, onze vices de procédure. Voilà votre dossier. ' +
          'Au prochain contrôle, sortez-le et ne dites rien. Surtout, ne dites rien.',
        end: 'stay',
      },
      billets: {
        text:
          'Bêêê. Maître Biquette, pour la défense. Mes clients du wagon 1 n\'ont plus de billets. ' +
          'Ils ont été… consultés. Par moi. Il vous reste du papier ?',
        choices: [
          { text: 'Mangez les horaires, ils sont faux.', fx: { chaos: 5, sat: 5 }, end: 'stay' },
          { text: 'Objection : on ne mange pas les billets.', fx: { chaos: -5, sat: -3 }, end: 'stay' },
          { text: 'Vos clients paieront deux fois.', fx: { sat: -10 }, end: 'stay' },
        ],
      },
    },
  },

  zemmour: {
    name: 'Zemmour',
    role: 'Nostalgique. Tout était mieux avant.',
    dust: "Avant, on ne disparaissait pas comme ça. On prenait le temps…",
    look: { skin: SKIN.light, hair: 'bald', hairColor: '#8a8a90', outfit: '#23252e', mouth: 'flat' },
    voice: 150,
    start: 'intro',
    nodes: {
      intro: {
        text:
          'Conducteur. Avant, les trains étaient à vapeur, en retard, avec des banquettes en bois. ' +
          "C'était mieux. Aujourd'hui, même la soupe n'a plus de goût. Vous n'auriez pas un vrai légume d'ici ?",
        choices: [
          { if: 'has:oignon', text: "J'ai un oignon du marais.", take: ['oignon'], fx: { sat: 5, delay: 10 }, next: 'soupe' },
          { if: '!has:oignon', text: 'Montez, on en trouvera un en route.', fx: { sat: 3 }, set: ['zemmour_aboard'], end: 'board' },
          { text: 'Avant, vous seriez resté sur le quai.', fx: { sat: -5 }, end: 'leave' },
        ],
      },
      soupe: {
        show: 'boussole',
        text:
          "Un oignon du marais ! Un produit du terroir. Ça, c'était le bon temps. Tenez, ma boussole : " +
          'elle indique toujours la droite. Le nord, elle ne veut pas en entendre parler.',
        choices: [
          { text: 'Montez, monsieur Zemmour.', give: ['boussole'], set: ['zemmour_aboard'], end: 'board' },
          { text: 'Bon retour dans le passé.', give: ['boussole'], end: 'leave' },
        ],
      },
      // À bord, dès que le conducteur a l'oignon de Shrek.
      terroir: {
        text:
          'Attendez. Cette odeur… Ça sent ma jeunesse. Ça sent le potager. Vous avez un oignon sur vous ! ' +
          "Un vrai, avec de la terre dessus. Je n'en avais pas vu depuis 1974.",
        choices: [
          { if: 'has:oignon', text: 'Prenez-le, il est à vous.', take: ['oignon'], fx: { sat: 5 }, next: 'terroir_ok' },
          { text: "C'est mon oignon. Pas touche.", fx: { sat: -3 }, end: 'stay' },
        ],
      },
      terroir_ok: {
        show: 'boussole',
        give: ['boussole'],
        text:
          'Merci. Vous, vous respectez les traditions. Prenez ma boussole : elle indique toujours la droite. ' +
          "Je n'en ai plus besoin, je connais le chemin par cœur.",
        end: 'stay',
      },
      nostalgie: {
        text:
          "Conducteur ! J'ai trouvé une pelle et un sac de charbon dans la soute. Ce train électrique n'a pas d'âme. " +
          "Rendez-lui sa chaudière, sa suie, son retard d'antan. C'était mieux avant !",
        choices: [
          { text: 'Rangez cette pelle. Assis.', fx: { chaos: -5, sat: -3 }, end: 'stay' },
          { text: 'Un coup de sifflet à vapeur, pas plus.', fx: { chaos: 10, sat: 5, delay: 5 }, end: 'stay' },
          { text: 'Allez. Retour à la vapeur !', ending: 'vapeur' },
        ],
      },
      // La guerre reprend, si le conducteur les avait seulement séparés (drapeau guerre_froide).
      guerre: {
        text:
          "Conducteur ! Il a franchi la ligne ! J'avais tracé une frontière à la craie, au milieu de la voiture. " +
          '— Une frontière, dans un train du peuple ? — Avant, il y en avait une par wagon ! Tranchez.',
        choices: [
          { if: 'has:oignon', text: "Une soupe à l'oignon. Pour deux.", take: ['oignon'], fx: { sat: 10, chaos: -10 }, set: ['paix'], next: 'paix_soupe' },
          { if: '!has:oignon & has:clairon', text: '(Sonner le clairon.) SILENCE !', fx: { sat: 5, chaos: -5 }, set: ['paix'], next: 'paix_clairon' },
          { if: '!has:oignon & !has:clairon', text: "Votre ennemi commun, c'est le Contrôleur.", fx: { sat: 5, chaos: -5 }, set: ['paix'], next: 'paix_ennemi' },
          { text: 'Le tribun a raison.', ending: 'debat' },
          { text: 'Monsieur Zemmour a raison.', ending: 'debat' },
        ],
      },
      paix_soupe: {
        text:
          "(Il goûte. Il a la larme à l'œil.) C'est la soupe de ma grand-mère. — C'est la soupe du peuple ! — " +
          "… Pour une fois, c'est la même. Trêve. Resservez-moi.",
        end: 'stay',
      },
      paix_clairon: {
        text:
          "(Silence complet.) … Un clairon. Un vrai. Avant, on n'entendait que ça. — Le peuple aime la fanfare ! — " +
          "Alors nous sommes d'accord sur une chose. Une seule. Trêve.",
        end: 'stay',
      },
      paix_ennemi: {
        text:
          "Le Contrôleur… Il m'a verbalisé pour nostalgie en zone moderne. — Moi, pour meeting sans billet ! — " +
          'Monsieur, je vous serre la main. Contre lui seulement. — Contre lui. Trêve.',
        end: 'stay',
      },
    },
  },

  poilu: {
    name: 'Bruno',
    role: "N'est pas un ours. Sent quand même le fauve.",
    dust: "Je ne suis pas un ours ! Je suis… de la poussière ?",
    look: { skin: '#c89870', hair: 'curly', hairColor: '#2a1c14', beard: true, outfit: '#3a6a8a', build: 'big' },
    voice: 95,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "Salut. Bruno. Avant que vous parliez : je ne suis PAS un ours. Je suis brun, large, " +
          "et j'ai du poil. L'odeur ? C'est le miel. Trois contrôleurs m'ont refusé. « Pas d'ours à bord. »",
        choices: [
          { if: 'has:tondeuse', text: "J'ai une tondeuse. On règle ça ?", take: ['tondeuse'], fx: { sat: 5, delay: 5 }, next: 'tondu' },
          { if: '!has:tondeuse', text: 'Le règlement est formel. Désolé.', fx: { sat: -3 }, next: 'refus' },
          { text: "Monte vite, avant qu'on te voie.", fx: { chaos: 10 }, set: ['poilu_aboard', 'poilu_douce'], next: 'cache' },
        ],
      },
      tondu: {
        show: 'miel',
        text:
          '(Vingt minutes et trois sacs de poils plus tard.) Regardez-moi ça. Un homme ! Presque. ' +
          "Tenez, un pot de miel. J'en ai toujours sur moi. Ça ne veut rien dire.",
        choices: [
          { text: 'Bienvenue à bord, Bruno.', give: ['miel'], set: ['poilu_aboard'], end: 'board' },
          { text: 'Bonne route, Bruno.', give: ['miel'], end: 'leave' },
        ],
      },
      cache: {
        show: 'miel',
        give: ['miel'],
        text:
          "Merci, chef. Je me ferai tout petit. Enfin, j'essaierai. Tenez, un pot de miel. J'en ai toujours " +
          'sur moi. Ça ne veut rien dire. Et si on vous demande : je suis un monsieur en manteau.',
        end: 'board',
      },
      refus: {
        text:
          "Je m'en doutais. J'attendrai ici. Si vous trouvez de quoi me rendre présentable, " +
          'une tondeuse, un sécateur… Je ne grogne pas. Je soupire fort.',
        end: 'leave',
      },
      ours: {
        text:
          "(Hurlements au wagon 2.) Y'A UN OURS ! — Je ne suis PAS un ours ! Je cherchais " +
          'le wagon-bar ! Dites-leur, chef. Dites-leur que je suis un homme.',
        choices: [
          { text: "C'est un homme. Poilu, mais un homme.", fx: { sat: 5, chaos: -5 }, end: 'stay' },
          { text: "C'est un ours apprivoisé. Tout va bien.", fx: { chaos: 10, sat: 3 }, end: 'stay' },
          { text: 'Bruno, cache-toi dans la soute.', fx: { sat: -5 }, end: 'stay' },
        ],
      },
    },
  },

  // ─────────────────────────── Sur la voie ───────────────────────────
  zoro: {
    name: 'Zoro',
    role: "Sabreur. Trois sabres, aucun sens de l'orientation.",
    dust: "Tiens. Je me suis encore perdu. C'est par où, la fum…",
    look: { skin: SKIN.tan, hair: 'short', hairColor: '#4f9a4a', outfit: '#e8e4d8', mouth: 'flat' },
    voice: 140,
    start: 'voie',
    nodes: {
      voie: {
        text:
          "Hé. C'est bien le port, ici ? … Non ? Je marche tout droit depuis mardi. " +
          "Pas besoin de m'indiquer le chemin : je connais un raccourci. À gauche. L'autre gauche.",
        choices: [
          { text: 'Monte. Et ne touche à aucun aiguillage.', fx: { sat: 5 }, set: ['zoro_aboard'], end: 'board' },
          { text: 'Va pour ton raccourci.', fx: { chaos: 5, delay: 15 }, set: ['zoro_aboard', 'voie_sylve'], end: 'board' },
          { text: 'Le port est derrière toi. Bonne marche.', end: 'leave' },
        ],
      },
      // À bord, dès que le conducteur a la boussole de Zemmour.
      perdu: {
        text:
          "Je cherchais les toilettes. J'ai trouvé la locomotive, le toit, et un wagon qui n'existe pas. " +
          "C'est quoi, dans ta poche ? Ça montre un chemin ?",
        choices: [
          { if: 'has:boussole', text: 'Prends cette boussole.', take: ['boussole'], fx: { sat: 5 }, next: 'perdu_sabre' },
          { text: "Les toilettes sont derrière toi.", fx: { sat: 3 }, end: 'stay' },
          { text: "Reste assis. Je t'en supplie.", fx: { chaos: 3 }, end: 'stay' },
        ],
      },
      perdu_sabre: {
        show: 'sabre',
        give: ['sabre'],
        text:
          'Elle indique toujours la droite. Ça me va : je ne connaissais que la gauche. Prends un de mes sabres : ' +
          "il m'en reste deux, et j'ai que deux mains. Et une bouche. Mais passons.",
        end: 'stay',
      },
    },
  },

  thanos: {
    name: 'Thanos',
    role: 'Titan. Aime les choses équilibrées.',
    look: { skin: '#8a6ab0', hair: 'bald', hairColor: '#5a4580', build: 'big', outfit: '#3a4a8a', mouth: 'flat' },
    voice: 70,
    start: 'intro',
    nodes: {
      tunnel: {
        text:
          '(Une voix grave, dans le noir.) Conducteur. Il y a trop de wagons dans ce monde. ' +
          "Et il me manque une pierre. Prends l'embranchement : je t'attends dans ma grotte.",
        choices: [
          { text: 'Va pour la grotte.', fx: { delay: 10 }, set: ['voie_grotte'], end: 'stay' },
          { text: "Trop de wagons ? J'en ai trois.", fx: { sat: 3 }, end: 'stay' },
          { text: "Je n'obéis pas aux voix des tunnels.", end: 'stay' },
        ],
      },
      intro: {
        text:
          "Te voilà. Je suis Thanos. J'ai tout équilibré : mes chaussettes, mes impôts, l'univers. " +
          'Il me manque une pierre. Une seule. Je la sens sur toi… ou pas ?',
        choices: [
          { if: 'has:pierre', text: 'Celle de Scrat ? Prends-la.', take: ['pierre'], fx: { sat: 5 }, next: 'pierre_ok' },
          { if: '!has:pierre', text: "Je n'ai que des cailloux de ballast.", next: 'pierre_non' },
          { text: 'Claque des doigts, pour voir.', next: 'claque' },
        ],
      },
      pierre_ok: {
        show: 'gant',
        give: ['gant'],
        text:
          "Enfin. La collection est complète. Prends l'ancien gant, je n'en ai plus besoin. " +
          'Un claquement, et la moitié de tes ennuis disparaît. Choisis bien le moment.',
        end: 'leave',
      },
      pierre_non: {
        text:
          'Dommage. Sans la pierre, je ne suis qu\'un grand violet dans une grotte. ' +
          'Reviens avec. Ou ne reviens pas. Ce sera équilibré dans les deux cas.',
        end: 'leave',
      },
      claque: {
        text:
          'Tu y tiens ? Sans la dernière pierre, je ne choisis pas ce qui disparaît. ' +
          'La moitié de ton train, peut-être. Ou la moitié de toi.',
        choices: [
          { text: 'Claque.', snap: true, end: 'leave' },
          { text: 'Non, non. Garde tes doigts.', fx: { sat: 3 }, end: 'leave' },
        ],
      },
    },
  },

  lamine: {
    name: 'Lamine Yamal',
    role: 'Ailier. 17 ans, blond platine.',
    dust: "Chef, mon match ! Dites-leur que j'étais pas hors-j…",
    look: { skin: SKIN.brown, hair: 'platinum_curls', hairColor: '#e8dcae', jersey: ['#8a1c3c', '#1c3a8a'], number: 10, mouth: 'flat' },
    voice: 200,
    dest: 'stade',
    start: 'course',
    nodes: {
      course: {
        text:
          '(Un gamin court à côté du train, balle au pied, sans forcer.) Chef ! J\'ai match au Stade ' +
          'de Nulle-Part. Et ma teinture vire au jaune poussin. Vous me déposez ?',
        choices: [
          { if: 'has:decolorant', text: "Monte. J'ai du décolorant platine.", take: ['decolorant'], fx: { sat: 10 }, set: ['lamine_aboard', 'voie_stade'], next: 'blond' },
          { if: '!has:decolorant', text: 'Monte, on file au stade.', fx: { sat: 5 }, set: ['lamine_aboard', 'voie_stade'], end: 'board' },
          { text: 'Je ne fais pas taxi. Cours.', end: 'leave' },
        ],
      },
      blond: {
        show: 'ballon',
        give: ['ballon'],
        text:
          'Blond polaire ! Chef, vous sauvez mon match. Tenez, le ballon : j\'en aurai un autre ' +
          "là-bas. Gardez-le bien, y'en a un qui les réclame tous.",
        end: 'board',
      },
      finale: {
        text:
          'On y est ! Chef, il nous manque un joueur. Le gardien s\'est perdu : un type à trois sabres ' +
          'lui a indiqué le chemin. Vous prenez les cages ?',
        choices: [
          { text: 'Je prends les cages !', fx: { sat: 15, delay: 15 }, next: 'victoire' },
          { if: 'chaos>=30', text: 'Le train joue à ma place !', ending: 'mercato' },
          { text: 'Je conduis des trains, pas des équipes.', end: 'leave' },
        ],
      },
      victoire: {
        text:
          '(90e minute. Tu arrêtes un penalty avec ta casquette.) CHAMPIONS ! Chef, vous êtes ' +
          'le meilleur gardien-conducteur du monde. Et le seul.',
        choices: [
          { text: 'Monte avec la coupe, champion !', fx: { sat: 5 }, end: 'board' },
        ],
      },
    },
  },

  // ─────────────────────────── Liés à un lieu ───────────────────────────
  shrek: {
    name: 'Shrek',
    role: 'Ogre. Veut la paix dans son marais.',
    dust: "Enfin la paix. C'est tout ce que je demand…",
    look: { skin: '#7fa04a', hair: 'bald', hairColor: '#3a4a20', build: 'big', ears: 'ogre', outfit: '#8a6a4a', mouth: 'flat' },
    voice: 90,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "Qu'est-ce que vous faites dans mon marais ?! … Une gare ? Depuis quand ? Et eux, là, " +
          'sur MON quai ? Trois cochons, un loup en chemise de nuit et un âne qui parle !',
        choices: [
          { text: 'Je les embarque. Vous serez tranquille.', fx: { sat: 5, chaos: 10, delay: 10 }, add: 5, next: 'merci' },
          { text: 'Joli marais. Je peux rester ?', next: 'rester' },
          { text: "C'est votre marais, pas le mien.", fx: { sat: -5 }, end: 'leave' },
        ],
      },
      merci: {
        show: 'oignon',
        text:
          "Enfin le calme ! Tenez : un oignon. Les ogres, c'est comme les oignons : ça paie ses dettes. Non. " +
          "C'est pas ça. Attendez… l'âne est dans VOTRE train ? Il va chanter. Il chante toujours.",
        choices: [
          { text: 'Profitez du calme, Shrek.', give: ['oignon'], end: 'leave' },
          { text: 'Montez le surveiller, alors.', give: ['oignon'], fx: { chaos: 5 }, set: ['shrek_aboard'], end: 'board' },
        ],
      },
      // À bord avec Bruno : la guerre des odeurs.
      odeurs: {
        text:
          'CONDUCTEUR ! Ça sent le fauve dans MON wagon ! — Je ne suis pas un ours. — Chez moi, on appelle ça ' +
          'une déclaration de guerre. Et je sens PIRE quand je veux. Regardez. Enfin, respirez.',
        choices: [
          { if: 'has:decolorant', text: 'Du décolorant. Ça désinfecte tout.', take: ['decolorant'], fx: { sat: 5, chaos: -5 }, next: 'odeurs_blonds' },
          { if: '!has:decolorant & has:tondeuse', text: 'Bruno, on passe à la tondeuse.', take: ['tondeuse'], fx: { sat: 5 }, next: 'odeurs_tondu' },
          { if: '!has:decolorant & !has:tondeuse', text: 'Ouvrez les fenêtres. Toutes.', fx: { sat: -3, chaos: 5, delay: 5 }, end: 'stay' },
          { text: 'Que le meilleur gagne !', ending: 'asphyxie' },
          { text: '(Retenir ta respiration et attendre.)', ending: 'asphyxie' },
        ],
      },
      odeurs_blonds: {
        text:
          '(Dix minutes plus tard : deux blonds platine qui sentent la piscine municipale.) Ça pique. ' +
          'Mais ça sent le propre. — Je ne suis pas un ours, je suis un surfeur. — Trêve, le surfeur.',
        end: 'stay',
      },
      odeurs_tondu: {
        text:
          "(Trois sacs de poils plus tard.) Il ne sent plus rien. J'ai gagné. — Tu n'as pas gagné, " +
          "tu n'as plus d'adversaire. — C'est pareil. — Je ne suis toujours pas un ours.",
        end: 'stay',
      },
      rester: {
        text:
          "Rester ? Dans MON marais ? … Y'a une souche de libre. Mais vous lâchez votre train, " +
          'vous mangez ce que je cuisine, et on ne parle pas avant midi.',
        choices: [
          { text: 'Marché conclu.', ending: 'marais' },
          { text: "Finalement, j'ai un train à conduire.", end: 'leave' },
        ],
      },
    },
  },

  gabin: {
    name: 'Jean Gabin',
    role: 'Monstre sacré. En noir et blanc, même la nuit.',
    dust: "Belle sortie. Sobre. Pas de musique, surtout. Coup…",
    look: { skin: '#c8c8c8', hair: 'short', hairColor: '#e4e4e4', hat: 'cap', hatColor: '#4a4a4a', outfit: '#6a6a6a', mouth: 'flat' },
    voice: 100,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "T'as d'beaux rails, tu sais. J'ai conduit une locomotive, moi, môme. En 38. Au cinéma, " +
          'mais les mains noires, c\'était du vrai. Tu m\'emmènes ? Je paie pas : je suis en noir et blanc.',
        choices: [
          { text: "Montez, monsieur Gabin. C'est un honneur.", fx: { sat: 10 }, set: ['gabin_aboard'], end: 'board' },
          { text: 'Tout le monde paie. Même les légendes.', fx: { sat: -3 }, next: 'paie' },
          { text: 'Désolé, on ne prend que la couleur.', fx: { sat: -5 }, end: 'leave' },
        ],
      },
      paie: {
        text:
          "Payer ? Môme, j'ai tourné quatre-vingt-quinze films. Les billets, c'est les autres " +
          'qui me les prennent. Bon. Je te signe un autographe. En noir, forcément.',
        choices: [
          { text: "Va pour l'autographe. Montez.", fx: { sat: 5 }, set: ['gabin_aboard'], end: 'board' },
          { text: 'Alors restez à quai.', end: 'leave' },
        ],
      },
      cabine: {
        text:
          'Pousse-toi, môme. Une loco, ça se conduit à la gueule, pas avec des boutons. ' +
          "… Dis donc, tout devient gris, ici. C'est moi qui déteins ?",
        choices: [
          { text: 'La cabine est à moi. Allez vous asseoir.', fx: { sat: -3 }, end: 'stay' },
          { text: 'Montrez-moi comment on faisait en 38.', fx: { sat: 5, chaos: 5, delay: 10 }, end: 'stay' },
          { text: 'Moteur… action !', ending: 'cinema' },
        ],
      },
    },
  },

  hoggy: {
    name: 'Hoggy Rider',
    role: 'Supporter torse nu. Il valide tout.',
    dust: "Disparaître ? Validé. (Son pouce part en dernier.)",
    look: { skin: SKIN.dark, hair: 'short', hairColor: '#141014', beard: true, outfit: '#1f8a7a', mouth: 'grin' },
    voice: 110,
    start: 'intro',
    nodes: {
      intro: {
        text:
          '(Pouce levé.) Chef ! Hoggy Rider. Le match ? Validé. Votre train ? Validé. Votre casquette ? Validée. ' +
          "Il me manque juste un ballon, pour lancer la ola. Tout seul, c'est long. Vous en avez un ?",
        choices: [
          { if: 'has:ballon', text: 'Tiens. Il est à toi.', take: ['ballon'], fx: { sat: 10 }, next: 'ballon_ok' },
          { if: '!has:ballon', text: 'Non. Mais monte, si tu veux.', fx: { chaos: 5 }, set: ['hoggy_aboard'], end: 'board' },
          { text: 'Tu valides tout ? Tiens le volant.', ending: 'valide' },
        ],
      },
      ballon_ok: {
        show: 'bracelet',
        text:
          'VALIDÉ ! Vous, vous êtes un bon. Tenez, mon bracelet doré : levez le pouce avec, et même le retard ' +
          "est validé. Je peux monter ? Je n'ai jamais validé un train de l'intérieur.",
        choices: [
          { text: 'Monte, Hoggy.', give: ['bracelet'], fx: { chaos: 5 }, set: ['hoggy_aboard'], end: 'board' },
          { text: 'Garde le stade, champion.', give: ['bracelet'], end: 'leave' },
        ],
      },
    },
  },
  messi: {
    name: 'Messi',
    role: 'Le plus grand. Mesure 1 m 69.',
    dust: "(Il hausse les épaules, sourit, et s'efface sans un mot.)",
    look: { skin: SKIN.light, hair: 'short', hairColor: '#5a3a24', beard: true, jersey: ['#8cc8f0', '#f4f4f4'], number: 10, mouth: 'flat' },
    voice: 160,
    start: 'intro',
    nodes: {
      intro: {
        text:
          '(Un petit barbu très calme regarde ses pieds.) Hola. Je cherche de l\'eau chaude pour mon maté. ' +
          "Ici, tout pétille. Je suis fatigué. J'ai gagné tout ce qui existe.",
        choices: [
          { if: 'has:thermos', text: 'Un thermos bien chaud, ça ira ?', take: ['thermos'], fx: { sat: 10 }, next: 'mate' },
          { if: '!has:thermos', text: "Je n'ai que de l'eau froide.", next: 'froid' },
          { text: 'Vous êtes Messi ?! Un autographe !', fx: { sat: 5, delay: 10 }, next: 'autographe' },
        ],
      },
      mate: {
        show: 'ballon_or',
        give: ['ballon_or'],
        text:
          "Gracias. C'est du café, mais c'est chaud. Tiens, prends ça : un Ballon d'or. " +
          "J'en ai huit, ça prend la poussière, et ma femme veut de la place.",
        end: 'leave',
      },
      froid: {
        text:
          "No pasa nada. J'attendrai. J'ai l'habitude d'attendre : les défenseurs mettent " +
          'toujours du temps à se relever.',
        end: 'leave',
      },
      autographe: {
        text:
          '(Il signe ta casquette, poliment, en regardant ailleurs.) Voilà. Si tu trouves ' +
          "de l'eau chaude… je serai là. Ou en finale. Souvent en finale.",
        end: 'leave',
      },
    },
  },

  pigeon: {
    name: 'Le Roi Pigeon',
    role: 'Roucoul III, monarque des toits',
    dust: "Rou… rou… (Une plume retombe.)",
    look: { special: 'pigeon' },
    voice: 260,
    start: 'intro',
    nodes: {
      intro: {
        text:
          'Rrrou. Nous, Roucoul III, roi des pigeons, des toits et des statues. Nos sujets nous ' +
          'couvrent de miettes. Des miettes ! Nous voulons du sucré. Qu\'as-tu pour ton roi ?',
        choices: [
          { if: 'has:miel', text: 'Un pot de miel, Majesté.', take: ['miel'], fx: { sat: 10 }, next: 'miel_ok' },
          { if: '!has:miel', text: 'Rien, Majesté. Des miettes.', fx: { chaos: 5, delay: 5 }, next: 'miettes' },
          { text: 'Je m\'incline. Le train est à vous.', ending: 'roi_pigeon' },
        ],
      },
      miel_ok: {
        show: 'medaille',
        give: ['medaille'],
        text:
          'Rrrou ! Du miel ! Notre bec colle, notre cœur aussi. Prends ceci dans le trésor royal : ' +
          'une médaille, volée à un sergent en 1962. Il courait moins vite que nous.',
        end: 'leave',
      },
      miettes: {
        text:
          'Des miettes. Encore. Va, manant. Mais sache que nos sujets visent très bien, ' +
          'et que ton train est très propre. Pour l\'instant.',
        end: 'leave',
      },
    },
  },

  // ─────────────────────────── La ronde de Clara ───────────────────────────
  // Clara, la poule de bord, fait sa ronde entre deux gares (FINDS dans items.js) : elle montre trois endroits,
  // le conducteur en fouille un. Toucher au billet qu'elle garde sous l'aile arrête la partie.
  ronde: {
    name: 'Clara',
    role: 'Poule de bord. Elle couve ses baskets.',
    finds: true,
    look: { skin: '#c8642a', hair: 'short', hairColor: '#c8642a', outfit: '#f2f2f2' },
    voice: 260,
    start: 'premiere',
    nodes: {
      premiere: {
        text:
          'Cot ? (Clara, la poule de bord, fait sa ronde, assise sur ses baskets. Le train roule tout seul : ' +
          "tu as le temps de fouiller un endroit. Elle t'en montre trois du bec.)",
        choices: [
          { text: 'Le bac des objets trouvés', next: 'trouve_stylo' },
          { text: 'Le wagon-bar', next: 'trouve_thermos' },
          { text: 'Sous les sièges du wagon 2', next: 'trouve_gland' },
        ],
      },
      deuxieme: {
        text:
          'Cot cot. (Le train file entre les arbres. Clara glisse dans le couloir sans quitter ses baskets. ' +
          'Tu as encore le temps de fouiller un endroit.)',
        choices: [
          { if: '!has:thermos', text: 'Le wagon-bar', next: 'trouve_thermos' },
          { if: 'has:thermos', text: 'Le wagon-bar', next: 'rien_bar' },
          { if: '!has:chargeur', text: 'Ta propre cabine', next: 'trouve_chargeur' },
          { if: 'has:chargeur', text: 'Ta propre cabine', next: 'rien_cabine' },
          { if: '!has:piece', text: 'Le distributeur en panne', next: 'trouve_piece' },
          { if: 'has:piece', text: 'Le distributeur en panne', next: 'rien_distributeur' },
        ],
      },
      troisieme: {
        text:
          "Cot. (Rien à l'horizon. Clara refait le tour des wagons, un billet coincé sous l'aile. " +
          'Personne ne sait pour quelle gare. Où regardes-tu ?)',
        choices: [
          { if: '!has:gland', text: 'Sous les sièges du wagon 2', next: 'trouve_gland' },
          { if: 'has:gland', text: 'Sous les sièges du wagon 2', next: 'rien_sieges' },
          { if: '!has:chargeur', text: 'Ta propre cabine', next: 'trouve_chargeur' },
          { if: 'has:chargeur', text: 'Ta propre cabine', next: 'rien_cabine' },
          { if: '!has:piece', text: 'Le distributeur en panne', next: 'trouve_piece' },
          { if: 'has:piece', text: 'Le distributeur en panne', next: 'rien_distributeur' },
        ],
      },
      derniere: {
        text:
          "Cot… (La nuit est tombée. Dernière ronde avant le bout de la ligne. Clara s'est endormie sur ses baskets. " +
          'Son billet dépasse de son aile. Où regardes-tu ?)',
        choices: [
          { if: '!has:chargeur', text: 'Ta propre cabine', next: 'trouve_chargeur' },
          { if: 'has:chargeur', text: 'Ta propre cabine', next: 'rien_cabine' },
          { if: '!has:piece', text: 'Le distributeur en panne', next: 'trouve_piece' },
          { if: 'has:piece', text: 'Le distributeur en panne', next: 'rien_distributeur' },
          { text: '(Prendre le billet sous son aile.)', ending: 'picore' },
        ],
      },

      trouve_stylo: {
        show: 'stylo',
        give: ['stylo'],
        text: 'Un parapluie cassé, une chaussette seule, et un stylo quatre couleurs. Trois sur quatre marchent : tu le prends. Clara approuve. Cot.',
        end: 'stay',
      },
      trouve_thermos: {
        show: 'thermos',
        give: ['thermos'],
        text: 'Derrière le comptoir, un thermos de café. Encore brûlant. Personne ne tient le bar depuis des années. Clara regarde ailleurs.',
        end: 'stay',
      },
      trouve_gland: {
        show: 'gland',
        give: ['gland'],
        text: 'Des miettes, un ticket de 2014, et un gland. Un gland parfait. Clara le lorgne. Très loin, tu crois entendre un petit cri aigu.',
        end: 'stay',
      },
      trouve_chargeur: {
        show: 'chargeur',
        give: ['chargeur'],
        text: "Dans le tiroir du tableau de bord : un chargeur de téléphone. Le câble est picoré, mais il charge. Tu n'as pas de téléphone.",
        end: 'stay',
      },
      trouve_piece: {
        show: 'piece',
        give: ['piece'],
        text: "Clara donne un coup de bec dans le distributeur. Il rend une pièce de deux euros. C'est la première chose qu'il rend de sa vie.",
        end: 'stay',
      },
      rien_bar: { text: 'Le comptoir est vide. Tu as déjà le thermos : le bar ne fait pas deux miracles par trajet. Cot.', end: 'stay' },
      rien_cabine: { text: 'Ton tiroir est vide. Tu as déjà pris le chargeur. Il reste un trombone. Clara le prend.', end: 'stay' },
      rien_distributeur: { text: 'Tu secoues le distributeur. Il clignote, moqueur. Tu as déjà sa pièce : il ne donnera rien de plus.', end: 'stay' },
      rien_sieges: { text: "Sous les sièges : des miettes et un ticket de 2014. Le gland, tu l'as déjà dans la poche. Clara mange les miettes.", end: 'stay' },
    },
  },

  // ─────────────────────────── Ceux qui reviennent ───────────────────────────
  // Jacky, recalé par Kimberley, revient en hélicoptère (incidents retour_riche et retour_vire).
  riche: {
    name: 'Jacky',
    role: 'Milliardaire. Depuis mardi.',
    look: { skin: SKIN.pale, hair: 'short', hairColor: '#5a4a3a', outfit: '#1c1c22', mouth: 'grin' },
    voice: 190,
    start: 'retour',
    nodes: {
      retour: {
        text:
          "(Un hélicoptère se pose sur le wagon 2.) Chef ! C'est Jacky. Kimberley m'a recalé, alors j'ai revendu " +
          "le camion. Puis ce qu'il y avait dedans. Puis l'autoroute. Je suis milliardaire depuis mardi.",
        choices: [
          { if: 'jacky_ami', text: 'Jacky ! Content pour toi.', fx: { sat: 5 }, next: 'cadeau' },
          { if: 'jacky_ami', text: 'Et Kimberley, alors ?', next: 'kim' },
          { if: '!jacky_ami', text: 'Tu… tu me reconnais ?', next: 'froid' },
          { if: '!jacky_ami', text: "T'aurais pas deux euros ?", next: 'deux_euros' },
        ],
      },
      kim: {
        text:
          "Elle m'a débloqué. Elle a vu l'hélico dans un live. Alors c'est moi qui l'ai bloquée. Avec mon bras. " +
          "Enfin, celui de mon garde du corps. On s'aime de loin, c'est plus sain.",
        choices: [{ text: 'Bien joué, Jacky.', next: 'cadeau' }],
      },
      cadeau: {
        show: 'liasse',
        give: ['liasse'],
        text:
          "T'as été réglo quand j'étais rien, chef. Jacky oublie pas. Tiens, une liasse. Si un contrôleur t'embête, " +
          "glisse-la dans son carnet : ça l'aide à recompter. Allez, j'ai un pays à acheter.",
        end: 'stay',
      },
      froid: {
        show: 'piece',
        give: ['piece'],
        text:
          "Vaguement. T'étais ni gentil ni méchant. T'étais un conducteur. Tiens, deux euros. Pour un sandwich. " +
          "Un sandwich très urgent. Allez, j'ai un pays à acheter.",
        end: 'stay',
      },
      deux_euros: {
        show: 'piece',
        give: ['piece'],
        text: "(Il rit. Son garde du corps rit aussi, sur ordre.) Elle est bonne, chef. Tiens. Deux euros. Garde la monnaie : y'en a pas.",
        end: 'stay',
      },
      // Si on l'a humilié : il a racheté la compagnie. Seuls deux euros le calment.
      vire: {
        text:
          "(Un hélicoptère se pose sur le wagon 2.) Chef. Tu me remets ? Jacky. « Regarde-toi », tu m'avais dit. " +
          "Je me suis regardé. Puis j'ai racheté le miroir, l'usine de miroirs, et ta compagnie.",
        choices: [
          { if: 'has:piece', text: 'Tiens. Deux euros. Pour le sandwich.', take: ['piece'], fx: { sat: 5 }, next: 'pardon' },
          { text: 'Jacky ! Mon vieil ami !', ending: 'licencie' },
          { text: "T'aurais pas deux euros ?", ending: 'licencie' },
        ],
      },
      pardon: {
        text:
          "(Il regarde la pièce. Longtemps.) … Personne me les avait jamais donnés. Bon. T'es pas viré. " +
          "Mais t'auras rien non plus. On est quittes, chef. Bon voyage.",
        end: 'stay',
      },
    },
  },

  // Sur le quai du Terminus : le conducteur, quarante ans plus tard. Lui seul mène à la vraie fin.
  vieux: {
    name: 'Toi (dans 40 ans)',
    role: 'Conducteur. Le même, en plus vieux.',
    look: { skin: SKIN.light, hair: 'short', hairColor: '#e8e8e8', beard: true, hat: 'conductor', hatColor: '#7a2f2f', outfit: '#7a2f2f', mouth: 'smile' },
    voice: 100,
    start: 'intro',
    nodes: {
      intro: {
        text:
          "Te voilà. Ne cherche pas la gare : il n'y en a pas. Regarde-moi bien. La casquette. Le nez. " +
          "Je suis toi, dans quarante ans. Et je suis venu te dire une chose : le terminus n'existe pas.",
        choices: [
          { text: "Comment ça, il n'existe pas ?", next: 'verite' },
          { text: 'Tu es une hallucination.', next: 'hallucination' },
          { text: 'Je fais demi-tour. Tout de suite.', ending: 'boucle' },
        ],
      },
      hallucination: {
        text:
          "Possible. Tu n'as pas dormi depuis Saint-Banal. Mais une hallucination ne connaîtrait pas ta cachette " +
          'à biscuits, derrière le frein. … Voilà. Maintenant, écoute-moi.',
        choices: [{ text: "D'accord. J'écoute.", next: 'verite' }],
      },
      verite: {
        text:
          "Le terminus, on l'a inventé pour que les gens montent. Personne ne prend un train qui ne va nulle part. " +
          "Mais regarde-les : ils ont ri, ils se sont battus, ils ont voyagé. Il n'y a rien au bout. Il y a la route.",
        choices: [
          { text: 'Alors je continue de rouler.', fx: { sat: 5 }, end: 'terminus' },
          { text: 'Tu mens. Je veux voir le terminus.', ending: 'neant' },
          { text: 'Prends le volant. Moi, je m\'assois.', ending: 'retraite' },
        ],
      },
    },
  },
};
