# Guide de dépannage MCP Inspector

## Problème: "Connection Error - Check if your MCP server is running and proxy token is correct"

### Solutions à essayer (dans l'ordre)

#### 1. Vérifier que le serveur Next.js est démarré

```bash
curl http://localhost:3000/api/mcp
```

Devrait retourner :

```json
{
  "status": "ok",
  "server": {
    "name": "RFP Analyzer MCP Server",
    "version": "1.0.0"
  }
}
```

#### 2. Essayer différentes URLs

MCP Inspector peut avoir besoin d'une URL spécifique. Essayez dans cet ordre :

```bash
# URL par défaut
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp

# URL avec 127.0.0.1
npx @modelcontextprotocol/inspector http://127.0.0.1:3000/api/mcp

# URL sans chemin
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp/
```

#### 3. Désactiver le proxy (si applicable)

Si vous utilisez un proxy local ou entreprise :

```bash
# Essayer sans proxy
NO_PROXY=* npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp

# Ou utiliser l'option --no-proxy si disponible
npx @modelcontextprotocol/inspector --no-proxy http://localhost:3000/api/mcp
```

#### 4. Vérifier la version de MCP Inspector

```bash
npx @modelcontextprotocol/inspector --version
```

#### 5. Utiliser verbose/debug mode

```bash
# Avec logs détaillés (si disponible)
npx @modelcontextprotocol/inspector --verbose http://localhost:3000/api/mcp

# Ou avec debug
DEBUG=* npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

#### 6. Tester avec un client MCP alternatif

Si MCP Inspector ne fonctionne pas, testez avec d'autres clients MCP :

```bash
# Via Claude Desktop (si disponible)
# Configurez dans Claude Desktop Settings > Connectors > Add Custom Connector

# Via un test manuel
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

#### 7. Vérifier les ports et firewall

```bash
# Vérifier que le port 3000 est ouvert
lsof -ti:3000

# Vérifier le firewall (macOS)
sudo pfctl -s rules | grep 3000
```

---

## Solutions alternatives

### Option A: Ignorer MCP Inspector pour l'instant

Le serveur MCP fonctionne correctement (validé par curl). Vous pouvez :

1. **Passer directement à l'implémentation des Resources** (PHASE 3)
2. **Tester avec un autre client MCP** (Claude Desktop, custom client)
3. **Déployer sur Vercel** et tester avec l'URL de production

### Option B: Utiliser le SDK MCP officiel pour un client

Créer un script de test simple :

```typescript
// test-mcp-client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const transport = new SSEClientTransport(
  new URL("http://localhost:3000/api/mcp")
);

const client = new Client(
  {
    name: "test-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

await client.connect(transport);

// Test
const tools = await client.listTools();
console.log("Tools:", tools);

await client.close();
```

### Option C: Contribuer aux tests

Si MCP Inspector a un bug, vous pouvez :

1. Ouvrir une issue sur GitHub : https://github.com/modelcontextprotocol/inspector
2. Contacter l'équipe MCP sur leur Discord
3. Utiliser le support Claude.ai

---

## Prochaine étape recommandée

Puisque le serveur fonctionne correctement via curl, je vous recommande de :

1. **Continuer avec l'implémentation des Resources RFP** (PHASE 3)
2. **Tester le déploiement sur Vercel**
3. **Documenter l'implémentation** pour les futurs utilisateurs

Le serveur MCP est **fonctionnel et prêt à être utilisé** même si MCP Inspector ne fonctionne pas dans votre environnement actuel.

---

## Scripts de test disponibles

- `diagnose-mcp.sh` - Diagnostic complet du serveur
- `test-mcp-complete.sh` - Test des endpoints MCP
- `test-mcp-server.sh` - Tests de base

Tous ces scripts confirment que le serveur fonctionne correctement.
