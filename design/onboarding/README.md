# Onboarding d'un appel d'offres — parcours cible

Canvas : https://claude.ai/code/artifact/c8b663db-e27e-47c1-9ba1-ae48b1e46944

Maquettes statiques du parcours d'entrée d'un AO : création, ingestion du
cahier des charges, fournisseurs, réponses fournisseurs et pièces jointes.
Les fichiers `.dc.html` sont les planches, `canvas.json` leur mise en page.

## Ce qu'on remplace

Aujourd'hui le chemin nominal est `/dashboard/rfp/[rfpId]/import` :
un stepper en 4 étapes où l'on colle du JSON brut dans un éditeur de code
(structure, exigences, puis une zone JSON par fournisseur pour les réponses).
À côté, deux autres parcours font le même travail sans se connaître :
la modale `DocxImportModal`, accessible seulement depuis la page « summary »,
et les outils MCP (`import-structure`, `import-requirements`,
`import-supplier-responses`).

Nos utilisateurs sont des acheteurs, pas des développeurs.

## Le parti pris

Plus aucun JSON sur le chemin nominal. Chaque bloc accepte le format dans
lequel la matière arrive réellement — un `.docx` de CCTP, un classeur Excel
rempli par le fournisseur, des PDF. Le JSON reste disponible, replié, à côté
du chemin Claude/MCP : les trois voies deviennent des variantes d'un même
bloc au lieu de trois parcours concurrents dans trois endroits de l'app.

## Les planches

Page **Parcours** (haute fidélité, vocabulaire visuel de l'app existante) :

| Planche | Écran |
| --- | --- |
| `Creation.dc.html` | Création de l'AO, avec dépôt du cahier des charges dans la foulée |
| `Main.dc.html` | Plan de préparation — remplace le stepper `/import` |
| `CahierDesCharges.dc.html` | Import du CCTP : dépôt, règles de reconnaissance, aperçu de l'arborescence |
| `Fournisseurs.dc.html` | Liste des fournisseurs, collage depuis Excel, envoi de la grille |
| `Reponses.dc.html` | Dépôt d'un fournisseur : grille + PDF, et rapprochement avec les exigences |

Page **Directions** (wireframes) : les trois structures envisagées.
`DirectionA` (le plan de préparation) est celle construite en haute fidélité ;
`DirectionB` (l'assistant linéaire) est le plus petit écart avec le code
actuel ; `DirectionC` (la corbeille de dépôt) décrit ce que fait déjà le
serveur MCP. Chacune porte son gain et son coût.

## Trois décisions à trancher

1. **Le stepper linéaire disparaît** au profit d'un plan où les quatre blocs
   affichent leur état et se remplissent dans n'importe quel ordre — un AO ne
   se déroule pas en ligne droite : le CCTP arrive des semaines avant les
   réponses, qui arrivent en ordre dispersé.
2. **La création de l'AO absorbe le premier import**, pour que l'AO naisse
   avec son contenu plutôt que vide.
3. **Le rapprochement est l'écran qui manque le plus** : il remplace « une
   zone JSON par fournisseur » en assumant que le fichier reçu ne colle jamais
   parfaitement. L'écart devient une file de vérification, pas une erreur de
   parsing.

## Faisabilité

`DocxImportModal` fait déjà l'essentiel du travail de l'écran « cahier des
charges » (config → mapping des catégories → aperçu → import). La refonte le
promeut en chemin principal plus qu'elle n'invente de la mécanique.

Le contenu affiché dans les planches (« Refonte du poste de travail »,
Atos / Capgemini / Econocom / SCC, 184 exigences) est un jeu d'exemple.
