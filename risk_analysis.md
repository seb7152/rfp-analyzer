# Analyse de Sécurité des API - RFP Analyzer

_Date: 29 Novembre 2025_  
_Scope: Toutes les routes API dans app/api/_  
_Statut: AUDIT COMPLET_

---

## 🚨 Vulnérabilités Critiques

### 1. Contournement d'Authentification Middleware

**Localisation:** `lib/supabase/middleware.ts:48-56`  
**Sévérité:** CRITIQUE  
**CVSS Score:** 9.1

#### Description

Le middleware tente de rediriger les utilisateurs non authentifiés depuis les routes `/api/` mais cette logique est défectueuse.

#### Code Vulnérable

```typescript
if (
  !user &&
  (request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/api/"))
) {
  // Redirection seulement si user est null
  // Mais si auth.getUser() lève une erreur, user reste null et la requête continue
}
```

#### Impact

- Accès non autorisé potentiel à toutes les APIs
- Contournement complet de l'authentification
- Exposition des données sensibles

#### Exploitation

```bash
# Forcer une erreur d'auth pour bypass la vérification
curl -X GET "http://localhost:3000/api/rfps" \
  -H "Authorization: Bearer invalid_token"
```

#### Recommandation Immédiate

```typescript
// Correction proposée
let user = null;
let hasValidSession = false;

try {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  user = authUser;
  hasValidSession = !!authUser;
} catch (error) {
  console.error("Auth error:", error);
  hasValidSession = false;
}

if (!hasValidSession && request.nextUrl.pathname.startsWith("/api/")) {
  return NextResponse.redirect(new URL("/login", request.url));
}
```

---

### 2. Row Level Security Désactivé

**Localisation:** `supabase/migrations/004_fix_requirements_rls.sql:11-17`  
**Sévérité:** CRITIQUE  
**CVSS Score:** 9.8

#### Description

RLS complètement désactivé sur les tables critiques (`requirements`, `categories`, `suppliers`).

#### Code Vulnérable

```sql
-- RLS désactivé sur tables critiques
ALTER TABLE requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
```

#### Impact

- Tout utilisateur authentifié peut accéder/modifier les données de n'importe quelle organisation
- Contournement total de l'isolation multi-tenant
- Fuite de données entre organisations

#### Exploitation

```sql
-- Un utilisateur peut voir toutes les organisations
SELECT * FROM requirements WHERE organization_id = 'autre_org_id';
```

#### Recommandation Immédiate

```sql
-- Réactiver RLS sur toutes les tables
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Recréer les politiques RLS appropriées
CREATE POLICY "Users can view their organization requirements"
ON requirements FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  )
);
```

---

## ⚠️ Vulnérabilités Moyennes

### 3. Contrôles d'Autorisation Incohérents

**Sévérité:** MOYENNE  
**CVSS Score:** 6.5

#### Description

Patterns d'autorisation variables entre les routes API.

#### Problèmes Identifiés

- Certaines routes vérifient `user_organizations`
- D'autres se fient uniquement au RLS (qui est désactivé)
- Absence de logique d'autorisation centralisée

#### Exemples

```typescript
// Route A - Vérification complète
const { data: userOrg } = await supabase
  .from("user_organizations")
  .select("role")
  .eq("user_id", user.id)
  .eq("organization_id", orgId)
  .single();

// Route B - Aucune vérification (se fiant au RLS)
const { data: rfp } = await supabase.from("rfps").select("*").eq("id", rfpId);
```

#### Recommandation

Créer un middleware d'autorisation centralisé.

---

### 4. Validation des Uploads de Fichiers

**Localisation:** `app/api/rfps/[rfpId]/documents/upload-intent/route.ts:49-63`  
**Sévérité:** MOYENNE  
**CVSS Score:** 6.1

#### Description

Validation MIME type contournable.

#### Code Vulnérable

```typescript
// Validation basée sur l'extension et MIME type déclarés
if (!allowedMimeTypes.includes(file.type)) {
  return NextResponse.json({ error: "Invalid file type" });
}
```

#### Impact

- Upload de fichiers malveillants avec fausses extensions
- XSS ou exécution de code côté serveur

#### Recommandation

Implémenter la vérification des magic numbers.

---

### 5. Exposition d'Informations

**Sévérité:** MOYENNE  
**CVSS Score:** 5.3

#### Description

Messages d'erreur révélant des informations système.

#### Exemples

```typescript
return NextResponse.json(
  { error: "Database error", message: dbError.message },
  { status: 500 }
);
```

#### Recommandation

Sanitiser tous les messages d'erreur.

---

## 🔍 Vulnérabilités Faibles

### 6. Configuration CORS

**Localisation:** `cors-config.json:5-11`  
**Sévérité:** FAIBLE  
**CVSS Score:** 3.7

#### Description

Wildcard subdomain `https://*.vercel.app` autorise n'importe quel déploiement Vercel.

#### Recommandation

Limiter aux domaines spécifiques.

---

### 7. TTL des URLs Signées Incohérent

**Sévérité:** FAIBLE  
**CVSS Score:** 3.1

#### Description

TTL variables entre endpoints (90s à 3600s).

#### Recommandation

Standardiser les TTL à 5 minutes maximum.

---

### 8. Absence de Rate Limiting

**Sévérité:** FAIBLE  
**CVSS Score:** 5.3

#### Description

Pas de limitation de débit sur les endpoints API.

#### Recommandation

Implémenter rate limiting avec Redis.

---

## ✅ Mesures de Sécurité Positives

### Authentification Robuste

- ✅ Utilisation cohérente de `supabase.auth.getUser()` sur 76 endpoints
- ✅ Gestion de session avec middleware
- ✅ Tokens JWT signés par Supabase

### Architecture Multi-Tenant

- ✅ Isolation par organisation (quand RLS est activé)
- ✅ Contrôle d'accès basé sur les rôles
- ✅ Séparation des données par organization_id

### Stockage Sécurisé

- ✅ Google Cloud Storage avec URLs signées
- ✅ Limites de taille de fichiers (50MB)
- ✅ Validation des types de fichiers

### Validation des Entrées

- ✅ Validation JSON schema sur la plupart des endpoints
- ✅ Validation des paramètres requis
- ✅ Typage TypeScript strict

---

## 📊 Score de Sécurité Global

**Score: 6/10**

| Catégorie        | Score | Poids    | Score Pondéré |
| ---------------- | ----- | -------- | ------------- |
| Authentification | 8/10  | 25%      | 2.0           |
| Autorisation     | 3/10  | 30%      | 0.9           |
| Validation       | 7/10  | 20%      | 1.4           |
| Configuration    | 6/10  | 15%      | 0.9           |
| Monitoring       | 4/10  | 10%      | 0.4           |
| **TOTAL**        |       | **100%** | **5.6/10**    |

---

## 🚀 Plan d'Action Priorisé

### Phase 1 - Critique (Immédiat)

1. **Réactiver RLS** sur toutes les tables
2. **Corriger le middleware** d'authentification
3. **Audit complet** des politiques RLS

### Phase 2 - Moyen (1-2 semaines)

1. **Centraliser l'autorisation** avec middleware
2. **Renforcer la validation** des uploads
3. **Sanitiser les messages d'erreur**

### Phase 3 - Faible (1 mois)

1. **Tighten CORS** configuration
2. **Ajouter rate limiting**
3. **Implémenter audit logging**

---

## 🔧 Outils Recommandés

### Sécurité

- **OWASP ZAP** - Scanning automatique
- **Burp Suite** - Testing manuel
- **SQLMap** - Détection d'injections SQL

### Monitoring

- **Supabase Logs** - Logs d'authentification
- **Vercel Analytics** - Monitoring des requêtes
- **Sentry** - Tracking des erreurs

---

## 📞 Contact Urgence

En cas de découverte de vulnérabilité critique:

1. **Isoler le service** immédiatement
2. **Notifier l'équipe** de sécurité
3. **Documenter l'incident**
4. **Appliquer le patch** de sécurité

---

_Ce document doit être revu trimestriellement ou après chaque modification majeure de l'architecture API._
