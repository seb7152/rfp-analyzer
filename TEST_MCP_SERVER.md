# Guide de Test du Serveur MCP

## Prérequis

1. **Démarrer le serveur de développement:**
   ```bash
   npm run dev
   ```
   Le serveur démarre sur `http://localhost:3000`

## Option 1: Tester avec MCP Inspector (Interface Graphique)

MCP Inspector est l'outil officiel de test des serveurs MCP.

### Installation et utilisation:

```bash
# Dans un nouveau terminal (le serveur dev doit tourner)
npx @modelcontextprotocol/inspector
```

L'interface web s'ouvre automatiquement dans votre navigateur.

### Configuration dans MCP Inspector:

1. **Transport**: Sélectionner "HTTP/SSE"
2. **URL**: Entrer l'URL de votre serveur:
   - Pour l'implémentation originale: `http://localhost:3000/api/mcp`
   - Pour la nouvelle version (test): `http://localhost:3000/api/mcp-v2`
3. Cliquer sur **Connect**

### Tests à effectuer:

1. **Initialize** - Vérifier que le serveur répond avec `serverInfo`
2. **tools/list** - Lister tous les outils disponibles
3. **tools/call** - Tester chaque outil:
   - `test_connection` (ou `rfp_test_connection` pour v2)
   - `get_rfps` avec `{"limit": 10, "offset": 0}`
   - `get_requirements` avec `{"rfp_id": "rfp_cloud_001", "limit": 10, "offset": 0}`
   - `get_requirements_tree` avec `{"rfp_id": "rfp_cloud_001", "flatten": false}`
   - `list_suppliers` avec `{"rfp_id": "rfp_cloud_001", "limit": 10, "offset": 0}`

### Vérifications pour /api/mcp-v2:

- ✅ Les outils ont le préfixe `rfp_` (ex: `rfp_get_rfps`)
- ✅ Les réponses contiennent `structuredContent` en plus de `content`
- ✅ Les outils ont des `annotations` (readOnlyHint, etc.)
- ✅ Les outils ont des `outputSchema` définis

---

## Option 2: Test Manuel avec curl (Diagnostic)

### Test 1: Vérifier que la route répond

```bash
# Test de l'implémentation originale
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }' | jq '.'
```

**Réponse attendue:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "RFP Analyzer MCP Server",
      "version": "1.0.0"
    }
  }
}
```

### Test 2: Lister les outils

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | jq '.result.tools[].name'
```

**Réponse attendue (implémentation originale):**

```
"test_connection"
"get_rfps"
"get_requirements"
"get_requirements_tree"
"list_suppliers"
```

### Test 3: Appeler un outil

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "test_connection",
      "arguments": {}
    }
  }' | jq '.'
```

**Réponse attendue:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"status\":\"ok\",\"message\":\"MCP server is running\",\"timestamp\":\"...\",\"serverVersion\":\"1.0.0\"}"
      }
    ]
  }
}
```

### Test 4: Appeler get_rfps avec pagination

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_rfps",
      "arguments": {
        "limit": 5,
        "offset": 0
      }
    }
  }' | jq '.result.content[0].text | fromjson | .pagination'
```

**Réponse attendue:**

```json
{
  "limit": 5,
  "offset": 0,
  "total": 3,
  "hasMore": false,
  "nextOffset": null
}
```

---

## Option 3: Test via Claude Desktop (Utilisation Réelle)

### Configuration de Claude Desktop:

1. Ouvrir `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Ajouter la configuration:

```json
{
  "mcpServers": {
    "rfp-analyzer": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

3. Redémarrer Claude Desktop
4. Vérifier dans les paramètres MCP que le serveur est connecté

### Tests dans Claude Desktop:

Posez des questions à Claude qui nécessitent les outils MCP:

- "Liste-moi tous les RFPs disponibles"
- "Montre-moi les requirements du RFP cloud_001"
- "Quels sont les fournisseurs pour le RFP cloud_001 ?"

---

## Diagnostic des Problèmes Courants

### Problème: "Connection refused" ou "Cannot connect"

**Cause:** Le serveur dev n'est pas démarré

**Solution:**

```bash
npm run dev
# Attendre que le message "Ready in XXms" apparaisse
```

### Problème: "404 Not Found"

**Cause:** URL incorrecte ou route non compilée

**Solution:**

- Vérifier l'URL: `http://localhost:3000/api/mcp` (pas de `/` à la fin)
- Vérifier que le fichier existe: `ls app/api/mcp/route.ts`
- Redémarrer le serveur dev

### Problème: "Method not found" dans MCP Inspector

**Cause:** La méthode JSON-RPC n'est pas implémentée

**Solution:**

- Vérifier les logs du serveur (terminal où tourne `npm run dev`)
- Vérifier que la méthode est supportée dans le code
- Pour v2: Vérifier que `mcp-handler` est correctement installé

### Problème: Erreurs de peer dependencies

**Cause:** Incompatibilité de versions entre packages

**Solution:**

```bash
# Réinstaller avec --legacy-peer-deps
npm install --legacy-peer-deps
```

### Problème: "structuredContent" manquant dans les réponses (v2)

**Cause:** Le SDK n'est peut-être pas à la bonne version ou mcp-handler a un problème

**Solution:**

- Vérifier la version du SDK: `npm list @modelcontextprotocol/sdk`
- Version attendue: `1.26.0` (installée avec --legacy-peer-deps)
- Vérifier les logs du serveur pour les warnings

---

## Tests de Conformité MCP

### Checklist pour /api/mcp-v2:

- [ ] **Initialize** répond avec `serverInfo` correct
- [ ] **tools/list** retourne tous les outils
- [ ] Les noms d'outils ont le préfixe `rfp_`
- [ ] Chaque outil a un `inputSchema` Zod
- [ ] Chaque outil a un `outputSchema` Zod
- [ ] Les réponses contiennent `structuredContent`
- [ ] Les outils ont des `annotations` définies
- [ ] La pagination fonctionne (limit/offset)
- [ ] Les erreurs retournent des messages actionnables

### Comparaison /api/mcp vs /api/mcp-v2:

| Critère           | /api/mcp (manuel) | /api/mcp-v2 (SDK) |
| ----------------- | ----------------- | ----------------- |
| Noms d'outils     | `get_rfps`        | `rfp_get_rfps`    |
| Annotations       | ❌ Non            | ✅ Oui            |
| outputSchema      | ❌ Non            | ✅ Oui            |
| structuredContent | ❌ Non            | ✅ Oui            |
| Stabilité         | ✅ Prouvée        | 🟡 À tester       |

---

## Prochaines Étapes

### Si /api/mcp-v2 fonctionne bien:

1. Tester en profondeur avec tous les outils
2. Vérifier les performances (temps de réponse)
3. Tester avec de vraies données (pas seulement mock)
4. Décider si migration vaut le coup

### Si /api/mcp-v2 a des problèmes:

1. Documenter les problèmes rencontrés
2. Retourner à /api/mcp (implémentation stable)
3. Implémenter les améliorations incrémentales sur /api/mcp:
   - Ajouter préfixes `rfp_` aux noms
   - Ajouter annotations manuellement
   - Définir outputSchema dans TOOL_DEFINITIONS

---

## Logs et Debugging

### Activer les logs détaillés:

Le serveur utilise le logger dans `lib/mcp/utils/logger.ts`.

Pour voir les logs:

```bash
# Terminal où tourne npm run dev
# Les logs MCP apparaissent avec le préfixe [MCP] ou [MCP-V2]
```

### Logs utiles à surveiller:

- `[MCP] Calling tool: <tool_name>` - Outil appelé
- `[MCP] Tool call successful` - Succès
- `[MCP] Tool call failed` - Erreur
- Performance metrics (elapsed time)

---

## Ressources

- **MCP Inspector:** `npx @modelcontextprotocol/inspector`
- **MCP Specification:** https://modelcontextprotocol.io/specification/draft.md
- **TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **mcp-handler:** https://github.com/vercel/mcp-handler
- **Résultats de test:** [MCP_MIGRATION_TEST_RESULTS.md](MCP_MIGRATION_TEST_RESULTS.md)
