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
