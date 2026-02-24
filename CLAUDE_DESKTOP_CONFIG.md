# Configuration Claude Desktop pour RFP Analyzer MCP Server

## Prérequis

1. Le serveur dev Next.js doit tourner: `npm run dev`
2. Le serveur écoute sur `http://localhost:3000`

## Configuration

### Fichier de configuration

Ouvrir le fichier de configuration Claude Desktop:

```bash
# macOS
open ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Ou avec nano
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Ajouter la configuration MCP

```json
{
  "mcpServers": {
    "rfp-analyzer": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-everything",
        "http://localhost:3000/api/mcp"
      ]
    }
  }
}
```

**Note**: Cette configuration utilise le serveur proxy MCP officiel qui peut communiquer avec des serveurs HTTP JSON-RPC simples.

### Alternative: Configuration stdio (Nécessite un wrapper)

Si vous voulez une intégration plus directe, vous devrez créer un wrapper stdio qui fait des appels HTTP à votre serveur.

## Redémarrer Claude Desktop

Après avoir modifié la configuration:

1. Quitter complètement Claude Desktop
2. Relancer Claude Desktop
3. Vérifier dans les paramètres que le serveur "rfp-analyzer" apparaît

## Tester dans Claude Desktop

Posez des questions qui nécessitent les outils MCP:

- "Liste tous les RFPs disponibles"
- "Montre-moi les requirements du RFP rfp-001"
- "Quels sont les fournisseurs pour le RFP rfp-001?"

Claude utilisera automatiquement les outils MCP quand nécessaire.

## Dépannage

### Le serveur n'apparaît pas dans Claude Desktop

1. Vérifier que le serveur dev tourne: `curl http://localhost:3000/api/mcp`
2. Vérifier la syntaxe JSON du fichier de configuration
3. Consulter les logs Claude Desktop (Menu > Developer > Show Logs)

### Les outils ne sont pas appelés

1. Vérifier les logs du serveur Next.js (terminal où tourne `npm run dev`)
2. Les logs doivent montrer `[MCP] Request received` quand Claude appelle un outil

### Erreurs de connexion

1. S'assurer que le serveur dev ne se réinitialise pas
2. Vérifier qu'il n'y a pas de firewall qui bloque localhost:3000
