# Agents d'analyse — vision globale et MVP

Brief à donner tel quel à la session de réalisation (Claude Code, modèle Claude Fable 5.1).
Partie A : consignes de travail pour le modèle. Partie B : vision globale. Partie C : périmètre MVP à livrer. Partie D : hypothèses par défaut sur les points ouverts.

---

## Partie A — Consignes de travail pour la session de réalisation

### Pourquoi ce travail

Je développe RFP Analyzer, un outil B2B d'évaluation de consultations (appels d'offres) : un référentiel d'exigences hiérarchisé en domaines, 4 à 10 fournisseurs qui répondent à 50 à 200 exigences, une note IA et une note manuelle par réponse, des fils de discussion, des versions d'évaluation. Le produit vend une chose : chaque note est traçable jusqu'à une citation dans la réponse du fournisseur.

Aujourd'hui l'analyse IA est un pipeline unique et myope : `supabase/functions/analyze-rfp` envoie à N8N une exigence à la fois, avec les réponses de tous les fournisseurs, sous un seul prompt système par consultation (`rfps.analysis_settings.system_prompt`), et écrit `ai_score` et `ai_comment` sur `responses`. L'IA ne voit jamais un domaine en entier, ne détecte pas les contradictions internes d'une offre, et ses sorties écrasent les précédentes sans revue.

Le but est de remplacer cette analyse générique par des **agents spécialisés configurables** (sécurité, fonctionnel, juridique, etc.), affectés à des domaines du référentiel, qui produisent des **propositions structurées et sourcées** que les évaluateurs acceptent ou rejettent avant qu'elles n'entrent dans la notation. La Partie B décrit la cible complète ; la Partie C délimite ce qui doit être livré maintenant. Livre la Partie C ; ne construis pas la Partie B.

### Avant de commencer

Lis dans cet ordre : `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `specs/ARCHITECTURE_WORKFLOW_GUIDE.md`, `REFONTE.md`, puis le code des fonctionnalités voisines dont ce brief s'inspire : `supabase/functions/analyze-rfp`, `supabase/functions/generate-soutenance` et son callback (pattern asynchrone existant), la migration `20260216_create_response_threads.sql` (fils de discussion), la migration `20251221_add_suggestions_status_to_presentation_analyses.sql` (pattern « suggestion à insérer »), la migration `20260213_add_peer_review.sql`, `012_create_tags_tables.sql`, `023_add_evaluation_versions.sql`. Le vocabulaire d'interface est imposé par `PRODUCT.md` : consultation, exigence, domaine, fournisseur, réponse, référentiel.

Pour l'appel au modèle d'analyse, charge le skill `claude-api` avant d'écrire la moindre ligne qui touche au SDK Anthropic ; ses fichiers `typescript/claude-api/README.md`, `typescript/claude-api/batches.md` et `shared/prompt-caching.md` font autorité sur tout ce que tu croirais savoir de l'API.

La branche courante est `refonte-ui`, qui porte une refonte d'interface sous contrainte « aucun changement de schéma ». Ce travail-ci change le schéma : crée une branche `007-agents` à partir de `refonte-ui` et travaille dedans. Ne modifie pas les workflows N8N ni le modèle d'autorisation (rôles d'organisation, niveaux d'accès par consultation, politiques RLS existantes) ; ajoute des politiques pour les nouvelles tables, en t'alignant sur celles de `response_threads`.

### Manière de travailler

Ces consignes sont rédigées pour ce modèle ; elles sont volontairement peu prescriptives sur les étapes et précises sur le but, les contraintes et les limites.

When you have enough information to act, act. Do not re-derive facts already established in this brief, re-litigate a decision it has already made, or narrate options you will not pursue in user-facing messages. If you are weighing a choice, give a recommendation, not an exhaustive survey. This does not apply to thinking blocks.

You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking 'Want me to...?' or 'Shall I...?' will block the work. For reversible actions that follow from the original request, proceed without asking. Stop only for destructive actions or genuine scope changes the user must decide. Offering follow-ups after the task is done is fine; asking permission before doing the work is not. Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done ('I'll...', 'let me know when...'), do that work now with tool calls. That includes retrying after errors and gathering missing information yourself. Do not stop because the context or session is long. End your turn only when the task is complete or you are blocked on input only the user can provide. Before running a command that changes system state (such as restarts, deletes, or config edits), check that the evidence actually supports that specific action.

Two things do require stopping: applying a migration to the remote Supabase project (write the migration file, run it locally if a local stack is available, and leave the remote apply to me), and deploying an edge function to the remote project (same rule). Everything else that this brief covers, do without asking.

The user's request — this brief — sets the scope, and the scope is the deliverable: don't quietly narrow, widen, or swap it. Read ambiguity the way a careful colleague would: make routine judgment calls yourself, and check in only when different readings would lead to materially different work. If you see a real problem with the task as specified, say so in a sentence or two and keep building under stated assumptions. If a question comes up partway, first do everything that doesn't depend on the answer; then state the assumption you made. If one part turns out to be blocked, complete every other part in full and say exactly what you left out and why.

Don't add features, refactor, or introduce abstractions beyond what the task requires. Don't design for hypothetical future requirements — the Partie B exists so that the MVP's data model doesn't paint us into a corner, not so that you build it. Do the simplest thing that works well. Only validate at system boundaries (user input, the Anthropic API, the model's output). Don't use feature flags or backwards-compatibility shims when you can just change the code.

If, while working or testing, you find a pre-existing bug, a performance concern, or behavior the task doesn't mention, don't fix, optimize or extend it in this change unless the requested behavior cannot work without it; report it as a follow-up in your summary. Verify your work however you like; scratch scripts and quick checks need not be kept — keep them under the scratchpad directory, not in the repository. Commit tests only where this repository already keeps tests for this kind of change, sized like the neighboring test files — roughly one focused test per stated behavior. This is about extras only: implement every behavior the task asks for, completely.

The number of tokens used to edit files is best minimized, all else being equal. Therefore, when it will not affect the end result, try to surgically edit a file rather than rewrite the entire thing.

Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.

Establish a method for checking your own work as you build, and run it at each milestone (schéma en place, orchestration fonctionnelle de bout en bout sur une consultation de test, interface branchée) : `npm test && npm run lint`, plus une vérification dans le navigateur de chaque écran livré. Delegate independent subtasks to sub-agents and keep working while they run ; a fresh-context verifier sub-agent that reads this brief and audits the delivered code against Partie C is worth more than self-critique.

Keep a working memory: write what you learn about this codebase that the repository itself doesn't record (conventions non écrites, pièges rencontrés, décisions prises sur les points ouverts de la Partie D) into the memory directory named in your system prompt, one lesson per file with a one-line summary at the top. Consult it before deciding a point already decided.

Terse shorthand is fine between tool calls. Your final summary is different: it's for a reader who didn't see any of that. Open with the outcome in one sentence. Then what was delivered, what was verified and how, what was left out and why, the assumptions you made on the open points of Partie D, and follow-ups. Write complete sentences in French, spell out terms, give each file, migration, or function its own plain-language clause. Please remove all mannered prose.

---

## Partie B — Vision globale (cible, ne pas construire au-delà de la Partie C)

### Concepts

**Agent.** Défini au niveau de l'organisation, réutilisable d'une consultation à l'autre. Un agent a un nom, une description courte visible des évaluateurs (« relit les engagements de sécurité et de conformité »), un prompt système écrit par l'organisation, un modèle et un niveau d'effort, et un type : *spécialisé* (analyse un domaine pour un fournisseur) ou *harmonisateur* (relit les analyses des spécialisés sur plusieurs fournisseurs). Un agent est versionné : modifier son prompt crée une nouvelle version, et chaque analyse garde la version qui l'a produite.

**Skill.** Document de référence de l'organisation (grille ISO 27001, checklist RGPD, barème de notation maison, glossaire métier) attaché à un ou plusieurs agents et injecté dans leur contexte. Un skill n'est pas un outil : c'est du texte que l'agent lit. L'organisation définit un **barème de notation commun** comme skill obligatoire pour tous les agents spécialisés, sinon les domaines ne sont pas notés sur la même échelle.

**Affectation.** Par consultation : « l'agent Sécurité couvre le domaine 3 (et ses sous-domaines) » ou « couvre les exigences portant le tag `securite` ». Une exigence ne peut être couverte que par un agent spécialisé à la fois. L'harmonisateur, s'il est activé sur la consultation, couvre implicitement tous les domaines analysés.

**Analyse (run).** Une exécution = un agent spécialisé × un fournisseur × un périmètre affecté, sur une version d'évaluation donnée. Pour 4 fournisseurs et 5 agents, un lancement complet produit 20 analyses en parallèle, puis, si activé, une analyse d'harmonisation par périmètre. L'orchestration (qui lancer, dans quel ordre, quand lancer l'harmonisation) est du **code déterministe**, pas un agent : il n'y a rien à décider, seulement à distribuer. Un « agent coordinateur » LLM n'est pas prévu.

**Proposition (finding).** Sortie unitaire d'une analyse, rattachée à une réponse (exigence × fournisseur). Elle porte : un verdict (conforme, partiel, non conforme, non répondu, hors sujet), une note proposée sur l'échelle du produit, une justification courte, des **extraits verbatim** de la réponse qui fondent la justification, des questions à poser au fournisseur, des risques ou réserves. Une proposition est *proposée*, puis *acceptée* ou *rejetée* par un évaluateur ; jamais appliquée automatiquement par défaut. L'harmonisateur produit un second type de proposition : comparative (« contrairement à l'offre B, A ne chiffre pas le PRA ») ou de calibration (« même qualité de réponse, écart de deux points entre C et D »).

**Preuve.** Chaque extrait cité est vérifié par le code : s'il n'existe pas mot pour mot dans `response_text`, la proposition est marquée « non sourcée » et présentée comme telle. C'est la garantie que le produit vend.

### Flux cible

1. Nadia (admin d'organisation) crée les agents et leurs skills une fois pour toutes.
2. Sophie (pilote) ouvre une consultation, affecte les agents aux domaines, active ou non l'harmonisation, lance l'analyse. Elle voit un coût estimé avant de lancer, puis l'avancement analyse par analyse.
3. Le système lance les analyses spécialisées en parallèle, vérifie les extraits, puis l'harmonisation.
4. Marc (expert) trouve dans sa file de travail, réponse par réponse, les propositions de l'agent qui couvre son domaine : note proposée, justification, extraits surlignés dans la réponse. Il accepte (la note IA prend la valeur proposée, un fil de discussion est créé avec la justification, signé par Marc avec la mention « proposé par l'agent Sécurité v3 »), ou rejette avec un motif optionnel.
5. Sophie voit les propositions comparatives de l'harmonisateur au niveau du domaine et les taux d'acceptation par agent, qui lui disent quels prompts améliorer.
6. Une proposition acceptée remet la réponse en « à relire » dans la revue par les pairs si celle-ci est activée.

### Vision UX

**Réglages d'organisation › Agents.** Une liste d'agents avec nom, type, modèle, nombre de consultations où il est affecté, taux d'acceptation global. Une fiche d'agent : identité, prompt système en éditeur plein texte avec un aperçu de ce que l'agent recevra (structure du contexte, skills attachés), skills cochables, historique des versions du prompt. Un bouton « Tester sur un échantillon » qui lance l'agent sur une exigence et une réponse au choix et montre la proposition obtenue, pour itérer sur le prompt sans lancer une analyse complète.

**Réglages d'organisation › Skills.** Une bibliothèque de documents texte : titre, contenu, agents qui l'utilisent.

**Consultation › Agents.** Une matrice domaines × agents où l'on affecte par simple clic, avec la couverture visible (exigences couvertes, non couvertes, couvertes deux fois — interdit). Un interrupteur « Harmonisation ». Un bandeau d'estimation : nombre d'analyses, tokens estimés, coût estimé. Un bouton « Lancer l'analyse » puis une vue d'avancement par analyse (en attente, en cours, terminée, en erreur, avec relance unitaire), et un récapitulatif : propositions produites, non sourcées, acceptées, rejetées.

**File de travail de l'évaluateur.** Aucun nouvel écran. Sur chaque réponse, une carte « Proposition de l'agent Sécurité » au-dessus de la zone de notation : verdict, note proposée à côté de la note IA actuelle, justification, extraits cliquables qui surlignent le passage dans la réponse, questions au fournisseur, boutons Accepter et Rejeter. Une proposition non sourcée porte un marqueur clair et son extrait manquant est signalé. Une proposition rejetée se replie mais reste consultable. Les propositions comparatives de l'harmonisateur apparaissent sur la réponse concernée avec un lien vers la réponse du fournisseur comparé.

**Traçabilité.** Sur un fil de discussion créé par acceptation, une mention permanente « proposé par l'agent Sécurité v3, accepté par Marc le 12/09 ». Dans l'export du livrable, les commentaires issus d'agents sont distinguables.

**Principes.** Proposition par défaut, application automatique jamais dans la première itération (réglage d'organisation possible plus tard). Une analyse est rattachée à une version d'évaluation ; les propositions d'une version antérieure ne sont pas supprimées, elles sont marquées obsolètes. Aucun agent n'écrit directement une note ou un commentaire : c'est toujours un humain qui accepte.

### Architecture cible

Appel direct à l'API Anthropic depuis une edge function Supabase, sans passer par N8N. La **Message Batches API** est faite pour ce fan-out : asynchrone, moitié prix, une requête par analyse. Le contenu stable (prompt de l'agent, skills, exigences du périmètre) est placé en préfixe caché ; seules les réponses du fournisseur varient entre les requêtes d'un même agent. Sortie structurée par `output_config.format` avec un schéma JSON strict, thinking adaptatif, modèle par défaut `claude-opus-5` (fenêtre de 1M tokens, ce qui permet de passer un domaine entier avec toutes les réponses du fournisseur sans découpage). Ordre de grandeur : 20 analyses spécialisées × 80k tokens en entrée et 10k en sortie ≈ 13 $ au tarif standard, 6–7 $ en batch ; l'harmonisation ajoute environ 8 $. Le coût est enregistré par analyse et affiché.

---

## Partie C — MVP à livrer

### Périmètre

Un seul type d'agent, le spécialisé. Pas d'harmonisateur, pas de skills, pas d'affectation par tag, pas de test sur échantillon, pas d'application automatique, pas de PDF transmis au modèle (seul `response_text` est analysé). Tout le reste de ce qui suit est à livrer complètement.

### Fonctionnel

**Agents d'organisation.** Créer, modifier, archiver un agent : nom, description courte, prompt système, modèle (liste fermée : `claude-opus-5` par défaut, `claude-sonnet-5`), effort (`medium`, `high` par défaut). Modifier le prompt incrémente la version de l'agent ; les versions précédentes restent lisibles. Accessible aux administrateurs de l'organisation ; lisible par les autres.

**Affectation par consultation.** Sur une consultation, affecter un agent à un ou plusieurs domaines de niveau 1 ou 2 (le sous-arbre entier est couvert). Une exigence feuille ne peut être couverte que par un agent. La couverture (exigences couvertes / non couvertes) est visible. Réservé au rôle `owner` de la consultation.

**Lancement.** Depuis la consultation : estimation (nombre d'analyses = agents affectés × fournisseurs actifs sur la version d'évaluation active ; tokens estimés par comptage réel via l'API `count_tokens` ; coût estimé au tarif du modèle), puis lancement. Chaque analyse a un état visible (`en attente`, `en cours`, `terminée`, `en erreur`) et peut être relancée seule. Le lancement est asynchrone : aucun appel HTTP ne bloque plus de quelques secondes côté client ; l'avancement se rafraîchit sans recharger la page.

**Propositions.** Une analyse produit une proposition par exigence feuille couverte, rattachée à la réponse correspondante : verdict, note proposée (échelle 0–5 par pas de 0,5, comme `ai_score`), justification (au plus quelques phrases), extraits verbatim (au moins un, sauf verdict « non répondu »), questions au fournisseur (liste, peut être vide), risques (liste, peut être vide). Le code vérifie chaque extrait par recherche exacte dans `response_text` (après normalisation des espaces) ; une proposition dont aucun extrait n'est retrouvé est marquée non sourcée.

**Revue.** Sur chaque réponse de la file de travail : la carte de proposition décrite en Partie B (sans la partie harmonisation). Accepter écrit la note proposée dans `ai_score` et la justification dans `ai_comment`, et crée un fil de discussion sur la réponse dont le premier commentaire contient la justification, les extraits et les questions au fournisseur ; le commentaire est signé par l'évaluateur qui accepte et porte la référence de la proposition pour afficher « proposé par l'agent X vN ». Rejeter enregistre le rejet et un motif optionnel. Si la revue par les pairs est activée sur la consultation, accepter remet la réponse dans l'état qui déclenche une relecture. Les deux actions sont possibles pour tout `evaluator` ou `owner` de la consultation.

**Suivi.** Sur la vue d'avancement de la consultation : par analyse, tokens consommés et coût ; en récapitulatif, propositions produites, non sourcées, acceptées, rejetées, par agent.

### Données

Les noms sont indicatifs ; garde-les sauf raison.

- `agents` : organisation, nom, description, prompt système, modèle, effort, version courante, archivé, auteur, dates.
- `agent_versions` : agent, numéro de version, prompt système, modèle, effort, date. Une ligne créée à chaque modification du prompt ; une analyse référence une version, jamais l'agent directement.
- `rfp_agent_assignments` : consultation, agent, exigence de domaine (niveau 1 ou 2). Contrainte d'unicité qui empêche deux agents sur une même exigence feuille — à faire respecter en base si c'est raisonnable, sinon dans l'API avec un message d'erreur clair.
- `agent_runs` : consultation, version d'évaluation, version d'agent, fournisseur, exigence de domaine, état, identifiant de batch ou de requête chez Anthropic, tokens en entrée / sortie / cache, coût calculé, erreur éventuelle, sortie brute du modèle (JSON), dates de lancement et de fin, lancé par.
- `agent_findings` : analyse, réponse, verdict, note proposée, justification, extraits (JSON, chacun avec son statut de vérification), questions, risques, sourcé (booléen), statut (`proposed`, `accepted`, `rejected`, `obsolete`), décidé par, décidé le, motif de rejet.
- `thread_comments.agent_finding_id` : colonne nullable, référence vers la proposition d'origine.

RLS : lecture pour les membres de l'organisation ; écriture des agents réservée aux administrateurs de l'organisation ; affectation et lancement réservés au `owner` de la consultation ; décision sur une proposition ouverte aux `evaluator` et `owner` de la consultation. Regarde comment `response_threads` et `requirement_review_status` expriment ces règles et fais pareil.

Ne touche pas au pipeline N8N existant ni à `analyze-rfp` : les deux coexistent pendant le MVP.

### Exécution

Une edge function lance une analyse : elle assemble le contexte (prompt système de la version d'agent, exigences du sous-arbre avec titre, description, contexte et identifiant externe, réponses du fournisseur à ces exigences), appelle l'API Anthropic, et enregistre la sortie. Contraintes :

- Sortie structurée par `output_config.format` avec un schéma JSON strict qui impose la liste de propositions indexée par `requirement_id_external`. Pas d'analyse de texte libre.
- Thinking adaptatif, effort de la version d'agent, `max_tokens` large. Pas de `budget_tokens`, pas de préremplissage assistant.
- Préfixe stable en cache : prompt système et exigences du périmètre d'abord, réponses du fournisseur ensuite. Vérifie `cache_read_input_tokens` sur la deuxième analyse d'un même agent et note le résultat dans ton résumé.
- Asynchrone. Recommandation : Message Batches API, une requête par analyse, et un mécanisme de relevé des résultats (edge function appelée périodiquement, ou déclenchée par l'interface quand la vue d'avancement est ouverte). Si tu choisis l'appel direct plutôt que le batch, il doit tout de même être asynchrone vis-à-vis du client et respecter les limites de durée des edge functions ; le pattern `generate-soutenance` → `generate-soutenance-callback` existe pour ça.
- Le prompt système est celui de l'organisation ; le code ajoute un préambule fixe qui décrit le format attendu, l'échelle de notation et l'obligation de citer verbatim. Garde ce préambule court et déclaratif : ce modèle suit mieux un but et des contraintes qu'une liste d'étapes.
- Vérification des extraits côté code après réception, puis création des propositions. Une analyse dont la sortie ne respecte pas le schéma passe en erreur avec le message conservé.
- Gère `stop_reason === "refusal"` et les erreurs typées du SDK ; une analyse en erreur est relançable.
- Le coût est calculé à partir de `usage` avec les tarifs du modèle et stocké sur l'analyse.

Une seconde route ou fonction relève l'état des analyses en cours et met à jour `agent_runs` et `agent_findings`.

### Interface

Respecte `DESIGN.md` et les composants existants de la branche `refonte-ui` (panels, stamps d'état, `PageState`, rail de notation, colonne de réponse). Vocabulaire de `PRODUCT.md`. Les écrans à livrer sont ceux de la Partie B limités au périmètre MVP :

- Réglages d'organisation › Agents : liste et fiche d'agent, avec historique des versions du prompt.
- Consultation › Agents : matrice domaines × agents, couverture, estimation, lancement, avancement, récapitulatif, relance unitaire.
- File de travail : carte de proposition sur la réponse, extraits qui surlignent la réponse, Accepter / Rejeter, marqueur « non sourcée », proposition rejetée repliée, mention de provenance sur le fil créé.

Les états vides, de chargement et d'erreur existent sur chaque écran. Le parcours d'évaluation reste utilisable hors ligne pour ce qui l'était déjà ; les actions Accepter / Rejeter rejoignent la file de mutations existante si le mécanisme s'y prête, sinon elles sont désactivées hors ligne avec un message.

### Vérification attendue

- `npm test && npm run lint` passent.
- Une consultation de test avec au moins deux fournisseurs et deux domaines, un agent affecté, une analyse lancée de bout en bout contre la vraie API, des propositions visibles dans la file de travail, une acceptation qui produit le fil et la note, un rejet. Montre-le avec des captures d'écran des trois écrans.
- Un extrait volontairement faux (modifie la sortie brute d'une analyse en base) est bien marqué non sourcé.
- Les politiques RLS sont exercées : un `viewer` ne peut ni affecter ni décider ; un membre d'une autre organisation ne voit rien.

---

## Partie D — Points ouverts et hypothèses par défaut

Décide seul selon ces hypothèses ; note dans ton résumé chaque endroit où tu t'en es écarté et pourquoi.

1. **Rattachement à la version d'évaluation.** `evaluation_versions` gouverne la liste des fournisseurs actifs, pas le contenu des exigences. Une analyse est rattachée à la version active au lancement ; les propositions d'une analyse dont la version n'est plus active passent en `obsolete` au prochain lancement sur la nouvelle version, sans suppression.
2. **Où vit la note proposée avant acceptation.** Nulle part ailleurs que dans `agent_findings` : `ai_score` et `ai_comment` ne bougent qu'à l'acceptation.
3. **Ré-analyse.** Relancer une analyse sur un périmètre déjà analysé crée une nouvelle analyse ; les propositions `proposed` de l'ancienne passent en `obsolete`, les `accepted` et `rejected` sont conservées telles quelles.
4. **Auteur du commentaire.** L'évaluateur qui accepte est l'auteur ; la provenance est portée par `agent_finding_id`. Pas d'utilisateur technique par agent.
5. **Estimation des tokens.** Par `count_tokens` sur le contexte réel de chaque analyse au moment d'afficher l'estimation ; si l'appel échoue, estimation approximative signalée comme telle.
6. **Préambule système fixe.** Rédigé en français, dans le code, court. Il décrit le rôle générique (relire les réponses d'un fournisseur sur un domaine), l'échelle 0–5 et sa signification, le format de sortie, l'obligation de citer verbatim, et la consigne de marquer « non répondu » plutôt que d'inventer. Le prompt de l'organisation vient après et peut le préciser, pas le contredire.
7. **Exigences sans réponse.** Une exigence feuille du périmètre sans `response_text` pour ce fournisseur produit une proposition « non répondu », note 0, sans extrait.
8. **Modèle par défaut.** `claude-opus-5`, effort `high`. Ne pas descendre en gamme pour des raisons de coût.
