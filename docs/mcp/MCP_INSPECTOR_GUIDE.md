# 🔍 Guide - Tester avec MCP Inspector

Ce guide te montre comment tester les tools MCP avec l'outil officiel MCP Inspector.

## 📋 Prérequis

- Node.js 18+
- npm ou yarn
- Serveur MCP en développement local

## 🚀 Démarrage Rapide

### 1. Lancer le serveur MCP

```bash
cd mcp-server
npm install
npm run dev
```

Le serveur démarre sur: `http://localhost:3000/api/mcp`

### 2. Lancer MCP Inspector

Dans un autre terminal:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

MCP Inspector s'ouvre dans ton navigateur sur: `http://localhost:3000`

## 🎯 Tests Disponibles

### 1. Test de Connexion

**Tool**: `test_connection`

**Paramètres**: Aucun

**Utilisation dans MCP Inspector**:

1. Sélectionne `test_connection` dans la liste des tools
2. Clique sur "Invoke"
3. Tu dois voir le message "✅ Connexion réussie"

**Attendu**:

```
✅ Connexion réussie au serveur MCP RFP Analyzer !

Serveur opérationnel et prêt à recevoir des requêtes.

Tools disponibles:
- test_connection
- get_rfps
- get_requirements
- list_suppliers
```

---

### 2. Lister les RFPs

**Tool**: `get_rfps`

**Paramètres**:

```json
{
  "limit": 50, // Optionnel (default: 50, max: 100)
  "offset": 0 // Optionnel (default: 0)
}
```

**Utilisation dans MCP Inspector**:

1. Sélectionne `get_rfps`
2. Paramètres optionnels:
   - `limit`: 50
   - `offset`: 0
3. Clique sur "Invoke"

**Attendu** (3 RFPs mockées):

```json
{
  "rfps": [
    {
      "id": "rfp-001",
      "name": "RFP - Infrastructure Cloud 2026",
      "description": "Évaluation des fournisseurs cloud...",
      "status": "active",
      "created_at": "2025-12-01T10:00:00Z",
      "requirements_count": 45,
      "suppliers_count": 3
    },
    {
      "id": "rfp-002",
      "name": "RFP - Solution CRM",
      ...
    },
    ...
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 3,
    "has_more": false
  }
}
```

---

### 3. Récupérer les Exigences d'un RFP

**Tool**: `get_requirements`

**Paramètres** (obligatoires/optionnels):

```json
{
  "rfp_id": "rfp-001", // Obligatoire
  "domain": "Sécurité", // Optionnel (filtrage)
  "limit": 50, // Optionnel
  "offset": 0 // Optionnel
}
```

**Utilisation dans MCP Inspector**:

1. Sélectionne `get_requirements`
2. Remplis `rfp_id`: `rfp-001`
3. Optionnel - `domain`: `Sécurité`
4. Clique sur "Invoke"

**Attendu** (exigences du RFP):

```json
{
  "rfp_id": "rfp-001",
  "requirements": [
    {
      "id": "req-sec-001",
      "requirement_id_external": "SEC-1.1.1",
      "title": "Authentification Multi-Facteur",
      "description": "Support MFA pour tous les accès utilisateurs",
      "level": 4,
      "domain": "Sécurité",
      "weight": 1.0,
      "parent_id": "req-sec-level3-001"
    },
    ...
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 8,
    "has_more": false
  }
}
```

**Domaines disponibles**:

- Sécurité
- Infrastructure
- Performance

---

### 4. Lister les Fournisseurs

**Tool**: `list_suppliers`

**Paramètres**:

```json
{
  "rfp_id": "rfp-001", // Obligatoire
  "limit": 50, // Optionnel
  "offset": 0 // Optionnel
}
```

**Utilisation dans MCP Inspector**:

1. Sélectionne `list_suppliers`
2. Remplis `rfp_id`: `rfp-001`
3. Clique sur "Invoke"

**Attendu** (4 fournisseurs mockés):

```json
{
  "rfp_id": "rfp-001",
  "suppliers": [
    {
      "id": "supplier-001",
      "name": "CloudTech Solutions",
      "status": "active",
      "responses_count": 45,
      "evaluated_responses_count": 38,
      "average_score": 4.2,
      "created_at": "2025-12-01T10:00:00Z"
    },
    {
      "id": "supplier-002",
      "name": "SecureNet Corp",
      "status": "active",
      "responses_count": 45,
      "evaluated_responses_count": 45,
      "average_score": 3.8
    },
    ...
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 4,
    "has_more": false
  }
}
```

---

## 🧪 Scénarios de Test Recommandés

### Scénario 1: Exploration Basique

```
1. Appelle test_connection → Vérifier la connexion
2. Appelle get_rfps → Voir la liste des RFPs
3. Note l'ID d'un RFP (ex: "rfp-001")
```

### Scénario 2: Exploration RFP

```
1. Appelle get_rfps → Récupérer la liste
2. Appelle get_requirements avec rfp_id="rfp-001"
   → Voir toutes les exigences
3. Appelle get_requirements avec rfp_id="rfp-001" et domain="Sécurité"
   → Filtrer par domaine
4. Appelle list_suppliers avec rfp_id="rfp-001"
   → Voir les fournisseurs
```

### Scénario 3: Test Pagination

```
1. Appelle get_rfps avec limit=2, offset=0
   → Voir 2 RFPs
2. Appelle get_rfps avec limit=2, offset=2
   → Voir les RFPs suivants
3. Vérifier pagination.has_more dans les réponses
```

### Scénario 4: Test Filtrage

```
1. Appelle get_requirements avec rfp_id="rfp-001" et domain="Infrastructure"
   → Voir seulement les exigences Infrastructure
2. Appelle get_requirements avec rfp_id="rfp-001" et domain="Performance"
   → Voir seulement les exigences Performance
```

---

## 📊 Données Mockées Disponibles

### RFPs

- `rfp-001`: Infrastructure Cloud 2026 (45 exigences, 3 fournisseurs)
- `rfp-002`: Solution CRM (38 exigences, 4 fournisseurs)
- `rfp-003`: Plateforme Analytics (52 exigences, 2 fournisseurs)

### Domaines d'Exigences

- **Sécurité**: 3 exigences (SEC-1.1.1, SEC-1.1.2, SEC-1.2.1)
- **Infrastructure**: 2 exigences (INFRA-2.1.1, INFRA-2.1.2)
- **Performance**: 2 exigences (PERF-3.1.1, PERF-3.2.1)

### Fournisseurs

- `supplier-001`: CloudTech Solutions (actif, score 4.2)
- `supplier-002`: SecureNet Corp (actif, score 3.8)
- `supplier-003`: Infrastructure Plus (actif, score 3.5)
- `supplier-004`: Global Services Ltd (en attente, aucun score)

---

## 🐛 Dépannage

### "Cannot connect to server"

```
✗ Erreur: Impossible de se connecter à http://localhost:3000/api/mcp

Solution:
1. Vérifier que le serveur est lancé: npm run dev
2. Vérifier le port (3000 par défaut)
3. Vérifier les logs du serveur pour les erreurs
```

### "Tool not found"

```
✗ Erreur: Tool "get_rfps" not found

Solution:
1. Vérifier que registerAllTools() est appelé dans route.ts
2. Vérifier les logs du serveur
3. Relancer le serveur avec Ctrl+C et npm run dev
```

### "Invalid parameters"

```
✗ Erreur: Invalid parameters for get_requirements

Solution:
1. Vérifier que rfp_id est fourni (obligatoire)
2. Vérifier le format JSON des paramètres
3. Consulter le schéma du tool dans MCP Inspector
```

---

## 📝 Notes de Développement

### Comment ajouter un nouveau tool

1. Créer le fichier: `lib/mcp/tools/{category}/{tool-name}.ts`
2. Implémenter `handle{ToolName}()` et `{toolName}ToolSpec`
3. Exporter depuis `lib/mcp/tools/index.ts`
4. Ajouter l'enregistrement dans `registerAllTools()`
5. Mettre à jour `route.ts` capabilities
6. Tester avec MCP Inspector

### Structure d'un Tool

```typescript
// Spécification
export const myToolSpec = {
  name: "my_tool",
  description: "Description du tool",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "..." },
      param2: { type: "number", description: "..." },
    },
    required: ["param1"],
  },
};

// Handler
export async function handleMyTool(params: any, context: any) {
  try {
    // Traitement...
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
}
```

---

## 🎓 Ressources

- [MCP Inspector GitHub](https://github.com/modelcontextprotocol/inspector)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Best Practices](./MCP_BEST_PRACTICES.md)

---

**Dernière mise à jour**: 2026-01-02
