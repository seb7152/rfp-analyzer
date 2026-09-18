# Plan de test — Activation RLS sur `defense_analyses`

Migration associée : `20260704_enable_rls_defense_analyses.sql`
Objectif : activer la RLS **sans casser** l'accès légitime et **en fermant** l'accès cross-tenant.

> ⚠️ Tous les tests SQL tournent dans le **SQL Editor Supabase**. Le rôle `postgres`
> y **contourne** la RLS (BYPASSRLS) : il faut `SET LOCAL ROLE authenticated` pour
> réellement être soumis aux policies. Les tests d'écriture sont encapsulés dans
> `BEGIN … ROLLBACK` → **rien n'est persisté**.

---

## Étape 0 — Découverte des identifiants de test (à faire AVANT)

Récupère un enregistrement `defense_analyses`, son org, un utilisateur **membre**
(insider) et un utilisateur **non-membre** (outsider) :

```sql
SELECT
  da.id                     AS defense_analysis_id,
  da.rfp_id                 AS rfp_id,
  r.organization_id         AS org_id,
  (SELECT uo.user_id FROM user_organizations uo
     WHERE uo.organization_id = r.organization_id
     ORDER BY uo.created_at LIMIT 1)                       AS insider_user_id,
  (SELECT uo2.user_id FROM user_organizations uo2
     WHERE uo2.user_id NOT IN (
       SELECT user_id FROM user_organizations WHERE organization_id = r.organization_id)
     LIMIT 1)                                              AS outsider_user_id
FROM defense_analyses da
JOIN rfps r ON r.id = da.rfp_id
LIMIT 1;
```

Note les 5 valeurs ; elles remplacent les `:placeholders` ci-dessous.
Si `outsider_user_id` est NULL (un seul org dans la base), crée un 2ᵉ utilisateur
dans une autre org, ou saute les tests « outsider » et valide au moins l'insider.

---

## Étape 1 — Baseline AVANT activation (RLS encore off)

```sql
-- Doit renvoir false (RLS pas encore activée)
SELECT relrowsecurity FROM pg_class WHERE relname = 'defense_analyses';
```

Optionnel, note le total pour comparaison :
```sql
SELECT count(*) AS total_rows FROM defense_analyses;
```

---

## Étape 2 — Appliquer la migration

Exécute le contenu de `20260704_enable_rls_defense_analyses.sql`, puis vérifie :

```sql
-- Attendu : rls_enabled = true, rls_forced = false
SELECT relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class WHERE relname = 'defense_analyses';
```

`rls_forced` **doit** rester `false` (sinon les edge functions en service_role casseraient).

---

## Étape 3 — Tests RLS (impersonation via JWT claims)

### 3a. ✅ INSIDER peut LIRE les analyses de son org
```sql
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', ':insider_user_id', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- Attendu : >= 1 (au moins la ligne :defense_analysis_id)
  SELECT count(*) AS insider_visible FROM defense_analyses WHERE rfp_id = ':rfp_id';
ROLLBACK;
```

### 3b. ❌ OUTSIDER ne voit RIEN de cet org
```sql
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', ':outsider_user_id', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- Attendu : 0
  SELECT count(*) AS outsider_visible FROM defense_analyses WHERE rfp_id = ':rfp_id';
ROLLBACK;
```

### 3c. ✅ INSIDER peut UPSERT (chemin de la route analyze-defense)
```sql
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', ':insider_user_id', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- Attendu : succès (1 ligne), puis ROLLBACK annule tout
  UPDATE defense_analyses
    SET updated_at = now()
    WHERE id = ':defense_analysis_id'
    RETURNING id;
ROLLBACK;
```

### 3d. ❌ OUTSIDER ne peut PAS modifier
```sql
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', ':outsider_user_id', 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- Attendu : 0 ligne affectée (RLS masque la ligne -> UPDATE ne matche rien)
  UPDATE defense_analyses
    SET updated_at = now()
    WHERE id = ':defense_analysis_id'
    RETURNING id;
ROLLBACK;
```

### 3e. ✅ SERVICE_ROLE conserve son bypass (chemin edge functions)
```sql
BEGIN;
  SET LOCAL ROLE service_role;
  -- Attendu : = total_rows de l'étape 1 (voit tout, RLS contournée)
  SELECT count(*) AS service_visible FROM defense_analyses;
ROLLBACK;
```

---

## Étape 4 — Smoke test applicatif (UI réelle)

Connecté comme utilisateur **normal** (membre d'un org), sur un RFP de cet org :

1. Ouvrir l'onglet/section **Analyse de soutenance / défense**.
2. Vérifier que les analyses existantes **s'affichent** (pas d'écran vide ni d'erreur console).
3. Lancer une **génération / régénération** d'analyse de défense → doit aboutir
   (le callback edge function écrit bien en service_role).
4. Vérifier qu'un utilisateur d'un **autre org** ne voit pas ce RFP / cette analyse.

Aucune erreur 500 / « permission denied for table defense_analyses » ne doit apparaître.

---

## Étape 5 — Re-check advisor

```
Relancer les advisors sécurité et confirmer que le lint
  "rls_disabled_in_public / policy_exists_rls_disabled" pour defense_analyses
a DISPARU.
```

---

## Critères de validation (tous requis)

| Test | Attendu |
|------|---------|
| 2  | rls_enabled = true, rls_forced = false |
| 3a | insider_visible ≥ 1 |
| 3b | outsider_visible = 0 |
| 3c | UPDATE insider → 1 ligne |
| 3d | UPDATE outsider → 0 ligne |
| 3e | service_visible = total_rows |
| 4  | UI OK, génération OK, pas d'erreur permission |
| 5  | lint defense_analyses disparu |

## Rollback (si un test ✅ échoue de façon inattendue)

```sql
ALTER TABLE public.defense_analyses DISABLE ROW LEVEL SECURITY;
```

Puis on ajuste les policies avant de réessayer. Un `DISABLE` restaure
immédiatement le comportement actuel (aucune perte de données).
