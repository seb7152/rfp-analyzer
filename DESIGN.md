---
name: RFP Analyzer
description: Le dossier de consultation — typographie administrative à articles numérotés, papier et encre, un seul bleu d'action.
colors:
  papier: "hsl(40 20% 99%)"
  encre: "hsl(222 22% 13%)"
  encre-bleue: "hsl(216 62% 36%)"
  encre-bleue-texte: "hsl(216 62% 30%)"
  lavis-bleu: "hsl(216 55% 94%)"
  second-plan: "hsl(222 16% 95%)"
  encre-grise: "hsl(222 10% 40%)"
  filet: "hsl(222 14% 86%)"
  filet-saisie: "hsl(222 14% 80%)"
  blanc-popover: "hsl(0 0% 100%)"
  conforme: "hsl(152 52% 30%)"
  conforme-lavis: "hsl(152 40% 93%)"
  partiel: "hsl(34 78% 34%)"
  partiel-lavis: "hsl(38 70% 92%)"
  non-conforme: "hsl(0 62% 42%)"
  non-conforme-lavis: "hsl(0 60% 95%)"
  roadmap: "hsl(264 32% 42%)"
  roadmap-lavis: "hsl(264 30% 94%)"
  a-evaluer: "hsl(222 10% 46%)"
  a-evaluer-lavis: "hsl(222 16% 94%)"
  echelle-0: "hsl(222 16% 95%)"
  echelle-1: "hsl(224 45% 90%)"
  echelle-2: "hsl(224 48% 80%)"
  echelle-3: "hsl(224 50% 66%)"
  echelle-4: "hsl(224 54% 46%)"
  echelle-5: "hsl(224 58% 34%)"
  papier-charbon: "hsl(220 4% 9%)"
  encre-claire: "hsl(220 6% 92%)"
  encre-bleue-sombre: "hsl(214 72% 74%)"
  filet-sombre: "hsl(220 4% 22%)"
typography:
  headline:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
  title:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    fontFeature: "tnum"
  label:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.025em"
  article-no:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.02em"
  meta:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "14px"
  figure:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
    fontFeature: "tnum"
rounded:
  none: "0px"
  stamp: "2px"
  control: "2px"
  overlay: "4px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "16": "64px"
  top-bar: "48px"
  strip: "32px"
  rail: "240px"
components:
  button-primary:
    backgroundColor: "{colors.encre-bleue}"
    textColor: "{colors.papier}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "hsl(216 62% 36% / 0.9)"
  button-outline:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre-bleue-texte}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.lavis-bleu}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.encre-bleue-texte}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.lavis-bleu}"
  button-sm:
    height: "32px"
    padding: "0 10px"
    typography: "{typography.label}"
  button-xs:
    height: "28px"
    padding: "0 8px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "36px"
    typography: "{typography.body}"
  stamp-conforme:
    backgroundColor: "{colors.conforme-lavis}"
    textColor: "{colors.conforme}"
    rounded: "{rounded.stamp}"
    padding: "0 6px"
    height: "24px"
    typography: "{typography.label}"
  stamp-partiel:
    backgroundColor: "{colors.partiel-lavis}"
    textColor: "{colors.partiel}"
    rounded: "{rounded.stamp}"
    padding: "0 6px"
    height: "24px"
    typography: "{typography.label}"
  stamp-non-conforme:
    backgroundColor: "{colors.non-conforme-lavis}"
    textColor: "{colors.non-conforme}"
    rounded: "{rounded.stamp}"
    padding: "0 6px"
    height: "24px"
    typography: "{typography.label}"
  stamp-roadmap:
    backgroundColor: "{colors.roadmap-lavis}"
    textColor: "{colors.roadmap}"
    rounded: "{rounded.stamp}"
    padding: "0 6px"
    height: "24px"
    typography: "{typography.label}"
  stamp-a-evaluer:
    backgroundColor: "transparent"
    textColor: "{colors.a-evaluer}"
    rounded: "{rounded.stamp}"
    padding: "0 6px"
    height: "24px"
    typography: "{typography.label}"
  rail-item:
    backgroundColor: "transparent"
    textColor: "{colors.encre}"
    padding: "6px 12px"
    typography: "{typography.body}"
  rail-item-active:
    backgroundColor: "{colors.lavis-bleu}"
    textColor: "{colors.encre-bleue-texte}"
  score-cell:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    height: "32px"
    width: "34px"
    typography: "{typography.body}"
  score-cell-manual:
    backgroundColor: "{colors.encre-bleue}"
    textColor: "{colors.papier}"
  score-cell-ai:
    backgroundColor: "{colors.lavis-bleu}"
    textColor: "{colors.encre-bleue-texte}"
  heatmap-cell:
    rounded: "{rounded.none}"
    height: "36px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    rounded: "{rounded.control}"
    padding: "20px"
---

# Design System: RFP Analyzer

## Overview

**Creative North Star: « Le dossier de consultation »**

L'interface est la table des matières et les articles d'un dossier de consultation, dans la typographie administrative française du DCE et de l'avis de marché. Une consultation est un dossier numéroté ; ses phases sont des chapitres (1 Préparation, 2 Analyse IA, 3 Évaluation, 4 Décision, 5 Restitution) ; ses domaines et exigences sont des articles (1.1, 1.3, 4.2, R-12). Le rail gauche est un sommaire, jamais une barre d'onglets ; le contenu est une suite d'articles séparés par des filets, jamais une grille de cartes. Avec le contenu retiré, la page se lit encore comme un dossier numéroté avec un sommaire à gauche.

Le monde est fait de papier et d'encre : un fond papier presque blanc (charbon en thème sombre), une encre quasi noire, un seul bleu encre institutionnel réservé à l'action primaire et à la sélection courante. Quatre couleurs d'état sont des tampons carrés, chacun avec glyphe et libellé. La hiérarchie est portée par la taille et la graisse, les séparateurs sont des filets de 1 px, les surfaces sont plates ; la seule ombre existante appartient aux panneaux flottants. Une seule famille, Source Sans 3, chiffres tabulaires partout. La densité est celle d'un outil de travail : 13 px pour le texte courant, 14 px par défaut, lignes de tableau de 36 à 44 px.

L'interaction signature est le renvoi : tout score est un lien vers sa preuve. Survol : l'extrait cité ; clic : le document à la page. Le panneau de détail de la décision porte un fil d'Ariane « Renvois » (fournisseur › domaine › exigence › réponse › citation). Le mouvement se limite à 150 ms de transition de couleur ou de bordure sur changement d'état ; il n'y a aucune séquence d'entrée sur les écrans, et `prefers-reduced-motion` est honoré globalement.

Refus confirmés par la direction (D-03) et par le code livré : pas de cartes KPI ni de tableau de bord à vignettes, pas de barre de dix onglets, pas de tableur brut ; pas de dégradés, pas d'ombres portées sur les surfaces, pas de coins arrondis au-delà de 4 px ; pas de couleur seule pour signifier un état ; pas de ton promotionnel ni de point d'exclamation dans les libellés.

**Key Characteristics:**
- Numérotation d'articles (`1`, `1.3`, `4.2`, `R-12`) comme identité récurrente, en 12 px semi-gras gris encre.
- Sommaire fixe de 240 px à gauche ; sélection = filet d'encre bleue de 2 px à gauche + lavis bleu.
- Un seul bouton primaire bleu encre par écran, en haut à droite de l'en-tête de chapitre.
- Tampons d'état carrés (2 px) : glyphe + libellé en capitales 12 px, teinte + lavis.
- Échelle séquentielle bleue à six pas (0 → 5) pour toute note, du papier vers l'encre bleue.
- Filets de 1 px comme unique séparateur ; aucune boîte, aucune ombre hors panneaux flottants.
- Chiffres tabulaires par défaut, formats français (`4,0`, `52 %`, `27 févr. 2026`, `—` pour l'absence).

## Colors

Une palette d'encre sur papier, chaque valeur passe par une variable HSL de `styles/globals.css` ; les triplets HSL sont la source normative (le thème sombre redéfinit les mêmes rôles).

### Primary
- **Encre bleue** (`encre-bleue`) : l'unique accent. Fond du seul bouton primaire, cellule de note manuelle sur le rail 0–5, filet de sélection de 2 px dans le sommaire et la file de travail, barre de progression sous la bande d'analyse, caret et `accent-color` du navigateur, anneau de focus. En thème sombre il s'éclaircit (`encre-bleue-sombre`) et son texte inversé devient encre.
- **Encre bleue texte** (`encre-bleue-texte`) : couleur des liens de renvoi et des boutons `outline`/`ghost` ; texte des surfaces en lavis bleu.
- **Lavis bleu** (`lavis-bleu`) : fond de la sélection courante (chapitre actif, exigence active, cellule de note IA non confirmée), de la bande « Analyse IA en cours », de la sélection de texte, et du survol des lignes (`/40` à `/60`). En thème sombre : `hsl(216 30% 20%)`.

### Secondary
- **Échelle séquentielle 0 → 5** (`echelle-0` … `echelle-5`) : six pas du papier grisé à l'encre bleue profonde, réservés aux notes (heatmap 4.2, pastilles de note dans le panneau de renvois). Le texte passe à la couleur papier à partir du pas 4. Une note absente prend `echelle-0` avec le texte gris encre. Thème sombre : mêmes six rôles, du charbon `hsl(220 4% 14%)` au bleu clair `hsl(222 70% 74%)`.

### Tertiary
- **Conforme** (`conforme` / `conforme-lavis`) : vert profond ; tampon ✓ CONFORME, glyphe « terminé » du sommaire, mention « Évaluée ».
- **Partiel** (`partiel` / `partiel-lavis`) : ocre ; tampon ◐ PARTIEL, glyphe « en cours » (carré à moitié rempli), statut « En cours » d'une consultation.
- **Non conforme** (`non-conforme` / `non-conforme-lavis`) : rouge brique ; tampon ✕ NON CONFORME, bande « Analyse IA interrompue », commentaires bloquants. Même valeur que `--destructive`.
- **Roadmap** (`roadmap` / `roadmap-lavis`) : violet grisé ; tampon → ROADMAP, choisi explicitement dans le menu du tampon.
- **À évaluer** (`a-evaluer` / `a-evaluer-lavis`) : gris ; tampon — À ÉVALUER, sans fond, bordure filet.

### Neutral
- **Papier** (`papier`) : fond de page, des cartes et des champs. Thème sombre : **Papier charbon** (`papier-charbon`).
- **Blanc popover** (`blanc-popover`) : fond des menus, popovers et listes déroulantes. Thème sombre : `hsl(220 4% 12%)`.
- **Encre** (`encre`) : texte courant, titres, badges pleins. Thème sombre : **Encre claire** (`encre-claire`).
- **Encre grise** (`encre-grise`) : texte secondaire, numéros d'article, en-têtes de colonnes, méta. Thème sombre : `hsl(220 4% 66%)`.
- **Second plan** (`second-plan`) : fond du rail (`/60`), de la file de travail (`/40`), des en-têtes de domaine collants, des squelettes de chargement et des pistes de barres. Thème sombre : `hsl(220 4% 14%)`.
- **Filet** (`filet`) : tous les séparateurs, bordures de cartes et de tableaux, ascenseurs. Thème sombre : **Filet sombre** (`filet-sombre`).
- **Filet de saisie** (`filet-saisie`) : bordure des champs, des boutons `outline`, du rail 0–5, et de la zone de dépôt en pointillé. Thème sombre : `hsl(220 4% 30%)`.

### Named Rules
**La règle de l'encre unique.** Le bleu encre plein n'apparaît que sur l'action primaire (une par écran), la note manuelle confirmée, le filet de sélection et les barres de progression. Tout autre usage passe par le lavis ou par le texte bleu.

**La règle du tampon.** Une couleur d'état n'est jamais seule : elle accompagne toujours un glyphe distinct et un libellé (`✓ Conforme`, `◐ Partiel`, `✕ Non conforme`, `→ Roadmap`, `— À évaluer`). Les répartitions en barre gardent leur légende textuelle.

**La règle de l'échelle bleue.** Une note se lit sur l'échelle séquentielle 0 → 5, jamais en rouge/vert. Les couleurs d'état sont réservées aux statuts, les six bleus aux notes.

## Typography

**Display Font:** aucune ; il n'y a pas de rôle d'affichage.
**Body Font:** Source Sans 3 (chargée par `next/font`, graisses 400/600/700), repli `ui-sans-serif, system-ui, sans-serif`.
**Label/Mono Font:** aucune famille distincte ; les chiffres sont tabulaires (`font-variant-numeric: tabular-nums` sur `body`, utilitaire `.tnum`).

**Character :** une seule famille compacte, humaniste et administrative ; la hiérarchie tient à la taille et à la graisse (400 pour le courant, 600 pour tout ce qui est titre, chiffre ou libellé, 700 réservé au mot-symbole « RFP Analyzer »). L'échelle est fixe en pixels : 11 / 12 / 13 / 14 / 15 / 16 / 18 / 22 / 28 / 36.

### Hierarchy
- **Headline** (600, 18 px / 24 px) : titre de chapitre dans `PageHeader`, précédé du numéro d'article en 13 px. En mode « Présenter » les titres d'article montent à 28 px.
- **Title** (600, 16 px / 22 px) : titre d'article dans la vue Décision (4.1, 4.2, 4.3), titre des blocs d'état (`PageState`), nom du fournisseur en tête de colonne d'évaluation reste à 13 px.
- **Figure** (600, 22 px / 28 px, tabulaire) : la note finale dans le panneau de renvois ; 16 px dans la colonne de réponse. Le dénominateur `/5` reste en 12–13 px 400 gris encre.
- **Body** (400, 13 px / 18 px) : texte courant des écrans refondus (réponses, analyses IA, cellules de tableau, libellés de navigation), paragraphes d'introduction limités à 70 ch. Le `body` HTML est à 14 px / 1,45 ; les composants descendent à 13 px.
- **Label** (600, 12 px / 16 px, capitales, interlettrage 0,025 em) : en-têtes de colonnes de tableau, tampons d'état, mention OBLIGATOIRE.
- **Article-no** (600, 12 px / 16 px, interlettrage 0,02 em, gris encre) : numéro d'article et code d'exigence, toujours en tête de ligne, jamais seul.
- **Meta** (400, 11 px / 14 px) : compteurs de la file de travail, sous-compte `11/12` d'une cellule de heatmap, indice de défilement.

### Named Rules
**La règle du numéro d'article.** Tout titre de chapitre, d'article, de domaine ou d'exigence commence par son numéro en `article-no`, aligné à la ligne de base du titre, séparé par 8 px.

**La règle du chiffre tabulaire.** Toute donnée numérique est en chiffres tabulaires, alignée à droite dans les tableaux, formatée en français par `lib/format.ts` (`4,0`, `52 %`, `1 h 05`, `—` pour l'absence).

## Layout

Le gabarit est celui du dossier : une barre supérieure fixe de 48 px (mot-symbole, fil d'Ariane organisation › consultation › version, thème, utilisateur), sous laquelle une bande d'analyse de 32 px n'apparaît que pendant une analyse IA ; à gauche un rail collant de 240 px (sommaire titré par la consultation, chapitres numérotés avec glyphe d'état et chiffre court, « Paramètres » séparé par un filet, retour « Toutes les consultations » en pied) ; à droite la colonne de contenu, centrée, plafonnée à 1024 px (`max-w-5xl` : préparation, analyse, suivi) ou 1152 px (`max-w-6xl` : accueil, décision, référentiel). Le mode « Présenter » de la décision lève le plafond.

Chaque chapitre s'ouvre par un `PageHeader` (numéro + titre, phrase d'introduction en 13 px gris encre limitée à 70 ch, une seule action primaire à droite) fermé par un filet. Le contenu est une suite d'articles (`<section>`) séparés par des filets, avec un en-tête d'article de 12 px de padding vertical et un corps rentré des mêmes 16 px (mobile) ou 24 px (≥ 768 px) que l'en-tête. Les tableaux sont pleine largeur, en-têtes de colonnes en capitales 12 px, lignes séparées par un filet, cellules de 8 à 10 px de padding vertical.

L'espace d'évaluation est la seule composition à trois colonnes : la file de travail à gauche (fond second plan `/40`, onglets À faire / Faites / Toutes, recherche, groupes par domaine à en-tête collant), puis les colonnes de réponse de largeur identique, une par fournisseur, séparées par des filets ; le rail 0–5 et les actions sont dans un pied de colonne à fond second plan. Le panneau de renvois de la décision est un `Sheet` de droite de 576 px maximum, plein écran sur mobile.

Rythme : grille de 4 px, valeurs utilisées 4 / 6 / 8 / 12 / 16 / 20 / 24 et 64 px (`PageState`). Hauteurs de contrôle : 28 / 32 / 36 / 40 px ; tampons 24 px ; cellule de heatmap 36 px (48 px en présentation).

Responsive : le seuil est 768 px (`md`). Sous ce seuil, le rail devient un panneau latéral gauche de 288 px derrière un bouton « Ouvrir le sommaire » dans une ligne de chapitre de 40 px ; l'espace d'évaluation supprime cette ligne, empile les colonnes de réponse, réserve un pied « Précédente / 1/3 / Suivante » et accepte le balayage ; les tableaux larges passent dans `ScrollX` (ombres de bord en filet et indication textuelle 11 px) et masquent leurs colonnes secondaires (`hidden md:table-cell`) ; les champs passent à 14 px pour éviter le zoom iOS. Impression : fond blanc, texte noir 12 px, éléments `.no-print` retirés.

## Elevation & Depth

Le système est plat. La profondeur vient de trois moyens : les filets de 1 px (`filet`), le second plan légèrement grisé pour les zones de navigation et de commande (rail, file, pieds de colonne, en-têtes collants), et le lavis bleu pour la sélection. Aucune surface de page ne porte d'ombre, aucun dégradé décoratif n'existe (le seul dégradé est le fondu de bord de `ScrollX`, du papier vers transparent sur 12 px).

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 12px 32px -12px hsl(222 30% 10% / 0.28)`, sombre : `0 12px 32px -12px hsl(0 0% 0% / 0.6)`) : réservée aux surfaces flottantes qui quittent le plan du dossier : dialogues, panneaux latéraux, popovers, menus, listes déroulantes. Les dialogues et panneaux ajoutent un voile `black/80` derrière eux.

### Named Rules
**La règle du plan unique.** Une ombre signifie « hors du dossier ». Une carte, un tableau, un en-tête ou une ligne n'en porte jamais ; seule `shadow-overlay` existe, et seulement sur ce qui flotte.

## Shapes

Rayon de base de 4 px, décliné en trois pas : 0 px (`rounded-sm` : badges, squelettes, pistes de barres, pastilles de note, cellules de heatmap, avatar d'initiales), 2 px (`rounded-md` : boutons, champs, rail 0–5, cartes, menus ; les tampons fixent explicitement 2 px) et 4 px (`rounded-lg` : dialogues uniquement). Les formes sont donc carrées à l'œil ; rien n'est en pilule ni circulaire hormis l'indicateur de chargement.

Les bordures sont des filets de 1 px : `filet` pour séparer, `filet-saisie` pour ce qui se saisit ou se clique (champs, `outline`, rail 0–5), pointillé pour la zone de dépôt de fichier. La sélection est un filet gauche de 2 px en encre bleue ; l'onglet actif, un filet bas de 2 px en encre bleue. Les glyphes d'état du sommaire sont des carrés de 14 px à rayon 2 px : plein vert coché (terminé), ocre à moitié rempli (en cours), vide à bordure `filet-saisie` (à faire), chargeur bleu en rotation (en analyse).

## Components

### Buttons
Caractère : discrets, à hauteur de ligne, un seul plein par écran.
- **Shape :** coins à peine cassés (2 px) ; texte 13 px 500 pour `md`/`lg`, 12 px pour `sm`/`xs` ; icônes Lucide 16 px (14 px en `sm`/`xs`), à 60 % d'opacité dans les variantes `outline`, `ghost`, `secondary` et `dashed`.
- **Primary :** fond encre bleue, texte papier, 36 px de haut, 12 px de padding horizontal (`lg` : 40 px / 16 px ; `sm` : 32 px / 10 px ; `xs` : 28 px / 8 px). Un seul par écran, à droite de l'en-tête de chapitre ou en pied de colonne (« Statuer », « Valider »).
- **Hover / Focus :** survol à 90 % d'opacité du fond ; focus visible en anneau de 2 px encre bleue décalé de 2 px ; transition couleur/ombre 150 ms.
- **Disabled / Loading :** 60 % d'opacité, pointeur inactif ; en chargement, l'icône est remplacée par un chargeur en rotation de même taille, le libellé reste.
- **Outline :** fond papier, filet de saisie, texte bleu ; survol en lavis bleu. C'est la variante d'action secondaire (« Imprimer », « Présenter », « Réessayer »).
- **Ghost :** sans fond ni bordure, texte bleu ; survol en lavis bleu. Actions de ligne et icônes de barre.
- **Dim :** gris encre, passe à l'encre au survol ; liens textuels de faible poids.
- **Link :** texte bleu sans padding ; les liens en ligne prennent un soulignement décalé de 2 px au survol.
- **Destructive :** fond rouge brique, texte papier ; seulement dans une confirmation.

### Stamps (tampons d'état)
- **Style :** `inline-flex`, 24 px de haut, 6 px de padding, coins 2 px, capitales 12 px 600 interlettrées ; couleur d'état pour le texte, bordure de la même teinte à 50 %, fond en lavis. `À évaluer` est gris, sans fond, bordure filet.
- **State :** toujours glyphe + libellé ; en version courte, le libellé reste pour les lecteurs d'écran et l'abréviation (C, P, NC, R, —) s'affiche. Utilisé comme filtre, un tampon inactif passe à 50 % d'opacité. Les statuts de consultation (En cours, Terminée, Archivée) réutilisent les classes partiel / conforme / à évaluer.

### Badges
- **Style :** coins 0 px, 12 px 600, 6 px de padding ; `default` = encre pleine sur papier, `secondary` = second plan, `outline` = filet. Réservés aux mentions courtes (OBLIGATOIRE), jamais à un état.

### Cards / Containers
- **Corner Style :** 2 px.
- **Background :** papier ; l'en-tête et le pied sont séparés du corps par un filet.
- **Shadow Strategy :** aucune (voir Elevation & Depth).
- **Border :** filet de 1 px.
- **Internal Padding :** 20 px ; en-tête et pied de 56 px de haut minimum. Dans les écrans refondus, la carte est rare : un article séparé par des filets lui est préféré.

### Inputs / Fields
- **Style :** 36 px de haut (32 px en contexte dense), filet de saisie, fond papier, coins 2 px, 12 px de padding horizontal, texte 13 px (14 px sous 768 px), placeholder gris encre. Zone de texte : 60 px minimum, 8 px de padding vertical.
- **Focus :** bordure encre bleue + anneau de 2 px encre bleue à 25 %, transition 150 ms.
- **Error / Disabled :** `aria-invalid` passe la bordure en rouge brique ; désactivé à 60 % d'opacité, curseur interdit.
- **Select :** même gabarit, focus en anneau de 1 px ; liste déroulante sur fond popover avec ombre overlay, option survolée en lavis bleu.

### Navigation
- **Barre supérieure :** 48 px, fond papier, filet bas ; mot-symbole 13 px 700 ; fil d'Ariane 13 px avec chevrons 14 px gris encre ; sélecteurs de consultation et de version en `outline` ; bascule de thème et menu utilisateur (initiales dans un carré 24 px second plan) en `ghost`.
- **Sommaire (rail) :** 240 px, fond second plan à 60 %, titre 13 px 600 sur deux lignes maximum avec statut 12 px gris dessous. Chaque chapitre : numéro `article-no` aligné à droite sur 16 px, libellé 13 px 500, chiffre court 12 px gris, glyphe d'état 14 px. Repos : filet gauche transparent ; survol : lavis bleu 60 % ; actif : filet gauche 2 px encre bleue + lavis bleu + texte bleu (`aria-current="page"`). Sous-entrées rentrées à 36 px, gris encre, actives en encre avec filet gauche bleu. Transition 150 ms.
- **Onglets :** liste à filet bas, déclencheurs 36 px, texte 13 px 500 gris encre, actif en encre avec filet bas de 2 px bleu ; les compteurs sont en 12 px gris tabulaire. Même dessin pour les filtres de l'accueil et de la file de travail.
- **Bande d'analyse :** 32 px, fond lavis bleu, texte bleu ; chargeur 14 px, compteur tabulaire, estimation en gris, lien « Suivre » souligné à droite, barre de progression de 2 px encre bleue au bord bas (transition de largeur 500 ms). En échec : fond lavis rouge, bordure rouge à 40 %, texte rouge.
- **Mobile :** ligne de chapitre de 40 px (bouton menu `ghost` + numéro + libellé courant) ; sommaire dans un panneau gauche de 288 px.

### Rail de notation 0–5 (signature)
Le geste unique de l'expert. Un groupe `role="group"` « Note sur 5 » : six cellules contiguës de 32 × 34 px (28 × 28 px en `sm`) dans un cadre à filet de saisie, séparées par des filets, chiffres 13 px 600 tabulaires. Repos : papier ; survol : lavis 60 % ; note manuelle : encre bleue pleine, chiffre papier (`aria-pressed`) ; note IA non confirmée : lavis bleu, chiffre bleu ; proposition IA sur une autre cellule : trait de 2 px encre bleue à 60 % au bas de la cellule. À droite, une cellule « ½ » de même gabarit (active en lavis), puis, quand la note est manuelle, un lien 12 px « IA 4,0 » ou « Effacer » qui revient à la proposition. Désactivé : 60 % d'opacité. Le statut se déduit de la note et se lit dans le tampon d'en-tête, modifiable par un menu.

### Renvoi (signature)
Tout score est un lien vers sa preuve. En tête de colonne, la note (16 px 600 tabulaire) est soulignée en filet fin décalé de 4 px ; le soulignement passe en encre bleue au survol, une carte au survol (288 px, 12 px, ombre overlay) montre le document, la page et l'extrait entre guillemets français, puis « Cliquer pour ouvrir à la page ». Dans la décision, une cellule de heatmap survolée ou focalisée prend un contour de 2 px encre bleue (transition 150 ms) ; le clic ouvre le panneau de renvois dont l'en-tête est le fil « Renvois » (12 px gris, chevrons 12 px, numéros d'article, dernier maillon en encre) ; les lignes du panneau se survolent en lavis 40 %, les titres d'exigence sont bleus et se soulignent ; les preuves sont des liens « Document · p. 12 » avec l'extrait en gris dessous.

### Tableaux du dossier
En-tête de colonnes 12 px capitales 600 gris encre ; lignes séparées par un filet, padding vertical 8–10 px ; survol de ligne en lavis 40 % (150 ms) quand la ligne est cliquable ; la première colonne porte le numéro d'article ; les nombres sont alignés à droite ; une barre de progression est une piste second plan de 6–8 px, coins 0 px, remplie d'encre bleue ; les répartitions de statut sont une barre segmentée de 128 × 8 px avec légende textuelle. Un tableau plus large que l'écran est enveloppé dans `ScrollX`.

### États de page (`PageState`)
Un seul dessin pour vide, chargement et erreur : bloc de 448 px maximum, aligné à gauche, 64 px de padding vertical, icône 20 px (chargeur bleu en rotation, triangle rouge, boîte grise), titre 14 px 600, description 13 px gris, une action. Les squelettes sont des rectangles second plan à coins 0 px en pulsation. Les vides de tableau sont une phrase grise dans la première cellule ; les vides de zone, une phrase 13 px gris en italique.

### Surfaces flottantes
Dialogue : papier, filet, coins 4 px, 24 px de padding, ombre overlay, 512 px maximum, entrée fondu + zoom 95 % sur 200 ms. Panneau latéral (`Sheet`) : papier, filet, ombre overlay, glisse depuis le bord (ouverture 500 ms, fermeture 300 ms), 384 px maximum (576 px pour le panneau de renvois). Popover 288 px et menus : fond popover, filet, coins 2 px, ombre overlay, éléments 13 px de 30 px de haut survolés en lavis bleu.

## Do's and Don'ts

### Do:
- **Do** commencer tout titre de chapitre, d'article ou d'exigence par son numéro en `article-no` (12 px 600 gris encre), séparé du titre par 8 px.
- **Do** séparer les blocs par un filet de 1 px `filet` ; un article est une `<section>` fermée par un filet, pas une carte.
- **Do** réserver l'encre bleue pleine à l'unique bouton primaire, à la note manuelle, au filet de sélection de 2 px et aux barres de progression ; utiliser le lavis bleu pour la sélection et le survol.
- **Do** accompagner toute couleur d'état d'un glyphe et d'un libellé (tampon `.stamp`) ; lire les notes sur l'échelle bleue 0 → 5, jamais en rouge/vert.
- **Do** écrire tout nombre en chiffres tabulaires et au format français via `lib/format.ts` (`4,0`, `52 %`, `27 févr. 2026`, `—` pour l'absence).
- **Do** limiter le mouvement à 150 ms de transition de couleur ou de bordure sur changement d'état, et à la rotation du chargeur ; honorer `prefers-reduced-motion`.
- **Do** rendre chaque état vide, en chargement ou en erreur par `PageState` ou par une phrase grise à sa place ; une seule action par état.
- **Do** utiliser le vocabulaire métier (consultation, exigence, domaine, fournisseur, pondération, soutenance, référentiel, livrable) dans un ton neutre, sans point d'exclamation.

### Don't:
- **Don't** introduire une deuxième couleur d'action, un dégradé, ou une ombre sur une surface de page ; `shadow-overlay` n'existe que pour ce qui flotte.
- **Don't** dépasser 4 px de rayon ; pas de pilule, pas de cercle hors chargeur.
- **Don't** composer un chapitre en grille de cartes KPI ni en barre d'onglets multiple ; le sommaire de gauche est la seule navigation de chapitre.
- **Don't** utiliser une valeur de couleur brute (`slate-*`, hex) dans un écran refondu ; toute couleur passe par les variables de `styles/globals.css`.
- **Don't** ajouter une séquence d'entrée, un effet de survol par translation ou une animation décorative.
- **Don't** montrer un score sans son renvoi : un score est un lien vers l'extrait cité et le document à la page.
