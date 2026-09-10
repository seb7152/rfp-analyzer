# Product

<!-- impeccable:product-schema 1 -->

Source de vérité : `docs/UX-PARCOURS-UTILISATEURS.md` (personas, parcours, frictions) et le brief de refonte du 2026-09-11. Les faits marqués *(inféré)* viennent de ces deux documents et du code, sans confirmation orale de l'utilisateur, qui a demandé à ne pas être sollicité pendant la refonte.

## Platform

web

## Users

- **Sophie, pilote de la consultation** (rôle `owner` sur la consultation). Consultante ou acheteuse. Fait converger 4 à 10 fournisseurs, 50 à 200 exigences et 3 à 6 experts vers une décision défendable. Usage quotidien 4 à 8 semaines, sur desktop au bureau. Stress : qualité de l'import, visibilité sur l'avancement des évaluateurs.
- **Marc, expert métier** (rôle `evaluator`). 40 exigences assignées sur son domaine. 2 à 3 sessions de 1 à 2 heures, souvent en réunion ou en déplacement, sur mobile ou tablette, connexion parfois instable. Stress : retrouver dans le document source ce que l'IA affirme.
- **Claire, sponsor / décideur** (rôle `viewer`). 2 ou 3 visites sur tout le projet, dont une juste avant la décision, parfois en comité sur vidéoprojecteur. Veut qui gagne, pourquoi, et de quoi le justifier, en cinq minutes.
- Nadia (administratrice d'organisation) et Thomas (power user, jeton d'accès + agent externe) existent mais sont hors du périmètre de la refonte.

## Product Purpose

RFP Analyzer est un outil B2B d'évaluation d'appels d'offres (« consultations »). Une consultation traverse six phases : Cadrer → Préparer le référentiel → Analyser (IA) → Évaluer → Arbitrer → Restituer. Le produit stocke le référentiel d'exigences hiérarchisé (domaines → exigences), les réponses de chaque fournisseur à chaque exigence, une note IA et une note manuelle par réponse, des commentaires et fils de discussion, des pondérations par domaine, un volet financier, des soutenances, des versions et un export du livrable.

Succès : le pilote, l'expert et le sponsor accomplissent leurs tâches clés plus vite et sans friction ; la décision finale est traçable du score agrégé jusqu'à la citation source.

## Positioning

*(inféré)* La preuve est au cœur du produit : chaque note IA renvoie à une citation dans le document fournisseur annotable. C'est ce lien score → exigence → réponse → citation qui distingue le produit d'un tableur de notation.

## Operating Context

- Multi-organisation avec isolation par RLS ; 10 à 50 utilisateurs par organisation.
- Deux niveaux de droits superposés : rôle d'organisation (admin / evaluator / viewer) et niveau d'accès par consultation (owner / evaluator / viewer). Ce modèle n'est pas refondu ; ses frictions se documentent.
- Documents PDF stockés sur Google Cloud Storage, parsés et analysés par des workflows N8N asynchrones (analyse IA par réponse, brief de soutenance, transcription).
- Import du référentiel par document (DOCX avec mapping), par assistant en 4 étapes (JSON/tableur), ou par agent externe via MCP et jeton personnel.
- Versions d'évaluation : une consultation peut porter plusieurs versions ; la version active est un contexte global.
- Vocabulaire métier imposé dans l'interface : consultation, exigence, domaine, fournisseur, réponse, pondération, soutenance, référentiel, livrable.

## Capabilities and Constraints

- Stack : Next.js 14 (app router), React 18, TypeScript, Tailwind, Radix/shadcn, Tanstack Query, Supabase (auth + PostgreSQL + realtime), recharts. MUI et material-react-table coexistent aujourd'hui.
- Contraintes de la refonte : aucun changement de schéma BDD, de contrat d'API ou d'auth (proposés dans REFONTE.md seulement) ; aucune fonctionnalité supprimée ; le parcours d'évaluation reste utilisable hors ligne (file de mutations rejouée au retour du réseau).
- Performance visée : LCP < 2 s, interactions < 200 ms, liste d'exigences fluide à 200 exigences × 10 fournisseurs.
- Hors périmètre : onboarding par code, volet financier, soutenances, MCP, versions — sauf leurs points d'entrée dans les trois parcours refondus.

## Brand Commitments

- Nom : RFP Analyzer. Langue de l'interface : français.
- Registre imposé : logiciel métier tenu, dense, utilisé plusieurs heures par jour. Libellés courts et concrets, pas de ton promotionnel, pas de point d'exclamation, pas de message qui s'excuse ou félicite.
- Interdits explicites : dégradés violet/indigo, texte en dégradé, glassmorphism et backdrop-blur décoratifs, blobs animés, hero centré surdimensionné, grilles de trois cartes à icône, emojis en guise d'icônes, arrondis et ombres portées par défaut, motion gratuite sur les éléments manipulés cent fois par jour.
- Thème clair et sombre, une seule palette, une seule échelle typographique et d'espacement, une seule librairie de composants sur les parcours refondus.

## Evidence on Hand

- Base Supabase de développement avec données réelles : 7 consultations, 552 exigences, 29 fournisseurs, 6 827 réponses, 63 documents, 16 versions (2026-09-11).
- Aucune donnée factice ne doit être affichée en production ; un écran non branché se signale dans Décisions.md.

## Product Principles

1. La progression de la consultation est le squelette de la navigation : on ne montre que ce qui a du sens à la phase courante.
2. Pilotage quotidien et configuration one-shot ne partagent pas la même barre.
3. L'expert évalue en un geste, dans une file de travail qui lui appartient.
4. Le sponsor lit ; il ne configure pas. Son chemin va du score agrégé à la preuve sans rupture.
5. Toute attente asynchrone est scénarisée : état, estimation, notification de fin, reprise.

## Accessibility & Inclusion

Contraste AA sur tout texte, navigation clavier complète sur la boucle d'évaluation, cibles tactiles ≥ 44 px sur mobile, focus visible, `prefers-reduced-motion` respecté.
