# Guide: Utiliser MCP Inspector avec RFP Analyzer

## ✅ Implémentation Actuelle

Le serveur MCP **supporte maintenant nativement le protocole Streamable HTTP** compatible avec MCP Inspector en mode HTTP/SSE.

**Architecture:**

- `GET /api/mcp` - Retourne un SSE descriptor (one-time, compatible Vercel)
- `POST /api/mcp/message` - Handle tous les messages JSON-RPC
- `POST /api/mcp` - Maintenu pour rétrocompatibilité (curl)

## Utilisation avec MCP Inspector

### Méthode 1: HTTP/SSE (Recommandé) ✅

Le serveur supporte maintenant MCP Inspector en mode HTTP/SSE directement.

#### Étape 1: S'assurer que le serveur dev tourne

```bash
npm run dev
# Attend que "Ready in XXms" apparaisse
```

#### Étape 2: Lancer MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

#### Étape 3: Configurer le transport

1. Dans l'interface MCP Inspector, choisir **HTTP/SSE** comme transport
2. URL: `http://localhost:3000/api/mcp`
3. Cliquer sur **Connect**

#### Étape 4: Tester les outils

1. **initialize** - Retourne serverInfo et capabilities
2. **tools/list** - Liste les 5 outils disponibles
3. Tester chaque outil individuellement

---

### Méthode 2: stdio (Alternative)

Si vous préférez utiliser stdio, le wrapper est toujours disponible.

```bash
npx @modelcontextprotocol/inspector npx tsx scripts/mcp-stdio-wrapper.ts
```

---

## Tests avec curl

Le serveur maintient la rétrocompatibilité avec les tests curl directs.

### Test du SSE descriptor

```bash
curl -N http://localhost:3000/api/mcp
# Retourne: data: {"jsonrpc":"2.0","method":"endpoint","params":{"uri":"http://localhost:3000/api/mcp/message"}}
```

### Test des outils via le message endpoint

```bash
# Initialize
curl -X POST http://localhost:3000/api/mcp/message \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | jq

# Liste des outils
curl -X POST http://localhost:3000/api/mcp/message \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | jq '.result.tools[].name'

# Appel d'un outil
curl -X POST http://localhost:3000/api/mcp/message \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_rfps","arguments":{"limit":5}}}' | jq
```

### Test rétrocompatibilité (POST direct sur /api/mcp)

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'
```

---

## Configuration Claude Desktop

### Fichier de configuration

```bash
# macOS
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Configuration recommandée

```json
{
  "mcpServers": {
    "rfp-analyzer": {
      "command": "npx",
      "args": ["tsx", "/chemin/absolu/vers/scripts/mcp-stdio-wrapper.ts"]
    }
  }
}
```

**Note:** Utilisez le wrapper stdio pour Claude Desktop car il gère mieux les connexions longue durée que le transport HTTP.

---

## Architecture Technique

### Protocole Streamable HTTP Implémenté

Le serveur implémente le protocole MCP Streamable HTTP de façon compatible avec Vercel:

1. **SSE Descriptor (GET /api/mcp)**
   - Stream SSE one-time (pas de connexion longue durée)
   - Retourne l'URL du message endpoint
   - Se ferme immédiatement (compatible Vercel 60s timeout)

2. **Message Endpoint (POST /api/mcp/message)**
   - Handle tous les messages JSON-RPC
   - Support `mcp-session-id` header (optionnel)
   - Gère: `initialize`, `tools/list`, `tools/call`

3. **Rétrocompatibilité (POST /api/mcp)**
   - Endpoint maintenu pour curl et tests simples
   - Même handlers que /api/mcp/message

### Comparaison des Transports

| Feature             | Implémentation Actuelle | mcp-handler |
| ------------------- | ----------------------- | ----------- |
| JSON-RPC 2.0        | ✅                      | ✅          |
| SSE descriptor      | ✅                      | ✅          |
| Message endpoint    | ✅                      | ✅          |
| MCP Inspector HTTP  | ✅                      | ❌ (SDK v)  |
| MCP Inspector stdio | ✅ (wrapper)            | ✅          |
| curl direct         | ✅                      | ❌          |
| Vercel compatible   | ✅ (one-time SSE)       | ✅          |
| Claude Desktop      | ✅ (stdio wrapper)      | ✅          |

---

## Dépannage

### MCP Inspector ne se connecte pas en HTTP/SSE

1. **Vérifier que le serveur dev tourne:**

   ```bash
   curl http://localhost:3000/api/mcp
   # Devrait retourner un SSE descriptor
   ```

2. **Vérifier les logs du serveur:**
   - Terminal où tourne `npm run dev`
   - Devrait afficher `[MCP] SSE descriptor requested`

3. **Tester le message endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/mcp/message \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq
   ```

### Erreur "invalid_value" sur inputSchema

Si MCP Inspector retourne une erreur de validation sur `inputSchema`, vérifier que tous les outils ont une structure JSON Schema valide:

```typescript
inputSchema: {
  type: "object",
  properties: {
    // paramètres ici
  },
  required: ["param1"]  // optionnel
}
```

**Pour les outils sans paramètres:**

```typescript
inputSchema: {
  type: "object",
  properties: {}
}
```

### Le wrapper stdio ne démarre pas

```bash
# Vérifier que tsx est installé
npm list tsx

# Installer si nécessaire
npm install -D tsx

# Tester le wrapper manuellement
npx tsx scripts/mcp-stdio-wrapper.ts
# Devrait afficher: [MCP-Wrapper] MCP stdio wrapper started
```

---

## Références

- [TEST_MCP_SERVER.md](TEST_MCP_SERVER.md) - Tests complets avec curl
- [CLAUDE_DESKTOP_CONFIG.md](CLAUDE_DESKTOP_CONFIG.md) - Configuration Claude Desktop
- [MCP_MIGRATION_TEST_RESULTS.md](MCP_MIGRATION_TEST_RESULTS.md) - Historique migration mcp-handler
- [MCP Specification - Tools](https://modelcontextprotocol.io/specification/2024-11-05/server/tools)
- [MCP Specification - Transports](https://modelcontextprotocol.io/specification/2024-11-05/specification/transports)

---

## Historique

- **v1.0 (Initial):** Implémentation JSON-RPC 2.0 simple
- **v2.0 (Actuel):** Support complet Streamable HTTP + Vercel compatible
  - SSE descriptor one-time (pas de long-polling)
  - Message endpoint dédié
  - Rétrocompatibilité maintenue
  - Fix inputSchema JSON Schema validation
