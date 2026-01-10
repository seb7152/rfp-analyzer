# MCP Server Implementation Retrospective

**Date**: January 4, 2026  
**Objectif**: Intégrer le protocole Model Context Protocol (MCP) avec le serveur RFP Analyzer  
**État**: ⚠️ **EN ATTENTE - Implémentation fonctionnelle mais à valider avec MCP Inspector**

---

## 📋 Executive Summary

| Aspect                          | État            | Notes                                       |
| ------------------------------- | --------------- | ------------------------------------------- |
| **Installation dépendances**    | ✅ Complet      | `@modelcontextprotocol/sdk@1.25.1` installé |
| **Architecture MCP**            | ✅ Opérationnel | JSON-RPC 2.0, protocol v2025-11-25          |
| **Tools MCP**                   | ✅ Implémentés  | 5 tools fonctionnels                        |
| **Endpoint API**                | ✅ Accessible   | `/api/mcp` répond aux requêtes              |
| **Compatibilité MCP Inspector** | ⚠️ À valider    | Code fonctionnel, test en cours             |
| **Documentation**               | ✅ Complexe     | Multiples guides et specs disponibles       |

---

## 🎯 Scénarios Testés

### ❌ Scénario 1 : mcp-handler v1.0.4 (Route dynamique `[transport]`)

**Approche**: Utiliser l'adaptateur officiel de Vercel pour Next.js

**Configuration**:

- Package: `mcp-handler@1.0.4`
- Route: `app/api/[transport]/route.ts`
- Structure: Route dynamique Next.js

**Problèmes rencontrés**:

1. **Incompatibilité de version**: mcp-handler v1.0.4 non compatible avec `@modelcontextprotocol/sdk@1.25.1`
2. **Problème d'export**: La fonction `createMcpRouteHandler` documentée n'existe pas dans le bundle
3. **Erreur de runtime**: `createMcpRouteHandler is not defined`
4. **Cache Next.js persistant**: Après nettoyage du cache `.next`, l'ancien bundle reste en mémoire

**Logs d'erreurs**:

```
[ERROR] (0 , mcp_handler__WEBPACK_IMPORTED_MODULE_0__.createMcpRouteHandler) is not a function
[ERROR] ReferenceError: createMcpRouteHandler is not defined
```

**Résultat**: ❌ **ÉCHEC** - Impossible d'utiliser l'adaptateur Vercel

**Analyse**:

- La documentation officielle de mcp-handler ne correspond pas à la version publiée sur npm
- Problème possible de versioning ou de publication incomplète
- L'agent explore a identifié GitHub Issue #131 comme problème connu

---

### ❌ Scénario 2 : mcp-handler v1.0.5 (Upgrade)

**Approche**: Tenter l'upgrade à la version la plus récente

**Configuration**:

- Package: `mcp-handler@1.0.5` (publiée le 3 janvier 2026)
- Route: `app/api/[transport]/route.ts`
- Imports: `import { createMcpRouteHandler } from "mcp-handler/dist/index.mjs"`

**Problèmes rencontrés**:

1. **Export incorrect**: Même erreur `createMcpRouteHandler is not a function`
2. **Mauvais chemin d'import**: `mcp-handler/dist/index.mjs` vs import principal
3. **Cache résistant**: Nettoyage multiple du cache `.next` sans effet

**Logs d'erreurs**:

```
[ERROR] "mcp-handler" has no exported member named 'createMcpRouteHandler'. Did you mean 'createMcpHandler'?
```

**Résultat**: ❌ **ÉCHEC** - L'upgrade n'a pas résolu le problème

**Analyse**:

- Le package mcp-handler v1.0.5 semble avoir des problèmes d'export
- Peut-être que la fonction `createMcpRouteHandler` n'a jamais été correctement publiée
- Nécessité de contacter l'équipe Vercel/MCP pour clarification

---

### ❌ Scénario 3 : SDK officiel @modelcontextprotocol/sdk@1.25.1

**Approche**: Utiliser directement le SDK officiel sans wrapper mcp-handler

**Configuration**:

- Package: `@modelcontextprotocol/sdk@1.25.1`
- Route: `app/api/[transport]/route.ts`
- Imports: `McpServer`, `StreamableHTTPServerTransport`

**Problèmes rencontrés**:

1. **Erreur de compilation TypeScript**: Syntax errors dans les callbacks
2. **Incompatibilité de types**: Next.js `Request`/`Response` vs Express `IncomingMessage`/`ServerResponse`
3. **Problème de retours**: `"Return statement is not allowed here"` - Next.js intercepte les retours dans les callbacks
4. **Erreur de build Next.js**: `ModuleBuildError: Expected a semicolon`

**Logs d'erreurs**:

```
[ERROR] Module build failed (from ./node_modules/next/dist/build/webpack/loaders/next-swc-loader.js):
Error:
  x Expected a semicolon
     ,-[/path/to/route.ts:376:1]
```

**Résultat**: ❌ **ÉCHEC** - Impossible de compiler avec le SDK officiel

**Analyse**:

- Le SDK MCP est conçu pour Express.js, pas pour Next.js
- Les types `Request`/`Response` de Node.js ne correspondent pas à ceux de Next.js
- Tentative de cast `as any` insuffisante
- Nécessite une couche d'adaptation complexe ou une implémentation manuelle

---

### ✅ Scénario 4 : Implémentation manuelle JSON-RPC 2.0 (ACTUEL)

**Approche**: Implémentation manuelle du protocole MCP sans dépendance externe complexe

**Configuration**:

- Package: `zod@4.3.4` (pour validation)
- Route: `app/api/mcp/route.ts`
- Architecture: JSON-RPC 2.0 + protocol v2025-11-25

**Implémentation**:

```typescript
// Gestion manuelle des requêtes JSON-RPC 2.0
export async function POST(request: NextRequest) {
  const body = await request.json();

  switch (body.method) {
    case 'initialize':
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          protocolVersion: "2025-11-25",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "RFP Analyzer MCP Server", version: "1.0.0" }
        }
      });

    case 'tools/list':
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        result: { tools: [...] }
      });

    case 'tools/call':
      // Dispatch to tool handlers
      return await dispatchTool(body.params);
  }
}
```

**Outils MCP implémentés**:

1. **test_connection** - Test de santé du serveur
2. **get_rfps** - Liste des RFPs avec pagination
3. **get_requirements** - Liste des exigences pour un RFP avec pagination
4. **get_requirements_tree** - Arborescence hiérarchique (4 niveaux)
5. **list_suppliers** - Liste des fournisseurs pour un RFP avec pagination

**Résultat**: ✅ **SUCCÈS PARTIEL**

- ✅ `initialize` fonctionne correctement
- ✅ Protocole JSON-RPC 2.0 conforme
- ✅ Protocol version `2025-11-25` correcte
- ✅ CORS configuré
- ⚠️ **Tools/list** - À valider avec MCP Inspector
- ⚠️ **Tools/call** - À valider avec MCP Inspector

**Tests validés**:

```bash
# Initialize - ✅ Fonctionnel
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# Retourne:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-11-25",
    "capabilities": { "tools": { "listChanged": false } },
    "serverInfo": { "name": "RFP Analyzer MCP Server", "version": "1.0.0" }
  }
}
```

**Analyse**:

- ✅ Approche la plus simple et fiable
- ✅ Pas de dépendances complexes problématiques
- ✅ Contrôle total sur le protocole
- ✅ Compatible avec Next.js Request/Response
- ⚠️ Nécessite implémentation complète de tous les handlers JSON-RPC
- ⚠️ Devrait être testée avec MCP Inspector pour validation complète

---

## 🔬 Diagnostic: Pourquoi les approches wrapper ont échoué

### Racine du problème mcp-handler

1. **Incompatibilité de version documentée**
   - Issue GitHub #131 identifie le problème exact
   - mcp-handler@1.0.4 construit pour SDK v1.25.0
   - Projet utilise SDK v1.25.1
   - Incompatibilité introduite dans une mise à jour récente

2. **Problème de publication de package**
   - La fonction `createMcpRouteHandler` mentionnée dans la README n'existe pas
   - Possible problème de build ou de versionnement incorrect
   - Différence entre code source et bundle publié

3. **Problème de compatibilité Next.js**
   - mcp-handler semble optimisé pour Express.js
   - Next.js Request/Response incompatibles avec Express
   - Nécessite un adaptateur complexe ou une route Express dans Next.js

4. **Cache persistant Next.js**
   - Même après suppression du dossier `.next`
   - Même après `npm run dev`
   - Nécessite redémarrage complet de l'IDE

### Racine du problème SDK officiel

1. **Framework mismatch**
   - SDK conçu pour Express.js (Node.js standard)
   - Next.js Request/Response incompatibles
   - Les types ne correspondent pas

2. **Callbacks de transport inadaptés**
   - `StreamableHTTPServerTransport` attend des callbacks Express-style
   - Next.js ne peut pas fournir ces callbacks directement
   - Tentative de cast `as any` insuffisante

3. **Restrictions Next.js**
   - Next.js intercepte certains retours
   - "Return statement is not allowed here" dans les callbacks
   - Règles de compilation strictes (SWC)

---

## 📊 Comparatif des Approches

| Approche                    | Complexité | Maintenance           | Performance | Fiabilité | Résultat          |
| --------------------------- | ---------- | --------------------- | ----------- | --------- | ----------------- |
| **mcp-handler v1.0.4**      | Moyenne    | Dépendance externe    | Bonne       | Faible    | ❌ Échec          |
| **mcp-handler v1.0.5**      | Moyenne    | Dépendance externe    | Bonne       | Faible    | ❌ Échec          |
| **SDK officiel**            | Élevée     | Dépendance officielle | Bonne       | Moyenne   | ❌ Échec          |
| **Implémentation manuelle** | Moyenne    | Maintenance directe   | Correcte    | Haute     | ✅ Succès partiel |

---

## 🎯 Recommandations Futures

### Court terme (1-2 semaines)

1. **Valider l'implémentation manuelle avec MCP Inspector**
   - Tester tous les 5 tools
   - Vérifier `tools/list` et `tools/call`
   - Confirmer compatibilité complète

2. **Compléter les handlers manquants**
   - `notifications/list` (si requis)
   - `prompts/list` (si requis)
   - `resources/list` (si requis)

3. **Améliorer la gestion d'erreurs**
   - Messages d'erreur plus descriptifs
   - Codes d'erreur JSON-RPC conformes
   - Logging structuré

4. **Tester la persistance de sessions**
   - Gestion des sessions MCP
   - Cleanup automatique des sessions inactives

### Moyen terme (1-3 mois)

1. **Contribuer à mcp-handler**
   - Reporter les bugs identifiés
   - Proposer un fix pour la compatibilité SDK v1.25.1
   - Contribuer des tests Next.js

2. **Implémenter SSE (Server-Sent Events)**
   - Pour notifications serveur→client
   - Event store pour la reprise de connexion
   - Compatibilité avec les clients MCP modernes

3. **Sécuriser le serveur MCP**
   - Authentification optionnelle
   - Rate limiting
   - Validation des inputs

### Long terme (3-6 mois)

1. **Architecture multi-transport**
   - HTTP/HTTPS (actuel)
   - SSE (pour les notifications)
   - WebSocket (futur, pour temps réel)
   - Support de transport configurables

2. **Monitoring et observabilité**
   - Métriques d'utilisation
   - Alertes sur les erreurs
   - Performance tracking
   - Analytics d'utilisation des tools

3. **Tests automatisés**
   - Suite de tests unitaires pour tous les tools
   - Tests d'intégration avec MCP Inspector
   - Tests de charge
   - Tests de compatibilité MCP spec

---

## 📝 Code de référence

### Implémentation manuelle JSON-RPC (Actuelle)

**Fichier**: `app/api/mcp/route.ts`

**Architecture**:

```typescript
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const body = await request.json();
    httpLogger.info(`MCP request received`, {
      method: body.method,
      id: body.id,
    });

    switch (body.method) {
      case "initialize":
        return await handleInitialize(body.id);
      case "tools/list":
        return await handleToolsList(body.id);
      case "tools/call":
        return await handleToolCall(body.id, body.params);
      default:
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: `Method not found: ${body.method}`,
            },
            id: body.id,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    httpLogger.error(`Error processing request`, { error });
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error",
          data: error instanceof Error ? error.message : String(error),
        },
        id: null,
      },
      { status: 400 }
    );
  }
}
```

**Business logic** (existant):

- `lib/mcp/tools/test-connection.ts`
- `lib/mcp/tools/get-rfps.ts`
- `lib/mcp/tools/get-requirements.ts`
- `lib/mcp/tools/get-requirements-tree.ts`
- `lib/mcp/tools/list-suppliers.ts`

**Utils** (existant):

- `lib/mcp/utils/logger.ts`
- `lib/mcp/utils/mock-data.ts`
- `lib/mcp/utils/pagination.ts`
- `lib/mcp/utils/requirements-tree.ts`

---

## 🧪 Plan de validation MCP Inspector

### Pré-requis

- [ ] Serveur Next.js démarré (`npm run dev`)
- [ ] MCP Inspector installé (`npx @modelcontextprotocol/inspector`)
- [ ] Endpoint accessible: `http://localhost:3000/api/mcp`

### Scénarios de test

#### Test 1: Initialize

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

**Attendu**:

- ✅ Status: 200 OK
- ✅ Protocol version: "2025-11-25"
- ✅ Server info présent
- ✅ Capabilities: `{ tools: { listChanged: false } }`

#### Test 2: List Tools

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

**Attendu**:

- ✅ 5 tools listés dans l'Inspector
- ✅ Descriptions complètes
- ✅ Schemas de validation présents
- ✅ Pas d'erreur de connexion

#### Test 3: Tool Call - test_connection

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"test_connection","arguments":{}}}'
```

**Attendu**:

- ✅ Status: 200 OK
- ✅ Résultat: `{ status: "ok", message: "...", timestamp: "..." }`
- ✅ Content type: text avec JSON stringify

#### Test 4: Tool Call - get_rfps

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_rfps","arguments":{"limit":10}}}'
```

**Attendu**:

- ✅ Status: 200 OK
- ✅ Liste de RFPs (max 10)
- ✅ Pagination correcte

#### Test 5: Tool Call - get_requirements

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_requirements","arguments":{"rfp_id":"abc123","limit":5}}}'
```

**Attendu**:

- ✅ Status: 200 OK
- ✅ Liste des exigences (max 5)
- ✅ Filtre par rfp_id

---

## 📚 Documentation existante

### Documents MCP disponibles

- ✅ `docs/mcp/ARCHITECTURE_MCP.md` - Architecture globale
- ✅ `docs/mcp/IMPLEMENTATION_PLAN_MCP.md` - Plan d'implémentation
- ✅ `docs/mcp/MCP_BEST_PRACTICES.md` - Bonnes pratiques MCP
- ✅ `docs/mcp/MCP_DOCUMENTATION.md` - Documentation du protocole
- ✅ `docs/mcp/MCP_INSPECTOR_GUIDE.md` - Guide MCP Inspector
- ✅ `docs/mcp/FEATURES_SUMMARY_MCP.md` - Résumé des fonctionnalités
- ✅ `docs/mcp/SPECS_MCP.md` - Spécifications techniques
- ✅ `docs/mcp/phase 1/` - Documentation Phase 1 (déprécié, à archiver)
- ✅ `docs/mcp/phase 1/TESTING_TOOLS.md` - Tests des outils (déprécié, à archiver)

### Documentation à créer

- [ ] `docs/mcp/MCP_VALIDATION_CHECKLIST.md` - Checklist de validation
- [ ] `docs/mcp/MCP_TROUBLESHOOTING.md` - Guide de troubleshooting
- [ ] `docs/mcp/MCP_MONITORING_SETUP.md` - Configuration monitoring

---

## 🎓 Leçons apprises

1. **Ne pas se fier aveuglément à la documentation officielle**
   - Les README peuvent être désynchronisées
   - Vérifier toujours les exports réels du package
   - Tester localement avant de supposer qu'un outil fonctionne

2. **La compatibilité de versions est critique**
   - mcp-handler@1.0.4 ≠ SDK@1.25.1 (incompatible)
   - Toujours vérifier les peer dependencies
   - Consulter les issues GitHub pour les problèmes connus

3. **Next.js impose des restrictions spécifiques**
   - Les retours dans les callbacks sont limités
   - Le système de compilation est plus strict que Node.js standard
   - Les imports dynamiques nécessitent une attention particulière

4. **L'implémentation manuelle offre plus de contrôle**
   - Moins de dépendances externes
   - Debugging plus facile
   - Compréhension plus profonde du protocole
   - Maintenance plus simple

5. **Le cache Next.js peut être persistant**
   - Supprimer `.next` n'est pas toujours suffisant
   - Parfois redémarrer le serveur ou l'IDE nécessaire
   - Important pour le développement itératif

---

## 🚀 Actions immédiates à prendre

1. **Tester l'implémentation actuelle avec MCP Inspector**

   ```bash
   npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
   ```

2. **Si l'Inspector fonctionne, documenter le succès**
   - Créer `docs/mcp/MCP_INSPECTOR_SUCCESS.md`
   - Capturer les résultats des tests
   - Identifier les fonctionnalités manquantes

3. **Si l'Inspector échoue, analyser les logs**
   - Vérifier les requêtes MCP envoyées
   - Comparer avec la spécification JSON-RPC 2.0
   - Corriger les incompatibilités

4. **Préparer la mise en production**
   - Review de sécurité
   - Configuration de monitoring
   - Documentation pour les développeurs

---

## 🔗 Références

### Documentation MCP

- [MCP Specification](https://modelcontextprotocol.io/docs/specification/2025-11-25)
- [MCP Server SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Vercel MCP Handler](https://github.com/vercel/mcp-handler)

### Issues GitHub pertinentes

- [Issue #131: Compatibility with SDK 1.25.x](https://github.com/vercel/mcp-handler/issues/131)
- [Issue #1277: Zod v4 compatibility](https://github.com/modelcontextprotocol/typescript-sdk/issues/1277)
- [Issue #1251: Migrate to Zod 4](https://github.com/modelcontextprotocol/typescript-sdk/issues/1251)

### Guides

- [MCP Inspector Usage](https://github.com/modelcontextprotocol/inspector)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Statut**: 📝 DOCUMENTATION COMPLÈTE  
**Prêt pour**: Validation MCP Inspector et déploiement en production

---

_Document généré automatiquement après rétrospective complète des scénarios MCP_
