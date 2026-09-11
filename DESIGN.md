---
name: RFP Analyzer
description: L'atelier — fond gris, panneaux blancs, un seul bleu ardoise, bouton d'action en encre, Geist et chiffres mono, chapitres à icône et rails repliables.
colors:
  fond: "hsl(240 6% 97%)"
  panneau: "hsl(0 0% 100%)"
  rail: "hsl(0 0% 98%)"
  encre: "hsl(240 4% 9%)"
  encre-grise: "hsl(240 4% 40%)"
  second-plan: "hsl(240 5% 95%)"
  filet: "hsl(240 5% 90%)"
  filet-saisie: "hsl(240 5% 85%)"
  ardoise: "hsl(217 38% 48%)"
  ardoise-texte: "hsl(217 40% 34%)"
  lavis-ardoise: "hsl(217 45% 94%)"
  action: "hsl(240 4% 9%)"
  alerte: "hsl(3 62% 46%)"
  conforme: "hsl(150 50% 34%)"
  conforme-lavis: "hsl(150 40% 94%)"
  partiel: "hsl(38 80% 38%)"
  partiel-lavis: "hsl(40 70% 93%)"
  non-conforme: "hsl(3 62% 46%)"
  non-conforme-lavis: "hsl(3 60% 95%)"
  roadmap: "hsl(258 38% 50%)"
  roadmap-lavis: "hsl(258 35% 95%)"
  a-evaluer: "hsl(240 4% 55%)"
  a-evaluer-lavis: "hsl(240 5% 94%)"
  echelle-0: "hsl(240 5% 94%)"
  echelle-1: "hsl(217 40% 90%)"
  echelle-2: "hsl(217 40% 80%)"
  echelle-3: "hsl(217 40% 66%)"
  echelle-4: "hsl(217 40% 50%)"
  echelle-5: "hsl(217 42% 36%)"
  fond-charbon: "hsl(220 6% 7%)"
  panneau-charbon: "hsl(220 5% 10%)"
  encre-claire: "hsl(220 6% 92%)"
  ardoise-claire: "hsl(214 62% 70%)"
  lavis-ardoise-sombre: "hsl(216 30% 19%)"
  filet-charbon: "hsl(220 5% 17%)"
typography:
  headline:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
  subtitle:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "20px"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "-0.005em"
    fontFeature: "tnum"
  reading:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "19px"
  label:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  meta:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "14px"
  article-no:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0"
  figure:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "16px"
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
spacing:
  "0.5": "2px"
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "2.5": "10px"
  "3": "12px"
  "3.5": "14px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  barre-laterale: "232px"
  barre-laterale-repliee: "56px"
  file: "300px"
  file-repliee: "44px"
  barre-mobile: "44px"
  accueil-max: "1200px"
  colonne-activite: "340px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.panneau}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "hsl(240 4% 9% / 0.9)"
  button-outline:
    backgroundColor: "{colors.fond}"
    textColor: "{colors.ardoise-texte}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.lavis-ardoise}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ardoise-texte}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.lavis-ardoise}"
  button-dim:
    backgroundColor: "transparent"
    textColor: "{colors.encre-grise}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-dim-hover:
    textColor: "{colors.encre}"
  button-destructive:
    backgroundColor: "{colors.alerte}"
    textColor: "{colors.panneau}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-sm:
    height: "32px"
    padding: "0 10px"
    typography: "{typography.label}"
  button-xs:
    height: "28px"
    padding: "0 8px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.fond}"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
    typography: "{typography.reading}"
  textarea:
    backgroundColor: "{colors.fond}"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "60px"
    typography: "{typography.reading}"
  panel:
    backgroundColor: "{colors.panneau}"
    textColor: "{colors.encre}"
    rounded: "{rounded.lg}"
    padding: "16px"
  panel-header:
    backgroundColor: "{colors.panneau}"
    textColor: "{colors.encre}"
    padding: "10px 16px"
    typography: "{typography.body}"
  stamp:
    backgroundColor: "{colors.second-plan}"
    textColor: "{colors.encre}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
    typography: "{typography.label}"
  badge:
    backgroundColor: "{colors.encre}"
    textColor: "{colors.fond}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
    typography: "{typography.label}"
  rail-item:
    backgroundColor: "transparent"
    textColor: "{colors.encre-grise}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
    typography: "{typography.body}"
  rail-item-hover:
    backgroundColor: "hsl(217 45% 94% / 0.6)"
    textColor: "{colors.encre}"
  rail-item-active:
    backgroundColor: "{colors.lavis-ardoise}"
    textColor: "{colors.encre}"
  queue-row:
    backgroundColor: "transparent"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    typography: "{typography.body}"
  queue-row-selected:
    backgroundColor: "{colors.lavis-ardoise}"
  score-cell:
    backgroundColor: "{colors.fond}"
    textColor: "{colors.encre}"
    height: "32px"
    width: "34px"
    typography: "{typography.body}"
  score-cell-manual:
    backgroundColor: "{colors.ardoise}"
    textColor: "{colors.panneau}"
  score-cell-ai:
    backgroundColor: "{colors.lavis-ardoise}"
    textColor: "{colors.ardoise-texte}"
  heatmap-cell:
    rounded: "{rounded.sm}"
    height: "36px"
    typography: "{typography.body}"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.encre-grise}"
    height: "36px"
    padding: "0 2px"
    typography: "{typography.body}"
  tab-active:
    textColor: "{colors.encre}"
  dialog:
    backgroundColor: "{colors.fond}"
    textColor: "{colors.encre}"
    rounded: "{rounded.lg}"
    padding: "24px"
    width: "512px"
  popover:
    backgroundColor: "{colors.panneau}"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    padding: "16px"
    width: "288px"
  menu-item:
    backgroundColor: "transparent"
    textColor: "{colors.encre}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
    typography: "{typography.body}"
  menu-item-focus:
    backgroundColor: "{colors.lavis-ardoise}"
    textColor: "{colors.ardoise-texte}"
---

# Design System: RFP Analyzer

## Overview

**Creative North Star: « L'atelier »**

L'interface est un plan de travail : un fond gris clair sur lequel sont posés des panneaux blancs, chacun un objet net (rayon 8 px, filet de 1 px, ombre d'un pixel). La structure du dossier de consultation est conservée (D-05, D-07, D-08, D-09, D-12) : une consultation reste un sommaire de chapitres (Préparation, Analyse IA, Évaluation, Décision, Restitution), ses domaines et ses exigences restent des articles à code mono (`REQ-FUN`, `R-12`). L'interface ne se numérote plus elle-même (D-16) : chaque chapitre porte une icône Lucide qui l'identifie, jusque dans le sommaire replié, et le mono est rendu aux seuls codes du référentiel client. Ce qui a changé avec la direction « Atelier » (D-15), c'est la surface : les filets pleine largeur ont laissé place au panneau comme unique conteneur, les tampons carrés à des pastilles à point coloré, Source Sans 3 à Geist Sans et Geist Mono, la barre supérieure à une barre latérale de 232 px qui porte l'organisation, la navigation et le compte.

Un seul accent, le bleu ardoise : sélection courante, progression, liens de renvoi, note manuelle. Le bouton d'action primaire n'est pas bleu : il est en encre pleine, ce qui le rend visible sans concurrencer la sélection. Les quatre couleurs d'état existent en teinte et en lavis mais ne portent jamais un fond de pastille : la pastille reste grise, seul son point de 7 px prend la couleur. La hiérarchie tient à la taille, à la graisse (400 / 500 / 600) et au mono : tout ce qui est code ou chiffre passe en Geist Mono à chiffres tabulaires. La densité est celle d'un outil utilisé plusieurs heures par jour : corps 13 px, lignes de 28 à 36 px, panneaux latéraux repliables au clavier (`[` et `]`) pour rendre l'écran aux colonnes de réponse.

Le mouvement est réduit à ce qui informe : 150 ms de couleur ou de bordure sur changement d'état, 150 ms de largeur quand un rail se replie, 150 à 200 ms de fondu et de glissement pour ce qui flotte, 500 ms de largeur pour une barre de progression. Aucune séquence d'entrée, aucune translation au survol ; `prefers-reduced-motion` neutralise tout. Refus confirmés par D-15 et par le code : plus de tampons carrés, plus de capitales espacées en en-tête de tableau, plus de barre supérieure, plus de numérotation que l'interface se donne à elle-même (D-16), pas de dégradés ni d'ombre portée sur une surface au repos, pas de couleur seule pour un état, pas de ton promotionnel.

**Key Characteristics:**
- Fond gris `fond` et panneaux blancs `.panel` (rayon 8 px, filet, ombre 1 px) comme unique conteneur ; barre latérale et pieds de colonne sur `rail`.
- Un accent, l'ardoise, pour la sélection (`lavis-ardoise`), la progression et la note manuelle ; le bouton d'action est en encre pleine.
- Geist Sans 13 px pour le texte, Geist Mono pour les codes du référentiel client (`.article-no`, 12 px 500 gris) et les chiffres (`.num`, tabulaires).
- Pastilles d'état `.stamp` : pilule grise de 22 px, point coloré de 7 px, libellé 12 px 500 ; points d'état de 8 px dans le sommaire.
- Chapitres identifiés par une icône Lucide de 16 px, titre 22 px seul sur sa ligne ; articles de la préparation et sections de la Décision en panneaux titrés 16 px.
- Rails repliables et mémorisés : sommaire 232 → 56 px (`[`), file de travail 300 → 44 px (`]`).
- Chiffres tabulaires et formats français (`4,0`, `52 %`, `11 sept., 12:26`, `—` pour l'absence) via `lib/format.ts`.

## Colors

Une palette de gris neutres (teinte 240) sur laquelle se pose une seule ardoise ; tout passe par les variables HSL de `styles/globals.css`, dont les triplets sont la source normative, le thème sombre redéfinissant les mêmes rôles sur un charbon de teinte 220.

### Primary
- **Ardoise** (`ardoise`) : l'unique accent. Cellule de note manuelle du rail 0–5, remplissage des barres de progression, points de phase franchis, filet bas de l'onglet actif, contour de 2 px d'une cellule de heatmap survolée, marque IA sous la cellule proposée (à 60 %), icônes de signal (discussion, commentaire, question), compteur de discussions, chargeur, caret, `accent-color` et anneau de focus. En thème sombre : **Ardoise claire** (`ardoise-claire`), texte inversé en charbon.
- **Ardoise texte** (`ardoise-texte`) : couleur des boutons `outline` et `ghost`, des liens de preuve (« Document · p. 12 »), du texte de la bande d'analyse, de la note IA non confirmée sur le rail, du compteur « à faire » de la file repliée. Sombre : `hsl(214 62% 78%)`.
- **Lavis ardoise** (`lavis-ardoise`) : fond de la sélection courante (chapitre actif, ligne de file sélectionnée, cellule de note IA, cellule « ½ » active, élément de menu focalisé), de la bande « Analyse IA en cours », de la sélection de texte, et des survols (`/40` sur une ligne de panneau, `/50` sur une ligne de file, `/60` sur un élément de rail ou un bouton de signal). Sombre : **Lavis ardoise sombre** (`lavis-ardoise-sombre`).

### Secondary
- **Échelle 0 → 5** (`echelle-0` … `echelle-5`) : six pas du gris clair à l'ardoise profonde, réservés aux notes (tableau « Notes par domaine »). Le texte passe à la couleur `fond` à partir du pas 4 ; une note absente prend `echelle-0` avec le texte gris. Sombre : du charbon `hsl(220 5% 13%)` à l'ardoise claire `hsl(214 62% 72%)`, le texte s'inverse de la même façon.

### Tertiary
- **Conforme** (`conforme` / `conforme-lavis`) : vert ; point de pastille, point « terminé » du sommaire, mention « Évaluée », segment de répartition, chiffre « 6/6 » d'une exigence faite, avatar de ton 2.
- **Partiel** (`partiel` / `partiel-lavis`) : ocre ; point de pastille, point « en cours » du sommaire, statut « En cours » d'une consultation, avatar de ton 3.
- **Non conforme** (`non-conforme` / `non-conforme-lavis`) : rouge brique ; point de pastille, compteur de discussion bloquante, bande « Analyse IA interrompue » (fond lavis, bordure à 40 %, texte plein). Même valeur que `alerte` (`--destructive`).
- **Roadmap** (`roadmap` / `roadmap-lavis`) : violet grisé ; point de pastille, choisi explicitement dans le menu, avatar de ton 4.
- **À évaluer** (`a-evaluer` / `a-evaluer-lavis`) : gris ; point de pastille par défaut, statut « Archivée ».

### Neutral
- **Fond** (`fond`) : le plan de travail, fond de page ; aussi fond des champs, des boutons `outline`, des cellules de note au repos et des dialogues. Sombre : **Fond charbon** (`fond-charbon`).
- **Panneau** (`panneau`) : fond des panneaux, des popovers, des menus, de la barre de recherche ⌘K et des en-têtes collants de la heatmap. Sombre : **Panneau charbon** (`panneau-charbon`), popover à `hsl(220 5% 12%)`.
- **Rail** (`rail`) : fond des barres latérales, de la file de travail et de ses en-têtes de groupe collants, des pieds de colonne de réponse et de la barre mobile. Sombre : même valeur que le fond charbon.
- **Encre** (`encre`) : texte courant et titres. Sombre : **Encre claire** (`encre-claire`).
- **Encre grise** (`encre-grise`) : texte secondaire, codes d'article, en-têtes de colonnes, méta, éléments de rail au repos, icônes de signal. Sombre : `hsl(220 4% 64%)`.
- **Second plan** (`second-plan`) : fond des pastilles, du filtre segmenté actif, des pistes de barre de progression, des squelettes de chargement. Sombre : `hsl(220 5% 13%)`.
- **Filet** (`filet`) : bordure des panneaux, séparateurs de lignes et d'en-têtes, filets des barres latérales, soulignement au repos de la note de colonne, ascenseurs. Sombre : **Filet charbon** (`filet-charbon`).
- **Filet de saisie** (`filet-saisie`) : bordure des champs, des boutons `outline`, du rail 0–5, du filtre segmenté, du point « à faire » du sommaire (1,5 px), des connecteurs de phase non franchis. Sombre : `hsl(220 5% 24%)`.
- **Action** (`action`) : fond du bouton primaire, carré d'initiales de l'organisation, badge `default`. Sombre : encre claire, texte charbon.

### Named Rules
**La règle de l'ardoise unique.** L'ardoise est la couleur de ce qui est choisi ou en cours : sélection, progression, note manuelle, lien de preuve. Elle n'est jamais le fond d'un bouton d'action, qui est en encre. Aucune deuxième teinte d'accent n'existe.

**La règle du point.** Une couleur d'état vit dans un point de 7 ou 8 px accompagné d'un libellé ou d'un chiffre ; la pastille qui le porte reste grise. Les répartitions en barre gardent leur légende textuelle et leurs compteurs `20 · 0 · 0 · 0`.

**La règle de l'échelle.** Une note se lit sur les six pas de l'échelle, jamais en rouge/vert ; les couleurs d'état sont réservées aux statuts.

## Typography

**Display Font:** aucune ; il n'y a pas de rôle d'affichage.
**Body Font:** Geist Sans (paquet `geist`, variable `--font-geist-sans`), repli `ui-sans-serif, system-ui, sans-serif`.
**Label/Mono Font:** Geist Mono (`--font-geist-mono`), repli `ui-monospace, monospace`, pour les codes d'article et tous les chiffres (`.num`).

**Character :** une grotesque neutre resserrée d'un demi-centième (`letter-spacing: -0.005em` sur `body`), en trois graisses (400 courant, 500 libellés et navigation, 600 titres et chiffres), doublée d'un mono qui donne aux codes et aux notes une voix d'instrument. Chiffres tabulaires partout (`font-variant-numeric: tabular-nums` sur `body`). L'échelle est fixe en pixels : 11 / 12 / 13 / 15 / 16 / 18 / 22 / 28 / 36 ; les interlignes sont fixés dans `tailwind.config.ts` (14 / 16 / 18–19 / 20–22 / 22 / 24 / 28 / 34 / 42).

### Hierarchy
- **Headline** (600, 22 px / 28 px, −0,01 em) : titre de chapitre dans `PageHeader` et titre « Consultations » de l'accueil, seul sur sa ligne et tronqué au besoin. En mode « Présenter » les titres d'article montent à 28 px.
- **Title** (600, 16 px / 22 px) : titre de section dans la Décision (« Classement technique », « Notes par domaine », « Technique et financier »), titre d'étape de la préparation, titre de l'exigence sélectionnée (13 px sous 768 px), titre d'un panneau latéral.
- **Subtitle** (600, 15 px / 20 px) : titre d'une carte de consultation sur l'accueil.
- **Figure** (600, 16 px, mono, tabulaire) : la note en tête de colonne de réponse, soulignée ; le dénominateur `/5` reste en 12 px 400 gris. Les notes de heatmap et du rail 0–5 sont en 13 px 600 tabulaires.
- **Body** (400, 13 px / 18 px) : tout texte courant, libellés de navigation, cellules de tableau, champs. Les textes de réponse et d'analyse IA prennent l'interligne de lecture de 19 px (`reading`) ; les paragraphes d'introduction sont limités à 70 ch, les descriptions d'exigence à 75 ch.
- **Label** (500, 12 px / 16 px, casse normale) : en-têtes de colonnes de tableau, libellés de pastille, libellés de section dans une colonne (« Réponse », « Analyse IA », en 600), onglets de filtre, méta de carte. Pas de capitales, pas d'interlettrage.
- **Article-no** (500, 12 px / 16 px, mono, gris) : code de domaine ou d'exigence du référentiel client (`REQ-FUN`, `R-12`), dans la file de travail, le tableau des domaines, le panneau de renvois, le suivi et l'en-tête d'exigence ; toujours à gauche du titre, de la ligne ou de la cellule qu'il identifie, jamais seul.
- **Meta** (400, 11 px / 14 px) : chiffre court d'un chapitre (`90 %`), compteur `1/6` d'une exigence, dernière activité d'une carte, raccourci `⌘K`, indice de défilement, sous-compte `11/12` d'une cellule de heatmap.

### Named Rules
**La règle du code de référentiel.** Le mono `article-no` appartient aux codes que le client a écrits — domaines et exigences — placés à gauche du titre ou de la ligne qu'ils identifient, séparés de 8 px. L'interface ne se numérote pas elle-même : un chapitre s'identifie par son icône et son libellé, une étape ou une section par son titre.

**La règle du chiffre mono.** Toute donnée numérique est en Geist Mono tabulaire (`.num` ou `.tnum`), alignée à droite dans les tableaux, formatée en français par `lib/format.ts`.

**La règle de la casse normale.** Un en-tête de colonne est en 12 px 500 gris, en casse normale ; les capitales espacées n'appartiennent plus au système.

## Layout

Le gabarit est celui d'un atelier à deux plans : à gauche une barre latérale collante de 232 px sur fond `rail` fermée par un filet, à droite le plan de travail gris qui reçoit les panneaux. Hors consultation, la barre latérale porte le sélecteur d'organisation (36 px, carré d'initiales 24 px en encre), trois entrées de navigation (32 px, icône 16 px), et en pied la ligne du compte (avatar 24 px, nom, menu : organisations, jetons, thème, déconnexion). Dans une consultation, elle devient le sommaire : lien de retour « Consultations » (28 px, 12 px gris), titre de la consultation en 13 px 600 sur deux lignes maximum avec sélecteur, puis une ligne de 12 px gris qui porte le statut et la puce de version, puis les chapitres (32 px, icône Lucide 16 px, libellé 13 px, chiffre court 11 px mono, point d'état 8 px), leurs sous-entrées (28 px, rentrées de 36 px), « Paramètres » après un filet, et le compte en pied. Le sommaire se replie à 56 px (`[`) : chaque chapitre devient une case de 36 px où l'icône reste seule et centrée, avec un point de 6 px en haut à droite ; le libellé, le chiffre court et l'état passent dans l'infobulle. L'état est mémorisé par navigateur.

Le contenu est centré et plafonné : 1024 px (`max-w-5xl`) pour la préparation, l'analyse et le suivi ; 1152 px (`max-w-6xl`) pour la décision et les paramètres ; 1200 px pour l'accueil, dont la grille passe à deux colonnes (`1fr` + 340 px) à partir de 1024 px. Chaque chapitre s'ouvre par un `PageHeader` (titre 22 px seul, phrase d'introduction 13 px gris limitée à 70 ch, au plus une action primaire à droite, 16 px de marge horizontale, 32 px à partir de 768 px) et se compose de panneaux empilés à 12 à 16 px d'écart, chacun un article titré (`<section class="panel">`, 16 px de padding, 20 px horizontal à partir de 768 px, en-tête sans numéro : titre 16 px seul). Une étape de la préparation est un panneau sans padding dont l'en-tête (12 px / 16 px, 20 px horizontal au-delà de 768 px) aligne le point d'état, le titre 16 px, la mention d'état 12 px grise (« Réglées », « Poids identiques »), un résumé gris masqué sous 768 px, et à droite une action `outline` ; l'explication éventuelle est un paragraphe 13 px gris de 70 ch au plus dans le corps du panneau. Un panneau de liste (« Aujourd'hui », « Activité récente », tableau du suivi) a un en-tête de 10 px / 16 px fermé par un filet et des lignes de 12 px / 16 px séparées par des filets, sans padding de panneau.

L'espace d'évaluation est la seule composition pleine hauteur : une barre de chapitre de 40 px sur `rail` (titre « Évaluation » 13 px 600, compteur tabulaire, lien « Discussions »), puis trois plans : la file de travail de 300 px (fond `rail`, onglets À faire / Faites / Toutes, recherche 32 px, bouton de filtres, groupes par domaine à en-tête collant, lignes de 2 × 6 px + 10 px), l'en-tête de l'exigence (code mono, fil du domaine, pastille « Obligatoire », titre 16 px, compteur `1/3` et flèches), et les colonnes de réponse, une par fournisseur, panneaux de largeur égale à 300 px minimum avec défilement horizontal au-delà. La file se replie à 44 px (`]`) : un bouton, un compteur « à faire » en pilule ardoise, un libellé vertical ; le texte des réponses gagne alors quatre lignes (12 au lieu de 8). Le panneau de renvois de la décision est un `Sheet` de droite de 576 px maximum.

Rythme : grille de 2 px, valeurs reprises 2 / 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 32 et 48 px (`PageState`). Hauteurs de contrôle : 28 / 32 / 36 / 40 px ; pastilles 22 px ; cellule de note 32 × 34 px ; cellule de heatmap 36 px ; lignes de rail 32 px ; lignes de tableau 36 à 44 px.

Responsive : le seuil est 768 px (`md`). Sous ce seuil, la barre latérale disparaît au profit d'une barre de 44 px sur `rail` (bouton menu `ghost`, nom de l'organisation ou icône + libellé du chapitre courant), et le sommaire s'ouvre dans un panneau gauche de 288 px ; l'espace d'évaluation supprime cette barre, met la file dans un panneau de 88 vw, empile les colonnes de réponse avec un pied « Précédente / 1/3 / Suivante » et le balayage ; les cartes de consultation passent en une colonne ; les tableaux larges passent dans `ScrollX` (fondu de bord de 12 px du fond vers transparent, filet, indice 11 px) et masquent leurs colonnes secondaires (`hidden md:table-cell`). Le mode « Présenter » de la décision (`presentation` variant) donne à chaque article la hauteur de l'écran, 40 px de padding vertical, titres 28 px et texte 16–18 px. Impression : fond blanc, texte noir 12 px, éléments `.no-print` retirés.

## Elevation & Depth

Le système est tonal, avec une ombre minimale. Trois plans : le fond gris, les zones de commande sur `rail` (à peine plus claires que le fond en thème clair, confondues avec lui en sombre), et les panneaux blancs qui s'en détachent par leur filet et une ombre d'un pixel. La sélection est un lavis, jamais une ombre. Aucun dégradé décoratif n'existe : le seul dégradé est le fondu de bord de `ScrollX`.

### Shadow Vocabulary
- **Panneau** (`box-shadow: 0 1px 2px hsl(240 10% 10% / 0.04)`, sombre : `none`) : la seule ombre au repos, portée par `.panel` et par lui seul ; en thème sombre elle disparaît, le filet suffit.
- **Overlay** (`box-shadow: 0 12px 32px -12px hsl(240 20% 10% / 0.25)`, sombre : `0 12px 32px -12px hsl(0 0% 0% / 0.6)`) : ce qui quitte le plan de travail : dialogues, panneaux latéraux, popovers, cartes au survol, listes déroulantes. Dialogues et panneaux latéraux ajoutent un voile `black/80`.

### Named Rules
**La règle du pixel.** Un panneau porte une ombre d'un pixel et pas davantage ; une ligne, un bouton, un champ ou une cellule n'en portent aucune. Seul ce qui flotte prend `shadow-overlay`.

## Shapes

Rayon de base de 8 px (`--radius`), décliné en trois pas et une pilule : 8 px (`rounded-lg`) pour les panneaux, les dialogues et les grands squelettes ; 6 px (`rounded-md`) pour tout ce qui se clique ou se saisit (boutons, champs, éléments de rail et de file, rail 0–5, menus, popovers, filtre segmenté, carré d'initiales de l'organisation) ; 4 px (`rounded-sm`) pour les badges, les cellules de heatmap, les éléments de menu, la touche `⌘K`, les petits squelettes et la marque IA sous une cellule ; pilule (`rounded-full`) pour les pastilles d'état, les avatars, les points de phase et d'état, les barres de progression et les compteurs.

Les bordures sont des filets de 1 px : `filet` pour les panneaux et les séparateurs, `filet-saisie` pour ce qui se saisit (champs, `outline`, rail 0–5, filtre segmenté). La sélection dans un rail ou une file est un fond lavis sur un rectangle à coins 6 px, plus de filet gauche. L'onglet actif porte un filet bas de 2 px ardoise ; une cellule de heatmap survolée, un contour de 2 px ardoise ; la note d'une colonne, un soulignement fin décalé de 4 px. Les phases d'une consultation sont cinq points de 8 px (10 px pour la phase courante) reliés par des traits de 2 × 14 px.

## Components

### Buttons
Caractère : bas, sobres, un seul plein par écran, en encre.
- **Shape :** coins 6 px ; texte 13 px 500 (`md`/`lg`), 12 px (`sm`/`xs`) ; icônes Lucide 16 px (14 px en `sm`/`xs`), à 60 % d'opacité dans `outline`, `ghost`, `secondary` et `dashed`.
- **Primary :** fond encre `action`, texte blanc, 36 px de haut, 12 px de padding horizontal (`lg` : 40 / 16 ; `sm` : 32 / 10 ; `xs` : 28 / 8 ; `icon` : 36 × 36). « Nouvelle consultation » en haut à droite de l'accueil, « Valider » ou « Statuer » (28 px, 12 px) au pied d'une colonne de réponse.
- **Hover / Focus :** survol à 90 % d'opacité du fond ; focus visible en anneau de 2 px ardoise décalé de 2 px ; transition couleur et ombre 150 ms.
- **Disabled / Loading :** 60 % d'opacité, pointeur inactif ; en chargement, l'icône devient un chargeur en rotation, le libellé reste.
- **Outline :** fond `fond`, filet de saisie, texte ardoise ; survol lavis. Actions secondaires (« Imprimer », « Présenter », « Réessayer », filtres).
- **Ghost :** sans fond ni bordure, texte ardoise ; survol lavis. Boutons d'icône de barre et de colonne (gris quand `mode="icon"`).
- **Dim :** gris, passe à l'encre au survol ; liens de faible poids.
- **Link :** texte ardoise sans padding ; soulignement décalé de 4 px au survol.
- **Destructive :** fond rouge brique, texte blanc ; seulement dans une confirmation.

### Stamps (pastilles d'état)
- **Style :** `inline-flex`, 22 px de haut, pilule, fond `second-plan`, 8 px de padding, point de 7 px à gauche (6 px d'écart), libellé 13 px → 12 px 500 en encre. Le point prend `conforme`, `partiel`, `non-conforme`, `roadmap` ou `a-evaluer` ; le fond et le texte ne changent pas.
- **State :** toujours point + libellé (« Conforme », « Partiel », « Non conforme », « Roadmap », « À évaluer ») ; en version courte le libellé reste pour les lecteurs d'écran. En filtre, une pastille inactive passe à 50 % d'opacité. Les statuts de consultation (En cours, Terminée, Archivée) réutilisent partiel / conforme / à évaluer. Dans une colonne de réponse, la pastille est un déclencheur de menu.

### Badges
- **Style :** coins 4 px, 12 px 600, 6 px / 2 px de padding ; `default` = encre pleine sur fond, `secondary` = second plan, `outline` = filet. Réservés aux mentions courtes (« Obligatoire » en pastille grise dans l'en-tête d'exigence ; « Oblig. » en 11 px 600 capitales dans la file), jamais à un état.

### Panels (`.panel`)
- **Corner Style :** 8 px.
- **Background :** blanc `panneau` ; sur le fond gris.
- **Shadow Strategy :** `shadow-panel` (voir Elevation & Depth) ; aucune en thème sombre.
- **Border :** filet de 1 px.
- **Internal Padding :** 16 px (20 px horizontal à partir de 768 px) pour un article ; un panneau de liste n'a pas de padding et ses lignes portent 12 px / 16 px. L'ancien `Card` (`rounded-md`, 20 px, en-tête 56 px) survit dans les écrans hérités, jamais dans les écrans refondus.

### Inputs / Fields
- **Style :** 36 px de haut (32 px en contexte dense : recherche de la file, sélecteurs de filtre), filet de saisie, fond `fond`, coins 6 px, 12 px de padding horizontal, texte 13 px, placeholder gris. Zone de texte : 60 px minimum (56 px dans une colonne), 8 px de padding vertical.
- **Focus :** bordure ardoise + anneau de 2 px ardoise à 25 %, transition 150 ms.
- **Error / Disabled :** `aria-invalid` passe la bordure en rouge brique ; désactivé à 60 % d'opacité, curseur interdit.
- **Search ⌘K :** bouton de 32 px, fond `panneau`, filet de saisie, 260 px maximum, loupe 14 px, touche `⌘K` en mono 11 px dans un cadre 4 px ; la bordure passe à l'ardoise au survol ; ouvre un dialogue `cmdk`.
- **Select :** même gabarit ; liste déroulante sur `panneau` avec ombre overlay, option focalisée en lavis.

### Navigation
- **Barre latérale d'organisation :** 232 px, fond `rail`, 10 px de padding ; entrées de 32 px à coins 6 px, texte 13 px gris, icône 16 px ; survol lavis 60 % + encre ; active lavis + 500 + encre (`aria-current="page"`). Transition 150 ms.
- **Sommaire de consultation :** même dessin ; un chapitre actif ou dont une sous-entrée est active prend le lavis ; les sous-entrées (28 px, rentrées de 36 px) n'ont pas de fond, seulement 500 + encre. Le point d'état : vert plein (terminé), ocre plein (en cours), vide à bordure de saisie 1,5 px (à faire), chargeur ardoise 14 px (en analyse), toujours doublé d'un libellé `sr-only`. Replié à 56 px : cases de 36 px, icône seule centrée, point de 6 px en haut à droite, infobulle portant libellé, chiffre et état.
- **Barre mobile :** 44 px, fond `rail`, filet bas, bouton menu `ghost` 16 px, icône du chapitre courant 16 px grise puis titre 13 px 500 ; sommaire dans un panneau de 288 px.
- **Sélecteur de version :** puce de 24 px sous le titre du sommaire, filet de 1 px et coins 6 px sur `panneau`, 6 px de padding horizontal, icône `Layers` 12 px, libellé 12 px gris « V2 · Pré-analyse », chevrons 12 px ; affichée dès qu'une version existe, y compris quand il n'y en a qu'une. Le survol passe le texte à l'encre, le focus prend l'anneau ardoise ; le menu (256 px) liste les versions (numéro `V2` en mono 11 px gris, nom, coche ardoise sur l'active) puis « Gérer les versions ».
- **Onglets :** liste de 36 px à filet bas, déclencheurs 13 px 500 gris, actif en encre avec filet bas de 2 px ardoise ; compteurs en 12 px mono gris. Même dessin pour les onglets de la file (600 quand actif).
- **Filtre segmenté :** groupe `role="tablist"` dans un cadre de saisie à coins 6 px, segments 12 px de 10 px / 4 px, actif sur `second-plan` en 500, compteur mono gris.
- **Bande d'analyse :** 32 px, fond lavis, texte ardoise 13 px ; chargeur 14 px, compteur tabulaire, estimation grise, lien « Suivre » souligné à droite, barre de progression de 2 px ardoise au bord bas (largeur en 500 ms). En échec : fond lavis rouge, bordure rouge à 40 %, texte rouge.

### File de travail (signature)
Fond `rail`, 300 px. Onglets en tête (À faire / Faites / Toutes avec compteurs), recherche 32 px avec bouton de filtres (primaire quand des filtres sont actifs, avec compteur). Groupes par domaine à en-tête collant sur `rail` (code mono, titre 12 px 500, compteur mono à droite). Lignes : coins 6 px, 6 px / 10 px de padding, code mono sur 56 px, titre 13 px / 18 px sur deux lignes, sous-ligne 11 px (« Oblig. », compteur `1/6` en vert quand tout est fait, icônes de signal 12 px ardoise) ; survol lavis 50 %, sélection lavis plein. Repliée à 44 px : bouton `outline` 32 px, compteur « à faire » en pilule lavis 24 px, libellé vertical 11 px.

### Colonne de réponse (signature)
Un panneau par fournisseur. En-tête (10 px / 14 px, filet bas) : nom 13 px 600, note mono 16 px 600 soulignée d'un filet (ardoise au survol) avec `/5` en 12 px gris, pastille d'état à menu. La carte de renvoi au survol de la note (256 px, ombre overlay, 12 px) montre le document, la page et l'extrait entre guillemets français, puis « Cliquer pour ouvrir à la page ». Corps (12 px / 14 px, sections à 14 px d'écart) : libellé « Réponse » 12 px 600 gris avec boutons d'icône 28 px, texte 13 px / 19 px tronqué à 8 lignes (12 quand la file est repliée) sur une hauteur réservée pour que « Analyse IA » commence à la même hauteur dans toutes les colonnes, « Lire la suite » 12 px ; preuves en liste 12 px ardoise (signet 12 px, « Document · p. N », extrait gris) ; « Analyse IA · 4,0/5 » puis texte tronqué à 5 lignes. Pied sur `rail` (filet haut, 10 px / 14 px) : rail 0–5 et « IA 4,0 » ; seconde ligne de 32 px avec « Valider » (encre, 28 px) ou « Évaluée » en vert avec retour ; à droite les signaux : bouton discussions 28 px avec compteur en pilule 18 px (ardoise, rouge si bloquante), commentaire et question 28 × 28 px marqués d'un point ardoise de 6 px quand renseignés, fond lavis 60 % au survol ; les zones de saisie (56 px) se déploient dessous.

### Rail de notation 0–5 (signature)
Un groupe « Note sur 5 » : six cellules contiguës de 32 × 34 px (28 × 28 px en `sm`) dans un cadre de saisie à coins 6 px, séparées par des filets de saisie, chiffres 13 px 600 tabulaires. Repos : fond `fond` ; survol : lavis 60 % ; note manuelle : ardoise pleine, chiffre blanc (`aria-pressed`) ; note IA non confirmée : lavis, chiffre ardoise ; proposition IA sur une autre cellule : trait de 2 px ardoise à 60 % au bas de la cellule. À droite, une cellule « ½ » de même gabarit (lavis quand active, gris sinon), puis, quand la note est manuelle, un lien 12 px « IA 4,0 » ou « Effacer » qui revient à la proposition. Désactivé : 60 % d'opacité. Le statut se déduit de la note (`lib/scoring.ts`) et se lit dans la pastille d'en-tête.

### Heatmap et renvoi (signature)
Tableau « Notes par domaine » : première colonne collante sur `panneau` (code mono, titre 13 px, « n exig. » 11 px gris), poids, une cellule par fournisseur : bouton de 36 px à coins 4 px, 2 px d'écart, 13 px 600 tabulaire sur l'échelle 0 → 5, sous-compte `11/12` en 11 px à 80 % ; survol ou focus : contour de 2 px ardoise (150 ms). Le clic ouvre le panneau de renvois (576 px) dont l'en-tête est le fil fournisseur › domaine › exigence ; les lignes se survolent en lavis 40 %, les codes sont en mono, les preuves sont des liens « Document · p. 12 » avec l'extrait gris dessous.

### Accueil (signature)
Panneau « Aujourd'hui » : lignes de 44 px (icône 16 px ardoise, phrase 13 px avec chiffres mono en 600, chevron gris ou barre de progression 140 × 6 px). Cartes de consultation : panneau en trois colonnes (`1.7fr / 1fr / 170px`, 16–20 px de padding) : titre 15 px 600 avec pastille de statut et mention de version en lecture seule (icône `Layers` 12 px, « V2 · Pré-analyse », 12 px gris), cinq points de phase, méta 12 px avec icônes 14 px ; progression par fournisseur (nom sur 76 px, barre 110 × 6 px, pourcentage mono) ; avatars empilés (−6 px, bordure 2 px `panneau`) et dernière activité 11 px ; corbeille `ghost` révélée au survol. Panneau « Activité récente » : lignes 12 px avec avatar 22 px, nom 600, chiffre mono, date à droite.

### États de page (`PageState`)
Un seul dessin pour vide, chargement et erreur : bloc de 448 px maximum, centré horizontalement et dans une hauteur utile de 45 vh, contenu centré sur un axe et texte centré, 24 px / 48 px de padding, icône 20 px (chargeur ardoise en rotation, triangle rouge, boîte grise), titre 13 px 600, description 13 px gris, une action. Les squelettes sont des rectangles `second-plan` en pulsation (coins 4 px, 8 px pour un panneau). Un panneau vide est une phrase 13 px grise de 16 px / 32 px de padding.

### Surfaces flottantes
Dialogue : fond `fond`, filet, coins 8 px, 24 px de padding, ombre overlay, 512 px maximum, entrée fondu + zoom 95 % sur 200 ms, voile `black/80`. Panneau latéral (`Sheet`) : fond `fond`, filet, ombre overlay, glisse depuis le bord en 200 ms, se ferme en 150 ms, 384 px maximum (576 px pour le panneau de renvois, 288 px pour le sommaire mobile). Popover 288 px et carte au survol 256 px : fond `panneau`, filet, coins 6 px, 16 px de padding, ombre overlay, fondu + zoom. Menus et listes : fond `panneau`, filet, coins 6 px, 4 px de padding, éléments 13 px de 30 px de haut à coins 4 px focalisés en lavis. Palette ⌘K : dialogue sans padding, champ de 44 px, groupes titrés en 12 px 500 gris.

## Do's and Don'ts

### Do:
- **Do** poser tout contenu dans un `.panel` (blanc, coins 8 px, filet, ombre d'un pixel) sur le fond gris ; un article est un panneau titré, pas une suite de filets pleine largeur.
- **Do** placer le code de référentiel d'un domaine ou d'une exigence en `article-no` (mono 12 px 500 gris) à gauche du titre, de la ligne ou de la cellule qu'il identifie, séparé de 8 px ; identifier un chapitre par son icône Lucide et son libellé.
- **Do** réserver l'ardoise à la sélection (lavis), à la progression, à la note manuelle et aux liens de preuve ; le bouton d'action primaire est en encre `action`, un seul par écran.
- **Do** signifier un état par une pastille `.stamp` grise à point coloré et libellé, ou par un point de 8 px doublé d'un libellé ; lire les notes sur l'échelle 0 → 5.
- **Do** écrire tout nombre en Geist Mono tabulaire (`.num`) et au format français via `lib/format.ts` (`4,0`, `52 %`, `11 sept., 12:26`, `—` pour l'absence).
- **Do** écrire les en-têtes de colonnes en 12 px 500 gris et en casse normale.
- **Do** limiter le mouvement à 150 ms de couleur ou de bordure sur changement d'état, 150 ms de largeur pour un rail qui se replie, 150 à 200 ms pour ce qui flotte, 500 ms pour une barre de progression ; honorer `prefers-reduced-motion`.
- **Do** rendre les rails repliables (sommaire 56 px, file 44 px) au clavier et mémoriser l'état ; réserver la hauteur du texte de réponse pour que les colonnes s'alignent.
- **Do** rendre chaque état vide, en chargement ou en erreur par `PageState` — bloc centré de 448 px sur 45 vh de hauteur utile — ou par une phrase grise à sa place ; une seule action par état, jamais un chargeur plein écran.
- **Do** utiliser le vocabulaire métier (consultation, exigence, domaine, fournisseur, pondération, soutenance, référentiel, livrable) dans un ton neutre, sans point d'exclamation.

### Don't:
- **Don't** colorer le fond ou le texte d'une pastille avec une couleur d'état ; seule sa pointe est colorée.
- **Don't** introduire une deuxième couleur d'accent, un bouton d'action bleu, un dégradé, ou une ombre au-delà de `shadow-panel` sur une surface au repos ; `shadow-overlay` n'existe que pour ce qui flotte.
- **Don't** dépasser 8 px de rayon hors pilules (pastilles, avatars, points, barres de progression, compteurs).
- **Don't** écrire un en-tête de tableau ou un libellé en capitales espacées ; ni revenir aux tampons carrés ou à Source Sans 3.
- **Don't** redonner à l'interface une numérotation à elle-même (chapitres 1 à 5, articles 1.1 à 1.5, sections 4.1 à 4.3, en-tête « 3 Évaluation ») : `article-no` n'écrit que les codes du référentiel client (D-16).
- **Don't** réintroduire une barre supérieure ou une barre d'onglets de chapitres ; la barre latérale de 232 px est la seule navigation.
- **Don't** utiliser une valeur de couleur brute (`slate-*`, `gray-*`, `zinc-*`, hex) dans un écran refondu ; toute couleur passe par les variables de `styles/globals.css`.
- **Don't** ajouter une séquence d'entrée, un survol par translation ou une animation décorative.
- **Don't** montrer un score sans son renvoi : un score est un lien vers l'extrait cité et le document à la page.
- **Don't** appliquer ce système aux écrans hérités hébergés sous le shell (grille financière, vue arborescente, documents, onglets de paramètres : `WeightsTab`, `AnalystsTab`, `SettingsTab`, `VersionsTab`, `SuppliersTab`, `RequirementsTab`, `ExportTab`) : ils gardent leur style d'origine (D-06, D-14) jusqu'à leur refonte.
