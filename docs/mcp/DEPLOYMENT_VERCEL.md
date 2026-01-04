# 🚀 Déploiement MCP Server sur Vercel

## 📋 Pré-requis

✅ Vercel CLI installé : `vercel`
✅ Projet configuré pour Vercel
✅ Serveur MCP fonctionnel (testé avec curl)
✅ CORS configuré correctement

---

## 🔧 Configuration Vercel actuelle

**Fichier** : `vercel.json`

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

**Configuration** :

- Timeout API: 30 secondes
- Routes API : `/api/*` → `/api/*`
- Compatible avec Next.js 14

---

## 🎯 Plan de déploiement

### Étape 1: Vérification du build (localement)

```bash
npm run build
```

**Objectif** : S'assurer que le projet compile sans erreurs

---

### Étape 2: Déploiement sur Vercel

```bash
# Connexion à Vercel (si pas déjà connecté)
vercel login

# Déploiement en production
vercel --prod

# OU déploiement en preview
vercel
```

**Options disponibles** :

- `--prod` : Déploiement en production
- `--yes` : Confirmation automatique
- `--name` : Nom du projet spécifique

---

### Étape 3: Test de l'endpoint MCP en production

Une fois déployé, tester avec l'URL Vercel :

```bash
# Remplacer YOUR-VERCEL-URL avec l'URL de déploiement
curl -X POST https://YOUR-VERCEL-URL/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

**Attendu** :

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "tools": { "listChanged": false }
    },
    "serverInfo": {
      "name": "RFP Analyzer MCP Server",
      "version": "1.0.0"
    }
  }
}
```

---

### Étape 4: Test avec MCP Inspector

```bash
# Avec l'URL de production Vercel
npx @modelcontextprotocol/inspector https://YOUR-VERCEL-URL/api/mcp
```

---

## 🔧 Configuration requise pour Vercel

### Variables d'environnement

Aucune variable d'environnement requise pour le serveur MCP actuel.

**Variables futures** (pour Resources, authentification) :

- `DATABASE_URL` : Connection string Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Service role key
- `GCP_BUCKET_NAME` : Nom du bucket GCS (si requis)

### Headers CORS

Les headers CORS sont déjà configurés dans `app/api/mcp/route.ts` :

```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Accept, mcp-session-id",
  "Access-Control-Max-Age": "86400",
};
```

---

## ⚠️ Points d'attention

### 1. Timeout API (30 secondes)

Le `maxDuration` est de 30 secondes. Si les tools prennent plus de temps, augmenter dans `vercel.json` :

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### 2. Edge Runtime Compatibility

Actuellement, le serveur utilise le Node.js runtime par défaut. Pour Edge Runtime :

Ajouter au début de `app/api/mcp/route.ts` :

```typescript
export const runtime = "edge";
```

⚠️ **Note** : Edge Runtime a des limitations :

- Pas de support pour certaines APIs Node.js (fs, crypto randomUUID)
- Timeout maximum de 30 secondes
- Mémoire limitée

**Recommandation** : Garder Node.js runtime pour l'instant.

### 3. Database Connections

Si on ajoute la connexion Supabase (pour Resources RFP), s'assurer que :

- Les connexions sont fermées correctement
- Pas de leaks de connexion
- Connection pooling activé

---

## 🧪 Tests à effectuer après déploiement

### Test 1: Health Check

```bash
curl https://YOUR-VERCEL-URL/api/mcp
```

**Attendu** : 200 OK avec infos du serveur

### Test 2: Initialize

```bash
curl -X POST https://YOUR-VERCEL-URL/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

### Test 3: Tools List

```bash
curl -X POST https://YOUR-VERCEL-URL/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### Test 4: Tool Call - test_connection

```bash
curl -X POST https://YOUR-VERCEL-URL/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"test_connection","arguments":{}}}'
```

### Test 5: MCP Inspector

```bash
npx @modelcontextprotocol/inspector https://YOUR-VERCEL-URL/api/mcp
```

---

## 📊 Logs et Monitoring

### Voir les logs de déploiement

```bash
# Logs en temps réel
vercel logs --follow

# Logs du dernier déploiement
vercel logs <deployment-url>
```

### Dashboard Vercel

Aller sur : https://vercel.com/dashboard

Voir les métriques :

- Requêtes API
- Erreurs
- Temps de réponse
- Mémoire utilisée

---

## 🚨 Dépannage

### Erreur: "Function execution timed out"

**Solution** : Augmenter `maxDuration` dans `vercel.json`

### Erreur: "Cannot find module"

**Solution** : Vérifier que toutes les dépendances sont dans `dependencies` (pas `devDependencies`)

### Erreur: "CORS error"

**Solution** : Vérifier que CORS_HEADERS sont appliqués à toutes les réponses

### Erreur: "Build failed"

**Solution** :

```bash
# Nettoyer et rebuild
rm -rf .next
npm run build
vercel --prod
```

---

## 📚 Prochaines étapes (après déploiement)

Une fois le serveur déployé et fonctionnel :

1. **Implémenter les Resources RFP** (PHASE 3)
   - `resources/list`
   - `resources/read`
   - `resources/templates/list`

2. **Ajouter la connexion Supabase**
   - Fetch les vrais RFPs, requirements, suppliers
   - Remplacer les mock data

3. **Ajouter l'authentification** (optionnel)
   - API key authentication
   - Session management

4. **Monitoring avancé**
   - Vercel Analytics
   - Error tracking (Sentry, LogRocket)

---

## ✅ Checklist de déploiement

- [ ] Build local réussi (`npm run build`)
- [ ] Login Vercel effectué
- [ ] Déploiement réussi
- [ ] Test curl initialize OK
- [ ] Test curl tools/list OK
- [ ] Test curl tools/call OK
- [ ] Test MCP Inspector OK
- [ ] Logs Vercel OK (pas d'erreurs)
- [ ] Dashboard Vercel OK (status 200)

---

## 📖 Documentation utile

- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)
- [MCP Specification](https://modelcontextprotocol.io/docs/specification/2025-11-25)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

**Prêt à déployer !** 🚀
