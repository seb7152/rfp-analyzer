# Décisions — refonte UX/UI

Journal tenu au fil de l'eau. Une entrée par décision : la décision, le parcours et le persona concernés (référence à `docs/UX-PARCOURS-UTILISATEURS.md`, noté « doc UX »), les options écartées et pourquoi, ce qui rendrait la décision caduque.

Format des entrées : **D-nn — Titre**.

---

## D-01 — Branche de travail : `refonte-ui` depuis `main`, avec reprise du commit du hub de préparation

- **Décision.** `refonte-ui` est créée depuis `main` (bfb77ba). Le commit `df3100d` de `feat/preparation-hub` (hub de préparation, endpoint `/api/rfps/[rfpId]/preparation`, hook `use-preparation`) est repris par cherry-pick.
- **Parcours / persona.** Parcours 1 (Sophie). Le doc UX §3 décrit le hub comme « le meilleur écran du produit » et le brief exige un hub guidé ; `main` ne le contient pas.
- **Options écartées.** Brancher depuis `feat/preparation-hub` (contredit la consigne « depuis main ») ; réécrire le hub sans reprendre le commit (perte d'un endpoint serveur déjà testé).
- **Caduque si.** `feat/preparation-hub` est fusionnée dans `main` avant `refonte-ui` : le cherry-pick devient un no-op au merge.

## D-02 — Aucune sollicitation de l'utilisateur pendant la refonte ; PRODUCT.md inféré du brief

- **Décision.** Le skill `impeccable` demande une interview produit et une page de décision de direction visuelle. Le brief demande explicitement de trancher seul. `PRODUCT.md` est écrit à partir du brief et du doc UX, avec les faits inférés marqués *(inféré)* ; la direction visuelle est choisie par le tirage du script `concept-seed` (clé `e0593683`, index assigné 5) et documentée ici (D-03) plutôt que soumise sur la page de décision.
- **Parcours / persona.** Tous.
- **Options écartées.** Bloquer sur l'interview (contraire au brief) ; ignorer le tirage du skill (contraire à la méthode imposée).
- **Caduque si.** L'utilisateur relit PRODUCT.md et corrige un fait inféré : mettre à jour le fichier et les écrans concernés.

## D-03 — Direction visuelle : « le dossier de consultation » (typographie administrative à articles numérotés)

- **Décision.** Les sept candidats ancrés dans l'univers des consultants et acheteurs, classés par résonance, étaient : (1) la grille de dépouillement du jury, (2) le plan d'exécution avec cartouche et tableau de révisions, (3) la note de synthèse / le PV de commission, (4) le terminal de salle de marché, (5) **le DCE et l'avis de marché : typographie administrative française à articles numérotés**, (6) le classeur physique à intercalaires, (7) le diagramme de ligne de progression. Le tirage assigne le n° 5, retenu.
  - *Monde.* Papier blanc (thème clair) ou papier charbon (thème sombre), encre quasi noire, un seul accent institutionnel (bleu encre) pour l'action primaire et la sélection, quatre couleurs d'état réservées aux statuts (conforme, partiel, non conforme, roadmap) toujours accompagnées d'un glyphe et d'un libellé. Séparateurs en filets de 1 px, pas d'ombre portée, rayon 2 px. Une seule famille : Source Sans 3, chiffres tabulaires pour toute donnée.
  - *Composition.* Hiérarchie par numérotation d'articles : consultation → chapitre (phase) → domaine (1., 1.1) → exigence (1.1.3). Le rail gauche est un sommaire : les six phases sont des chapitres numérotés dont l'état (fait, en cours, à venir) est lisible.
  - *Contrôles et états.* Statuts sous forme de « tampons » carrés ; sélection = encre pleine inversée ; un seul bouton primaire par écran.
  - *Interaction signature.* Le renvoi : tout score est un lien qui remonte à la citation source (survol : extrait ; clic : document ouvert à la page). Le fil d'Ariane du sponsor est la chaîne des renvois : score global › domaine › exigence › citation.
  - *Motion.* Aucune motion décorative ; 150 ms sur les changements d'état ; pas de séquence d'entrée.
- **Challengers du tirage et verdicts** (deux axes : identification du public, clarté du produit).
  - Alphabet storm : refusé. Apport retenu : la hiérarchie portée par la taille et la graisse seules, sans boîtes.
  - Cyclorama dawn : refusé. Apport retenu : chaque état porte un libellé et un glyphe, la couleur n'est jamais le seul signal.
  - Oscilloscope : compétitif sur la clarté (plusieurs signaux sur une même grille = comparaison des fournisseurs sur une même exigence). Apport retenu : toutes les notes sont lues sur la même échelle fixe, en colonnes de largeur identique.
  - HyperCard : refusé. Apport retenu : lecture et saisie dans le même objet, pas de modale pour noter.
  - Folio botanique : refusé. Apport retenu : mêmes échelle et fond pour chaque planche, donc chaque colonne fournisseur.
  - Creator hardware bench : compétitif sur la clarté (une seule touche orange = une seule action engagée). Apport retenu : une action primaire par écran, et un bandeau d'état dédié pour l'asynchrone (analyse IA).
- **Parcours / persona.** Les trois parcours.
- **Options écartées.** La sortie « canon » (tableau de bord shadcn à cartes et onglets) : c'est précisément la forme que le doc UX et le brief rejettent. Le terminal de salle de marché (n° 4) : fond sombre par défaut incompatible avec l'usage en comité sur vidéoprojecteur (doc UX §5).
- **Caduque si.** Le produit adopte une charte graphique d'entreprise : les tokens de `styles/globals.css` sont le seul point de changement.

## D-04 — Fondations : une palette, une échelle typographique, une échelle d'espacement, une seule librairie

- **Décision.** Tous les tokens vivent dans `styles/globals.css` (papier/encre, accent bleu encre `--primary`, quatre couleurs d'état `--status-*` avec variante « soft », échelle séquentielle des notes `--scale-0..5`, ombre d'overlay unique). Thème sombre = mêmes rôles, valeurs inversées. Typographie : Source Sans 3 (une seule famille, chiffres tabulaires par défaut), échelle fixe 11/12/13/14/15/16/18/22/28/36 px (`tailwind.config.ts`). Espacement : grille 4 px de Tailwind, valeurs 1–16 seulement. Rayon 4 px (`md` = 2 px), aucune ombre portée hors overlays. Composants : la librairie shadcn/Radix de `components/ui` reste la seule ; `button`, `card`, `input`, `textarea`, `badge`, `tabs`, `dialog`, `sheet`, `popover`, `select`, `dropdown-menu` ont été ramenés aux tokens (plus d'ombres, plus de `slate-*` en dur). MUI n'est plus importé par aucun écran atteignable (il ne servait que la page `synthesis`, désormais redirigée).
- **Parcours / persona.** Les trois.
- **Options écartées.** Remplacer shadcn par une nouvelle librairie (coût sans bénéfice pour un outil dense ; les primitives Radix sont accessibles). Conserver Inter (police par défaut des gabarits générés ; Source Sans 3 garde une largeur compacte et des chiffres tabulaires natifs).
- **Caduque si.** Une charte d'entreprise impose une police ou une palette : seuls `globals.css` et `app/layout.tsx` changent.

## D-05 — Modèle de navigation : le sommaire de la consultation

- **Décision.** La progression est le squelette (doc UX §2 et reco n° 1). Une consultation est un dossier dont le rail gauche (240 px) est le sommaire : **1 Préparation** (sous-entrées Référentiel, Documents), **2 Analyse IA**, **3 Évaluation** (sous-entrée Avancement), **4 Décision** (sous-entrées Financier, Soutenances), **5 Restitution**, puis **Paramètres** séparé par un filet. Chaque chapitre porte un glyphe d'état (à faire / en cours / terminé / en analyse) et un chiffre court. Sur mobile, le rail est un panneau latéral derrière un bouton ; l'espace d'évaluation n'affiche pas la ligne de chapitre pour garder l'écran. Le rail dépend du rôle : le pilote voit tout ; l'expert voit Évaluation, Décision, Restitution ; le lecteur voit Décision et Restitution. Ouvrir `/dashboard/rfp/[id]` sans chapitre redirige vers le chapitre pertinent (`landingHref`) : lecteur → Décision, expert → Évaluation, pilote → premier chapitre inachevé.
- **Parcours / persona.** Tous ; répond aux frictions 1 et 2 du doc UX §3.
- **Options écartées.** Barre d'onglets horizontale (c'est l'existant à dix onglets) ; stepper linéaire bloquant (Sophie revient en arrière, doc UX « elle y reviendra »).
- **Caduque si.** Une septième phase apparaît (ex. négociation) : ajouter un chapitre dans `buildChapters`.

## D-06 — Sort des dix onglets de la synthèse

- **Décision.** `summary/page.tsx` devient une table de redirection ; chaque onglet a un chapitre hôte : Tableau de bord → `/suivi` ; Pondérations, Analystes, Versions, Paramètres → `/parametres` (sections ancrées) ; Exigences → `/referentiel` ; Analyse (heatmaps) → `/decision` ; Soutenances → `/soutenances` ; Export → `/export` ; Financier → `/financial-grid`. Les composants d'origine (`WeightsTab`, `AnalystsTab`, `SettingsTab`, `VersionsTab`, `SuppliersTab`, `RequirementsTab`, `ExportTab`, `PresentationAnalysisSection`) sont hébergés tels quels dans le nouveau shell. Aucune fonction supprimée. `/dashboard/overview`, `/synthesis` et `/import` redirigent.
- **Parcours / persona.** Sophie (pilotage vs configuration, reco n° 2).
- **Options écartées.** Réécrire chaque onglet dans le nouveau style (hors périmètre : ce sont des écrans de configuration).
- **Caduque si.** Les hôtes sont refondus un à un : supprimer alors la redirection correspondante.

## D-07 — Trois décisions par exigence ramenées à un geste : la note

- **Décision.** Le geste de l'expert est la note (rail 0–5, demi-point par la touche ½). Le statut qualitatif en découle (`lib/scoring.ts` : ≥ 4 conforme, 2 à 3,5 partiel, < 2 non conforme ; `roadmap` reste un tampon explicite choisi dans le menu du tampon). Cliquer une note écrit en **une seule requête** `manual_score`, `status` dérivé et `is_checked = true`. « Valider » confirme la proposition IA sans saisir de note (statut dérivé de la note IA, `is_checked = true`). « IA x,x » ramène à la note IA. Le tampon reste modifiable à la main pour les cas limites.
- **Parcours / persona.** Marc (doc UX §4, reco n° 4).
- **Options écartées.** Dériver la note du statut (perte d'information, la pondération a besoin d'un nombre) ; supprimer la note manuelle (fonction existante).
- **Caduque si.** Le métier veut des seuils différents : ils sont dans `deriveStatus`, seul endroit.

## D-08 — La sidebar devient la file de travail

- **Décision.** Le panneau gauche de l'évaluation est une file : onglets **À faire / Faites / Toutes** avec compteurs (une exigence est « faite » quand toutes ses réponses sont `is_checked`), recherche, filtres persistés par consultation (domaines, statut, plage de note, question, commentaire, discussion ouverte, fournisseur). Les exigences sont groupées par domaine avec en-tête collant ; la sélection est un filet d'encre de 2 px. ← → (ou j/k) passent à l'exigence suivante ; la réponse suivante est préchargée. L'URL porte `requirementId` (partageable) et `supplierId` (file d'un seul fournisseur).
- **Parcours / persona.** Marc.
- **Options écartées.** Filtre « mes exigences » par assignation : le modèle de données n'assigne pas par domaine (proposé dans REFONTE.md).
- **Caduque si.** L'assignation par domaine arrive : ajouter un onglet « Les miennes ».

## D-09 — Comparaison côte à côte, saisie rapide en mobile, preuve à un clic

- **Décision.** Desktop : une colonne par fournisseur (300 px minimum, défilement horizontal au-delà), même échelle et même largeur pour tous (apport « folio botanique »). Mobile : les fournisseurs sont empilés, navigation par boutons Précédente/Suivante et par balayage. La preuve : signets du fournisseur listés sous la réponse (document, page, extrait), clic → document ouvert à la page (panneau PDF sur desktop, nouvel onglet sur mobile) ; bouton documents du fournisseur ; lien « Ouvrir dans le cahier des charges (p. N) » dans le détail de l'exigence.
- **Parcours / persona.** Marc (« le geste de confiance », doc UX §4).
- **Options écartées.** Cartes accordéon (l'existant ; cache la comparaison).
- **Caduque si.** Les réponses portent un jour leur citation (proposition REFONTE.md) : la remplacer par le renvoi direct.

## D-10 — Hors ligne : la mutation s'exécute hors réseau et se met en file

- **Décision.** `useResponseMutation` passe en `networkMode: "always"` et n'attend plus l'annulation des requêtes en vol : sans cela React Query mettait la mutation en pause jusqu'au retour du réseau et la file locale n'était jamais alimentée (constaté au test Playwright). L'indicateur « Hors ligne · n en attente » vit dans la barre du chapitre ; la file est rejouée au retour du réseau par `useOfflineSync` (inchangé).
- **Parcours / persona.** Marc en mobilité.
- **Caduque si.** Un service worker prend le relais.

## D-11 — Scénarisation de l'attente IA

- **Décision.** Avant : un dialogue nomme le périmètre, le volume et un ordre de grandeur de durée. Pendant : une ligne d'état sous la barre supérieure (« Analyse IA en cours · 120/648 réponses notées · environ 4 min restantes »), alimentée par le nombre réel de réponses portant une note IA (rafraîchi toutes les 5 s) ; l'estimation vient du débit mesuré ; le titre de l'onglet porte le pourcentage ; le chapitre 2 détaille par fournisseur. Après : toast, notification navigateur si autorisée, invalidation des réponses. En échec : ligne rouge avec lien vers le chapitre.
- **Parcours / persona.** Sophie (friction 3, reco n° 6).
- **Options écartées.** Se fier à `analysis_status.processedResponses` (jamais écrit par les callbacks ; proposition de correction dans REFONTE.md).
- **Caduque si.** Les callbacks écrivent l'avancement : la ligne d'état lira le champ au lieu de compter.

## D-12 — Vue sponsor : « Décision », une page de lecture, un chemin de renvois

- **Décision.** `/decision` est la page d'atterrissage du lecteur et le chapitre 4 du pilote. Quatre articles : 4.1 classement technique (moyenne pondérée, couverture, répartition des statuts), 4.2 notes par domaine (heatmap sur l'échelle séquentielle bleue, jamais rouge/vert seul), 4.3 technique et financier (écart entre mieux-disant technique et financier sur le TCO 3 ans, ou état « volet financier non renseigné »), export du livrable en en-tête (génération XLSX si une configuration existe ; pour un lecteur sans configuration : « Export non configuré »). Le drill-down est un panneau latéral dont le fil d'Ariane est la chaîne de renvois : fournisseur › domaine › exigence › réponse › citation (signets) › document à la page. Mode « Présenter » : plein écran, une idée par écran, typographie agrandie. Impression : styles print.
- **Parcours / persona.** Claire (doc UX §5, reco n° 3).
- **Options écartées.** Réutiliser les onglets Analyse du pilote (actions d'édition partout) ; un radar par défaut (le radar existant dépend de configurations par étiquettes, reste accessible via `/test`).
- **Caduque si.** Une restitution PDF native arrive côté serveur.

## D-13 — Accueil unique

- **Décision.** `/dashboard` = organisation (rôle, code, liens Membres et Jetons d'accès) + table des consultations (statut, avancement de l'évaluation, date, suppression protégée par confirmation). `/dashboard/overview` redirige. Les onglets Organisation / Intégrations / Compte disparaissent : leurs contenus vivent dans `/dashboard/organizations`, `/dashboard/settings/tokens` et le menu utilisateur.
- **Parcours / persona.** Sophie (friction 1).
- **Caduque si.** —

## D-14 — Ce qui reste dans l'ancien style (cohabitation acceptée)

- Pages hôtes `/parametres`, `/referentiel`, `/export`, `/soutenances`, `/financial-grid`, `/tree-view`, `/import/json`, `/documents` : composants d'origine sous le nouveau shell et les nouveaux tokens. À reprendre pour terminer l'harmonisation : cartes KPI de `WeightsTab`, tableaux `SuppliersTab` / `AnalystsTab` / `VersionsTab`, l'assistant JSON, les modales d'import DOCX et de dépôt de documents, `RFPSwitcher` / `VersionSwitcher` / `OrganizationSwitcher` (fonctionnels, style intermédiaire), la page de connexion (bouton indigo), `ThreadPanel`, `PDFViewerSheet`.
- Écrans non terminés : aucun écran refondu n'affiche de donnée factice. Le mode présentation de la décision est un plein écran typographique, pas un diaporama section par section.

## D-15 — Direction « Atelier » : la surface change, la structure reste

- **Décision.** Après revue des captures avec l'utilisateur (« vieillot », accueil vide), trois directions ont été maquettées sur l'accueil et l'évaluation (canvas `RFP Analyzer — directions visuelles`) ; la direction A « Atelier » est retenue et implémentée. Elle remplace les rendus de D-03 et D-04 sans toucher au modèle de navigation (D-05), au geste de notation (D-07), à la file (D-08), aux renvois (D-09) ni à la vue Décision (D-12).
  - *Surfaces.* Fond d'application gris clair (`--background 240 6% 97 %`), panneaux blancs (`.panel` : rayon 8 px, filet 1 px, ombre de 1 px), barre latérale sur `--rail`. Sombre : mêmes rôles sur charbon neutre. Un seul conteneur, le panneau ; plus de filets pleine largeur.
  - *Accent.* Bleu ardoise `hsl(217 38 % 48 %)` (≈ `#4b6ea9`), réservé à la sélection, à la progression et aux liens ; le bouton d'action primaire est en encre pleine (`--action`). Quatre autres teintes ont été comparées sur le canvas (acier, graphite, bleu vif) ; l'ardoise garde le repère sans crier.
  - *Typographie.* Geist Sans (400/500/600) et Geist Mono pour les codes et les chiffres (`.num`), corps 13 px, titres de chapitre 22 px, en-têtes de tableau 12 px medium en casse normale (plus de capitales espacées).
  - *États.* Pastilles à point coloré (`.stamp`) à la place des tampons carrés ; points d'état dans le sommaire.
  - *Barre latérale.* Barre supérieure supprimée ; l'organisation (sélecteur), la navigation d'organisation et le compte (thème, jetons, déconnexion) vivent dans une barre latérale de 232 px ; dans une consultation, le sommaire reprend le rôle avec le titre (sélecteur de consultation), la version et les chapitres.
  - *Panneaux repliables sur l'évaluation.* Sommaire → 56 px (numéros + point d'état, touche `[`), file de travail → 44 px (compteur « à faire », touche `]`) ; états mémorisés par navigateur (`localStorage`). Replié, le texte des réponses garde douze lignes au lieu de huit.
  - *Colonnes alignées.* La zone « Réponse » a une hauteur réservée (8 ou 12 lignes) : « Analyse IA » commence à la même hauteur dans toutes les colonnes, quel que soit le texte.
  - *Signaux par fournisseur.* Au pied de chaque colonne, là où l'on agit : discussions avec compteur (rouge si bloquante), commentaire et question marqués d'un point et d'un fond teinté ; la file porte les mêmes icônes sur la ligne de l'exigence. Le bandeau sous l'en-tête, jugé redondant, a été retiré.
  - *Accueil.* Bloc « Aujourd'hui » (réponses restant à évaluer, analyses en cours, dépôts manquants, calculés depuis `/preparation`), cartes de consultation (phase en cinq points, progression par fournisseur, personnes actives, dernière activité), fil d'activité récente (évaluations groupées par personne et par jour, ajoutées à `/preparation` depuis les colonnes déjà lues), recherche `⌘K` (cmdk). Le compteur de discussions n'apparaît que lorsque l'API des fils répond.
- **Parcours / persona.** Les trois ; l'accueil et l'évaluation d'abord.
- **Options écartées.** B « Console » (sombre par défaut, mauvais en comité sur vidéoprojecteur) ; C « Tableau » (plus aéré, mais plus de défilement à dix fournisseurs) ; conserver Source Sans 3 et les tampons carrés (lecture « administrative » jugée datée).
- **Caduque si.** Une charte d'entreprise arrive : `styles/globals.css`, `app/layout.tsx` (police) et `.stamp` sont les seuls points de changement.

## D-16 — Fin de la numérotation d'articles, la version devient un objet visible

- **Décision.** Les numéros que l'interface s'était donnés (chapitres 1 à 5, articles 1.1 à 1.5, sections 4.1 à 4.3, en-têtes « 3.1 ») disparaissent. Les chapitres du sommaire portent une icône (préparation, analyse, évaluation, décision, restitution, paramètres) : elle sert d'identifiant en mode replié, là où le numéro servait. Les codes affichés en mono restent : ce sont les codes réels du référentiel client (domaines, exigences), pas une numérotation d'interface.
  - *Pondérations.* L'étape passe de la cinquième à la deuxième place du plan de préparation, après le référentiel et avant les fournisseurs : les poids déterminent la note globale et le classement, les régler après coup oblige à rejouer les arbitrages. L'étape reste facultative (poids identiques par défaut) et n'entre pas dans la chaîne « prochaine action », qui ne nomme que les étapes bloquantes.
  - *Version.* Le sélecteur de version quitte la ligne de statut et devient un contrôle visible sous le titre du sommaire (« V2 · Pré-analyse »), présent même avec une seule version, avec accès à « Gérer les versions ». Les cartes de l'accueil portent la même mention, en lecture seule. La ligne de pied du plan de préparation ne répète plus la version.
  - *États de chargement.* `PageState` est centré (horizontalement et dans la hauteur utile) au lieu d'être aligné à gauche ; la grille financière utilise le même composant au lieu d'un spinner plein écran.
- **Parcours / persona.** Les trois ; retours utilisateur sur les captures de la direction Atelier.
- **Options écartées.** Garder les numéros dans le seul sommaire (le mode replié redevenait une liste de chiffres sans signification) ; passer les codes du référentiel en sans-serif (ils perdaient leur alignement en colonne dans la file de travail) ; faire des pondérations une étape bloquante de la prochaine action (elle est facultative, la chaîne se serait bloquée sur un réglage volontairement laissé par défaut).
- **Caduque si.** Le référentiel cesse de porter des codes, ou une charte impose une numérotation de chapitres.
