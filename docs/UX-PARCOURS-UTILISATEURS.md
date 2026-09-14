# Parcours utilisateurs — RFP Analyzer

Cartographie UX des parcours et de leurs variantes, par persona.

---

## 1. Liste des parcours

### Accès & compte

- **Rejoindre une organisation par code** — tout nouvel arrivant (Marc, Claire)
- **Se connecter et reprendre son travail** — toutes les personas
- **Changer d'organisation active** — utilisateur multi-organisations

### Administration

- **Créer et administrer une organisation** — Nadia (administratrice)
- **Inviter et gérer les membres** — Nadia
- **Générer un jeton d'accès personnel** — Thomas (power user)

### Cadrage & préparation

- **Créer une consultation** — Sophie (pilote)
- **Être guidé par le hub de préparation** — Sophie
- **Déposer les documents (cahier des charges, réponses)** — Sophie
- **Importer le référentiel depuis un document** — Sophie
- **Importer le référentiel via l'assistant en 4 étapes** — Sophie
- **Importer le référentiel via un agent externe** — Thomas
- **Relire et corriger l'arborescence des exigences** — Sophie
- **Déclarer les fournisseurs consultés** — Sophie
- **Importer les réponses fournisseurs** — Sophie

### Analyse & paramétrage

- **Lancer l'analyse IA de la consultation** — Sophie
- **Relancer l'analyse d'une réponse isolée** — Sophie
- **Configurer les pondérations par domaine** — Sophie
- **Assigner les analystes aux domaines** — Sophie
- **Activer le circuit de peer review** — Sophie

### Évaluation

- **Évaluer les réponses côte à côte** — Marc (expert métier)
- **Vérifier la preuve dans le document source** — Marc
- **Gérer sa file de travail par filtres** — Marc
- **Évaluer en mobilité et hors ligne** — Marc
- **Discuter une réponse dans un fil de commentaires** — Marc et Sophie
- **Soumettre une exigence à validation** — Marc
- **Valider ou rejeter une soumission** — Sophie
- **Éditer en masse le référentiel (tags, marqueurs, déplacements)** — Sophie

### Pilotage

- **Suivre l'avancement des analystes** — Sophie
- **Lire la synthèse et les heatmaps** — Sophie, Claire (sponsor)
- **Configurer un radar comparatif** — Sophie

### Volet financier

- **Définir le template de coûts** — Sophie
- **Saisir ou importer les versions d'offres** — Sophie
- **Comparer les offres et commenter les cellules** — Sophie, Claire

### Soutenances

- **Générer le brief de soutenance par fournisseur** — Sophie
- **Importer un transcript ou un enregistrement de soutenance** — Sophie
- **Exploiter le rapport et les suggestions** — Sophie, Marc

### Versions & restitution

- **Gérer les versions de la consultation** — Sophie
- **Suivre le statut par fournisseur et par version** — Sophie
- **Configurer et prévisualiser l'export** — Sophie
- **Générer le livrable final** — Sophie, Claire

---

## 2. Cadre : la macro-journey du produit

Six phases traversent toutes les personas. Chaque persona n'en parcourt qu'une partie, et c'est là que se jouent les variantes.

**Cadrer** → **Préparer le référentiel** → **Analyser (IA)** → **Évaluer** → **Arbitrer** → **Restituer**

Le produit est mono-objet : tout tourne autour d'une consultation qui progresse dans ces phases. La friction structurelle, c'est que la navigation n'exprime pas cette progression — l'utilisateur arrive sur un écran de synthèse à dix onglets quelle que soit la phase où il se trouve.

---

## 3. Sophie, pilote de la consultation *(owner)*

**Job-to-be-done :** « Je dois faire converger 6 fournisseurs, 150 exigences et 5 experts vers une décision défendable, sans y passer mes nuits. »

**Fréquence :** quotidienne pendant 4 à 8 semaines, puis plus rien.

**Ce qui la stresse :** la qualité de l'import (*garbage in, garbage out*) et le fait de ne pas savoir où en sont ses évaluateurs.

### Parcours nominal

| Étape | Ce qu'elle fait | Le moment de vérité |
|---|---|---|
| Créer | Titre + description, et la consultation existe | Écran vide : elle ne sait pas encore ce qu'elle doit fournir |
| Préparer | Un hub lui indique la prochaine action : cahier des charges → fournisseurs → réponses | **Le hub est le meilleur écran du produit** — le seul qui dit « voilà où tu en es et quoi faire ensuite » |
| Structurer | Le document est découpé en domaines / exigences, qu'elle relit et corrige dans une arborescence éditable | Elle découvre la qualité réelle du parsing ; point de rupture n°1 |
| Lancer l'IA | Un bouton, puis une attente asynchrone | Aucun repère de durée ni de coût — elle relance ou abandonne |
| Paramétrer | Pondérations, assignation des experts, activation du peer review | Choix structurants faits *avant* d'avoir vu la matière : elle y reviendra |
| Superviser | Tableau de bord, heatmaps, avancement par analyste | Ce qu'elle veut vraiment : « qui est en retard, et sur quoi » |
| Arbitrer | Grille financière, versions d'offres, comparatif | Le seul endroit où technique et prix se rencontrent |
| Restituer | Brief de soutenance, puis export du livrable | Fin de cycle : elle quitte le produit avec un document |

### Variantes de parcours

- **Chemin « document » vs chemin « tableur ».** Selon que le cahier des charges arrive en texte structuré ou en fichier de données, elle emprunte soit l'import documentaire avec mapping de colonnes, soit un assistant en quatre temps (structure → exigences → fournisseurs → réponses). Deux modèles mentaux coexistent pour la même intention : *remplir mon référentiel*.
- **Chemin « je délègue à mon agent ».** Sophie technophile génère un jeton et fait faire tout l'import par un assistant IA externe. Le parcours écran disparaît quasi entièrement — mais le retour dans l'interface se fait sans transition ni confirmation de ce qui a été créé.
- **Consultation itérative.** Si les fournisseurs re-soumettent, elle bascule en gestion de versions : le même dossier porte plusieurs états, avec un statut par fournisseur. Le sélecteur de version devient un contexte global silencieux — risque classique d'« où suis-je ? ».
- **Consultation sans volet financier ni soutenance.** Les onglets restent visibles et vides : le produit ne s'adapte pas au périmètre réel.

### Frictions à traiter

1. Deux écrans d'accueil quasi identiques coexistent — l'utilisateur ne sait pas lequel fait foi.
2. Les onglets de la synthèse mélangent pilotage quotidien et configuration *one-shot* ; trois d'entre eux sont déjà relégués derrière un menu « Plus », signal que la barre a dépassé sa capacité.
3. L'attente IA n'est pas scénarisée : ni estimation, ni état intermédiaire lisible, ni notification de fin.

---

## 4. Marc, expert métier *(evaluator)*

**Job-to-be-done :** « On m'a assigné 40 exigences sur mon domaine. Je veux comparer les fournisseurs vite, dire ce que j'en pense, et qu'on me fiche la paix. »

**Fréquence :** 2 à 3 sessions de 1 à 2 heures, souvent en réunion ou en déplacement.

**Ce qui le stresse :** ne pas retrouver dans quel document le fournisseur a dit ce que l'IA prétend qu'il a dit.

### Parcours nominal

Il entre **directement dans l'écran d'évaluation** — c'est son unique écran. Sa boucle est courte et répétitive :

> filtrer → choisir une exigence → lire les réponses côte à côte → vérifier dans le document → noter et statuer → commenter → suivante

Points remarquables de cette boucle :

- La sidebar filtrante (statut, plage de note, présence de questions ou de commentaires) est en réalité son **outil de gestion de charge** : elle répond à « qu'est-ce qu'il me reste à faire ». Elle n'est pas positionnée comme telle.
- La double notation — score IA et score manuel, plus un statut qualitatif (conforme / partiel / non conforme / roadmap) — impose trois décisions là où il en attend une.
- L'accès au document annotable est le geste de confiance : c'est ce qui fait passer l'IA du statut de « verdict » à celui de « brouillon ».

### Variantes de parcours

- **Marc en mobilité.** Cartes fournisseurs empilées, gestes tactiles, file d'attente hors ligne rejouée au retour du réseau. Le parcours mobile est un parcours de *saisie rapide*, pas de comparaison — le côte-à-côte n'y survit pas.
- **Marc en désaccord.** Il ouvre un fil de discussion sur une réponse, avec priorité et résolution. Le parcours devient asynchrone et social : il attend une réponse d'un pair. Rien ne le ramène au fil quand quelqu'un répond.
- **Marc sous peer review.** Il ne « termine » plus une exigence : il la **soumet**, et attend une validation. Son sentiment d'avancement change de nature — un travail fini peut revenir en arrière. C'est la variante qui mérite le plus de soin sur le feedback d'état.
- **Marc bloqué par les droits.** Les fonctions IA lui sont refusées ; il voit des affordances qu'il ne peut pas activer. Impasse de permission à remplacer par une demande adressée au pilote.

---

## 5. Claire, sponsor / décideur *(viewer)*

**Job-to-be-done :** « Montrez-moi qui gagne et pourquoi, en cinq minutes, avec de quoi le justifier en comité. »

**Fréquence :** 2 ou 3 fois sur tout le projet, dont une juste avant la décision.

### Parcours nominal

Entrée par un lien qu'on lui a envoyé → synthèse → heatmap par domaine → écart entre le mieux-disant technique et le mieux-disant financier → export.

C'est un parcours **de consultation pure, en lecture, sans état à maintenir**. Or elle atterrit dans la même interface à onglets que Sophie, avec des actions d'édition partout qui ne la concernent pas.

### Variantes

- **Claire en comité**, sur vidéoprojecteur : besoin d'une vue plein écran, peu dense, une idée par écran. Le radar comparatif et les heatmaps sont les bons artefacts — ils ne sont pas assemblés en une vue de présentation.
- **Claire après soutenances** : elle veut le brief par fournisseur et les points de vigilance issus des transcripts, pas la matrice complète.
- **Claire sceptique** : elle veut redescendre d'un score agrégé vers l'exigence puis vers la citation dans le document. Ce chemin de *drill-down jusqu'à la preuve* existe techniquement mais n'est pas offert comme un parcours continu.

---

## 6. Nadia, administratrice de l'organisation

**Job-to-be-done :** « Faire entrer les bonnes personnes, avec les bons droits, sans ticket au support. »

**Fréquence :** par à-coups, à chaque nouveau projet.

### Parcours nominal

Créer l'organisation → récupérer un code à 10 chiffres → le diffuser → les collègues s'inscrivent en le saisissant → ajuster les rôles et retirer les partants.

### Variantes et frictions

- **Onboarding par code** plutôt que par invitation e-mail : le parcours est **hors produit** entre le moment où elle copie le code et celui où le collègue arrive. Aucun accusé de réception, aucune liste des invitations en attente. C'est le trou noir du parcours d'adoption.
- **Deux systèmes de droits superposés** — le rôle dans l'organisation et le niveau d'accès sur chaque consultation. Nadia donne un rôle, Sophie donne l'accès réel. Personne ne voit la résultante des deux, ce qui produit les impasses vécues par Marc.
- **Le rôle « lecteur » n'a pas d'expérience dédiée** : c'est un évaluateur à qui l'on a retiré des boutons.

---

## 7. Thomas, power user automatisation

**Job-to-be-done :** « Je ne veux pas ressaisir : je branche mon assistant sur la plateforme. »

### Parcours nominal

Générer un jeton personnel → le copier une seule fois → le configurer dans son client → piloter la consultation en langage naturel (créer, importer la structure, injecter les réponses, relire la matrice de scoring, récupérer les briefs).

### Variantes

- Import massif initial — le cas dominant.
- Enrichissement en cours de route.
- Extraction pour reporting externe.

### Friction

Ce parcours puissant est traité comme un réglage technique enfoui dans les préférences, alors qu'il devrait être proposé au moment exact où l'utilisateur souffre — c'est-à-dire pendant l'import manuel.

---

## 8. Recommandations prioritaires

1. **Faire de la progression le squelette de la navigation.** Le hub de préparation prouve que le produit sait guider ; étendre ce principe à tout le cycle de vie, et n'afficher un onglet que lorsqu'il a du sens à cette phase.
2. **Séparer pilotage et configuration.** Le suivi et les réglages structurants (pondérations, périmètre, circuit de validation) n'ont pas la même fréquence d'usage et ne devraient pas partager la même barre.
3. **Concevoir un vrai parcours de lecture pour le sponsor**, distinct de l'espace de travail : une vue de décision, avec drill-down jusqu'à la citation source.
4. **Réduire la boucle d'évaluation à un geste.** Fusionner statut et note, ou rendre l'un déductible de l'autre, et faire de la sidebar une véritable file de travail personnelle.
5. **Fermer la boucle d'onboarding** : passer du code à diffuser à une invitation traçable, et exposer les droits effectifs résultant des deux niveaux.
6. **Scénariser les attentes IA** : état, durée estimée, notification de fin, reprise là où on s'était arrêté.
