# Spécifications Serveur MCP - RFP Analyzer

**Version**: 1.1
**Date**: 2025-12-31
**Focus**: Consultation et analyse des données RFP
**MCP Protocol Version**: 2025-11-25

---

## 📚 Références MCP

Cette spécification suit les meilleures pratiques MCP officielles :

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [Build Server Guide](https://modelcontextprotocol.io/docs/develop/build-server)
- [Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts)

### Principes MCP appliqués

1. **Séparations des responsabilités** : Tools vs Resources vs Prompts
2. **Validation avec JSON Schema** : Utilisation de Zod pour tous les inputs/outputs
3. **Logging sécurisé** : Pas de console.log, uniquement stderr pour STDIO
4. **Gestion d'erreurs robuste** : Messages d'erreur structurés
5. **Contextualisation** : Support complet de MCPContext pour isolation multi-tenant
6. **Parameter completion** : Support de l'autocomplétion pour les paramètres dynamiques

---

## 🎯 Objectifs Principaux

Le serveur MCP doit permettre à Claude (et autres clients MCP) de :

1. **Consulter les RFPs** de l'organisation
2. **Explorer les exigences** par domaine/catégorie
3. **Analyser les réponses fournisseurs** avec contexte complet
4. **Comparer les fournisseurs** sur des domaines spécifiques ou globalement

### Cas d'usage prioritaires

```
UC1: "Montre-moi toutes les réponses du fournisseur Acme pour le domaine Sécurité"
UC2: "Compare les réponses de tous les fournisseurs pour l'exigence REQ-042"
UC3: "Donne-moi un résumé du RFP avec les exigences par domaine"
UC4: "Quelles sont les réponses des 3 fournisseurs pour le domaine Infrastructure ?"
UC5: "Exporte toutes les réponses avec les exigences pour le domaine Conformité"
```

---

## 🏗️ Architecture MCP

### Transport Supporté

Le serveur implémente le **MCP Streamable HTTP Transport** (standard depuis mars 2025, remplace SSE).

#### 1. **HTTP Transport** (Production & Claude Code)

**Endpoint** : `https://votre-domaine.vercel.app/api/mcp`

**Configuration Claude Code** :

```bash
# Ajouter le serveur MCP
claude mcp add --transport http rfp-analyzer https://votre-app.vercel.app/api/mcp \
  --header "x-pat-token: votre_token_pat" \
  --header "x-organization-id: votre_org_id" \
  --scope user
```

**Headers requis** :

- `x-pat-token`: Personal Access Token (créé via UI ou tool `create_personal_access_token`)
- `x-organization-id`: UUID de votre organisation Supabase

**Avantages** :

- ✅ Compatible Claude Code, Claude Desktop, Claude Web
- ✅ Serverless-friendly (Vercel, Cloudflare Workers)
- ✅ Stateless, scalable horizontalement
- ✅ Pas de connexion persistente (vs SSE deprecated)

**Note** : SSE (Server-Sent Events) transport est déprécié depuis MCP 2025-03-26. Utiliser HTTP simple.

#### 2. **STDIO Transport** (Développement Local)

**Usage** : Tests locaux avec Claude Desktop ou MCP Inspector

```bash
# Avec MCP Inspector
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

**Important** :

- Logs sur `stderr` uniquement (pas `console.log`)
- Pour debug local, pas pour production

### Server Capabilities

```typescript
{
  capabilities: {
    tools: { listChanged: true },
    resources: {
      subscribe: true,
      listChanged: true
    },
    prompts: { listChanged: true }
  }
}
```

---

## 📦 1. Resources (Accès Données)

### 1.1 RFPs

#### `rfp://list`

Liste tous les RFPs accessibles à l'organisation.

**Réponse:**

```json
{
  "rfps": [
    {
      "id": "uuid",
      "title": "RFP - Plateforme CRM 2025",
      "description": "...",
      "status": "active",
      "created_at": "2025-01-15",
      "suppliers_count": 5,
      "requirements_count": 120,
      "domains": ["Sécurité", "Infrastructure", "Conformité"]
    }
  ]
}
```

#### `rfp://{rfp_id}`

Détails complets d'un RFP.

**Réponse:**

```json
{
  "id": "uuid",
  "title": "RFP - Plateforme CRM 2025",
  "description": "Description détaillée...",
  "status": "active",
  "organization_id": "uuid",
  "created_by": "user@example.com",
  "created_at": "2025-01-15",

  "statistics": {
    "total_requirements": 120,
    "total_suppliers": 5,
    "domains_count": 4,
    "completion_rate": "78%",
    "avg_score": 3.8
  },

  "domains": [
    {
      "name": "Sécurité",
      "requirements_count": 35,
      "weight": 0.3
    },
    {
      "name": "Infrastructure",
      "requirements_count": 40,
      "weight": 0.25
    }
  ],

  "suppliers": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "responses_count": 118,
      "avg_score": 4.2
    }
  ]
}
```

#### `rfp://{rfp_id}/summary`

Résumé exécutif optimisé pour l'analyse.

**Réponse:**

```json
{
  "rfp": {
    "id": "uuid",
    "title": "RFP - Plateforme CRM 2025"
  },
  "overview": {
    "total_requirements": 120,
    "domains": 4,
    "suppliers": 5,
    "evaluation_status": "78% complete"
  },
  "top_suppliers": [
    { "name": "Acme Corp", "avg_score": 4.2 },
    { "name": "Beta Inc", "avg_score": 3.9 }
  ],
  "critical_gaps": [
    "2 exigences sécurité non couvertes par TechCo",
    "Infrastructure: réponses incomplètes de Gamma Ltd"
  ]
}
```

---

### 1.2 Requirements (Exigences)

#### `requirements://{rfp_id}/tree`

Hiérarchie complète des exigences (4 niveaux).

**Réponse:**

```json
{
  "rfp_id": "uuid",
  "requirements_tree": [
    {
      "id": "uuid-domain-1",
      "level": 1,
      "code": "DOM-1",
      "title": "Sécurité",
      "weight": 0.3,
      "children": [
        {
          "id": "uuid-cat-1-1",
          "level": 2,
          "code": "CAT-1.1",
          "title": "Authentification",
          "weight": 0.4,
          "children": [
            {
              "id": "uuid-req-1",
              "level": 4,
              "code": "REQ-001",
              "title": "SSO SAML 2.0",
              "description": "Le système doit supporter l'authentification SSO via SAML 2.0",
              "weight": 1.0,
              "responses_count": 5
            }
          ]
        }
      ]
    }
  ]
}
```

#### `requirements://{rfp_id}/domain/{domain_name}`

Toutes les exigences d'un domaine spécifique.

**Paramètres:**

- `domain_name`: Nom du domaine (ex: "Sécurité", "Infrastructure")
- `include_responses`: `true|false` (défaut: false)
- `include_details`: `true|false` (défaut: false) - Décomposition AI/Manuel dans les réponses
- `supplier_ids[]`: Liste de fournisseurs à inclure (optionnel)
- `limit`: Nombre max de requirements par page (défaut: 50, max: 100)
- `offset`: Offset pour la pagination (défaut: 0)

**Réponse (sans responses):**

```json
{
  "domain": {
    "name": "Sécurité",
    "code": "DOM-1",
    "weight": 0.3,
    "requirements_count": 35
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 35,
    "has_more": false
  },
  "requirements": [
    {
      "id": "uuid",
      "code": "REQ-001",
      "title": "SSO SAML 2.0",
      "description": "Le système doit supporter...",
      "context": "Contexte additionnel...",
      "weight": 1.0,
      "category": "Authentification",
      "subcategory": "SSO"
    }
  ]
}
```

**Réponse (avec responses pour 2 fournisseurs):**

```json
{
  "domain": {
    "name": "Sécurité",
    "code": "DOM-1",
    "weight": 0.3,
    "requirements_count": 35
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 35,
    "has_more": false
  },
  "requirements": [
    {
      "id": "uuid-req-001",
      "code": "REQ-001",
      "title": "SSO SAML 2.0",
      "description": "Le système doit supporter...",
      "weight": 1.0,

      "scores_summary": {
        "avg_score": 4.0,
        "min_score": 3,
        "max_score": 5,
        "responses_count": 2
      },

      "responses": [
        {
          "supplier": {
            "id": "uuid-supplier-1",
            "name": "Acme Corp"
          },
          "response_text": "Notre solution supporte SAML 2.0 et OAuth 2.0...",
          "questions": "Quel est le coût de la licence enterprise ?",
          "score": 5,
          "comment": "Validé en démo",
          "status": "pass",
          "evaluated_by": "jean.dupont@example.com",
          "evaluated_at": "2025-01-20T10:30:00Z",

          // Détails (optionnel)
          "details": {
            "ai_score": 5,
            "ai_comment": "Excellente couverture avec support multi-protocoles",
            "manual_score": 5,
            "manual_comment": "Validé en démo"
          }
        },
        {
          "supplier": {
            "id": "uuid-supplier-2",
            "name": "Beta Inc"
          },
          "response_text": "SAML 2.0 supporté via module optionnel...",
          "questions": null,
          "score": 3,
          "comment": "Support disponible mais nécessite module additionnel",
          "status": "pending",

          // Détails (optionnel)
          "details": {
            "ai_score": 3,
            "ai_comment": "Support disponible mais nécessite module additionnel",
            "manual_score": null,
            "manual_comment": null
          }
        }
      ]
    }
  ]
}
```

#### `requirements://{requirement_id}`

Détails d'une exigence spécifique avec toutes ses réponses.

**Paramètres:**

- `include_responses`: `true|false` (défaut: true)
- `include_scores_stats`: `true|false` (défaut: true)
- `supplier_ids[]`: Filtrer les réponses par fournisseur

**Réponse:**

```json
{
  "requirement": {
    "id": "uuid",
    "code": "REQ-001",
    "title": "SSO SAML 2.0",
    "description": "...",
    "context": "...",
    "weight": 1.0,
    "level": 4,
    "parent": {
      "title": "Authentification",
      "code": "CAT-1.1"
    },
    "domain": "Sécurité"
  },

  "scores_summary": {
    "responses_count": 5,
    "avg_score": 4.2,
    "median_score": 4.0,
    "min_score": 2,
    "max_score": 5
  },

  "responses": [
    {
      "id": "uuid-response-1",
      "supplier": {
        "id": "uuid-supplier-1",
        "name": "Acme Corp"
      },
      "response_text": "...",
      "questions": "Coût de la licence ?",
      "score": 5,
      "comment": "Validé en démo",
      "status": "pass",
      "evaluated_by": "jean.dupont@example.com",
      "evaluated_at": "2025-01-20T10:30:00Z",
      "rank": 1, // Rang pour cette exigence

      // Détails complets (optionnel avec ?include_details=true)
      "details": {
        "ai_score": 5,
        "ai_comment": "Excellente couverture",
        "manual_score": 5,
        "manual_comment": "Validé en démo"
      }
    },
    {
      "id": "uuid-response-2",
      "supplier": {
        "id": "uuid-supplier-2",
        "name": "Beta Inc"
      },
      "response_text": "...",
      "questions": null,
      "score": 4,
      "comment": "Bonne couverture",
      "status": "pass",
      "evaluated_by": "jean.dupont@example.com",
      "evaluated_at": "2025-01-20T10:30:00Z",
      "rank": 2,

      "details": {
        "ai_score": 4,
        "ai_comment": "Bonne couverture",
        "manual_score": 4,
        "manual_comment": "Bonne couverture"
      }
    }
  ]
}
```

---

### 1.3 Suppliers (Fournisseurs)

#### `suppliers://{rfp_id}/list`

Liste des fournisseurs avec statistiques.

**Réponse:**

```json
{
  "rfp_id": "uuid",
  "suppliers": [
    {
      "id": "uuid-1",
      "name": "Acme Corp",
      "contact_info": {
        "email": "contact@acme.com",
        "phone": "+33 1 23 45 67 89"
      },
      "statistics": {
        "total_responses": 118,
        "responses_rate": "98%",
        "avg_score": 4.2,
        "pass_rate": "85%",
        "pending_evaluations": 5
      },
      "scores_by_domain": [
        {
          "domain": "Sécurité",
          "avg_score": 4.5,
          "responses_count": 35
        },
        {
          "domain": "Infrastructure",
          "avg_score": 4.0,
          "responses_count": 40
        }
      ]
    }
  ]
}
```

#### `suppliers://{supplier_id}`

Détails complets d'un fournisseur.

**Réponse:**

```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "rfp_id": "uuid",
  "contact_info": {...},

  "overall_statistics": {
    "total_responses": 118,
    "avg_score": 4.2,
    "rank": 1,
    "strengths": [
      "Excellente couverture sécurité",
      "Support technique réactif"
    ],
    "weaknesses": [
      "Prix élevé sur infrastructure",
      "Délais de livraison longs"
    ]
  },

  "domain_performance": [
    {
      "domain": "Sécurité",
      "avg_score": 4.5,
      "responses_count": 35,
      "completion": "100%"
    }
  ]
}
```

---

### 1.4 Responses (Réponses)

#### `responses://{rfp_id}/by-domain`

Toutes les réponses organisées par domaine.

**Paramètres:**

- `supplier_ids[]`: Filtrer par fournisseur (optionnel)
- `domain_names[]`: Filtrer par domaine (optionnel)
- `include_requirements`: `true|false` (défaut: true)
- `include_details`: `true|false` (défaut: false) - Décomposition AI/Manuel
- `limit`: Nombre max de requirements par domaine (défaut: 50, max: 100)
- `offset`: Offset pour la pagination (défaut: 0)

**Réponse:**

```json
{
  "rfp_id": "uuid",
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 35,
    "has_more": false
  },
  "domains": [
    {
      "domain_name": "Sécurité",
      "domain_code": "DOM-1",
      "requirements": [
        {
          "id": "uuid-req-001",
          "code": "REQ-001",
          "title": "SSO SAML 2.0",
          "description": "...",

          "responses": [
            {
              "supplier": { "id": "uuid-1", "name": "Acme Corp" },
              "response_text": "...",
              "questions": "Pricing details?",
              "score": 5,
              "comment": "Validé en démo",
              "status": "pass",
              "evaluated_by": "jean.dupont@example.com",
              "evaluated_at": "2025-01-20T10:30:00Z"
            },
            {
              "supplier": { "id": "uuid-2", "name": "Beta Inc" },
              "response_text": "...",
              "questions": null,
              "score": 3,
              "comment": "Solution acceptable",
              "status": "pending",
              "evaluated_by": null,
              "evaluated_at": null
            }
          ]
        }
      ]
    }
  ]
}
```

#### `responses://{supplier_id}/all`

Toutes les réponses d'un fournisseur spécifique.

**Paramètres:**

- `group_by`: `domain|category|requirement` (défaut: domain)
- `include_requirements`: `true|false` (défaut: true)

**Réponse (groupé par domain):**

```json
{
  "supplier": {
    "id": "uuid",
    "name": "Acme Corp"
  },
  "rfp_id": "uuid",

  "responses_by_domain": [
    {
      "domain": "Sécurité",
      "domain_code": "DOM-1",
      "responses_count": 35,
      "avg_score": 4.5,

      "responses": [
        {
          "requirement": {
            "id": "uuid-req-001",
            "code": "REQ-001",
            "title": "SSO SAML 2.0",
            "description": "..."
          },
          "response_text": "Notre solution supporte...",
          "questions": null,
          "score": 5,
          "comment": "Excellente solution",
          "status": "pass",
          "evaluated_by": "jean.dupont@example.com",
          "evaluated_at": "2025-01-20T10:30:00Z"
        }
      ]
    }
  ]
}
```

---

## 🔧 2. Tools (Outils)

### Convention de nommage et structuration

Tous les tools MCP doivent suivre ces conventions :

```typescript
interface MCPToolDefinition {
  name: string; // snake_case, verbe + objet
  description: string; // Clair, concis, action-oriented
  inputSchema: ZodSchema; // Validation stricte via Zod

  // Handler signature
  handler: (params: ValidatedParams, context: MCPContext) => MCPToolResult;
}

interface MCPToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    data: any;
  }>;
  isError?: boolean; // Facultatif, pour les erreurs
  _meta?: {
    // Métadonnées pour debugging
    timing?: number;
    requestId?: string;
  };
}
```

### Logging et Error Handling

```typescript
// ✅ CORRECT (utilise logging structuré)
import { createLogger } from "./lib/logger";

const logger = createLogger("tools:rfp");

server.tool(
  "get_rfp_with_responses",
  /* ... */,
  async (params, context) => {
    const startTime = Date.now();
    logger.info("Executing get_rfp_with_responses", { rfpId: params.rfp_id });

    try {
      const result = await fetchRFP(params.rfp_id, context);
      const duration = Date.now() - startTime;

      logger.info("Tool completed", {
        duration,
        rfpId: params.rfp_id,
        userId: context.user?.id
      });

      return {
        content: [{ type: "text", text: formatResult(result) }],
        _meta: { timing: duration }
      };
    } catch (error) {
      logger.error("Tool failed", {
        error: error.message,
        rfpId: params.rfp_id,
        userId: context.user?.id
      });

      return {
        content: [{
          type: "text",
          text: `Erreur lors de la récupération du RFP : ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// ❌ INCORRECT (ne JAMAIS utiliser console.log)
server.tool(
  "get_rfp_with_responses",
  /* ... */,
  async (params) => {
    console.log("Fetching RFP...");  // Corrrompt JSON-RPC !
    // ...
  }
);
```

### 2.1 Consultation Avancée

#### `get_rfp_with_responses`

Récupère un RFP complet avec toutes les exigences et réponses.

**Paramètres:**

```typescript
{
  rfp_id: string;
  filters?: {
    domain_names?: string[];        // Filtrer par domaines
    supplier_ids?: string[];        // Filtrer par fournisseurs
    requirement_codes?: string[];   // Filtrer par codes exigence
    min_score?: number;             // Scores >= X
    max_score?: number;             // Scores <= X
    status?: ("pass"|"partial"|"fail"|"pending")[];
    has_manual_evaluation?: boolean;
  };
  options?: {
    include_requirements_details: boolean;  // Défaut: true
    include_responses: boolean;             // Défaut: true
    include_statistics: boolean;            // Défaut: true
    group_by?: "domain"|"supplier";        // Défaut: "domain"
  };
}
```

**Réponse:**

```json
{
  "rfp": {
    "id": "uuid",
    "title": "...",
    "statistics": {...}
  },

  "data": [
    {
      "domain": "Sécurité",
      "requirements": [
        {
          "requirement": {...},
          "responses": [...]
        }
      ]
    }
  ]
}
```

---

#### `compare_suppliers`

Compare plusieurs fournisseurs sur un domaine ou l'ensemble du RFP.

**Paramètres:**

```typescript
{
  rfp_id: string;
  supplier_ids: string[];  // 2 à 10 fournisseurs
  scope: {
    type: "full_rfp" | "domain" | "requirements";
    domain_name?: string;           // Si type = "domain"
    requirement_ids?: string[];     // Si type = "requirements"
  };
  comparison_mode?: "side_by_side" | "matrix" | "summary";
}
```

**Réponse (side_by_side):**

```json
{
  "comparison_scope": {
    "type": "domain",
    "domain": "Sécurité",
    "requirements_count": 35
  },

  "suppliers": [
    { "id": "uuid-1", "name": "Acme Corp" },
    { "id": "uuid-2", "name": "Beta Inc" }
  ],

  "requirements_comparison": [
    {
      "requirement": {
        "code": "REQ-001",
        "title": "SSO SAML 2.0"
      },
      "responses": [
        {
          "supplier_id": "uuid-1",
          "response_text": "...",
          "questions": null,
          "score": 5,
          "comment": "Validé",
          "status": "pass"
        },
        {
          "supplier_id": "uuid-2",
          "response_text": "...",
          "questions": "Coût du module ?",
          "score": 3,
          "comment": "Module additionnel requis",
          "status": "partial"
        }
      ],
      "winner": "uuid-1",
      "score_difference": 2
    }
  ],

  "summary": {
    "best_supplier": "Acme Corp",
    "avg_scores": [
      { "supplier": "Acme Corp", "avg": 4.5 },
      { "supplier": "Beta Inc", "avg": 3.8 }
    ]
  }
}
```

**Réponse (matrix):**

```json
{
  "matrix": [
    {
      "requirement": "REQ-001",
      "Acme Corp": 5,
      "Beta Inc": 3,
      "TechCo": 4
    },
    {
      "requirement": "REQ-002",
      "Acme Corp": 4,
      "Beta Inc": 5,
      "TechCo": 3
    }
  ],
  "summary": {
    "total_scores": {
      "Acme Corp": 157,
      "Beta Inc": 145,
      "TechCo": 132
    },
    "rank": ["Acme Corp", "Beta Inc", "TechCo"]
  }
}
```

---

#### `search_responses`

Recherche textuelle dans les réponses fournisseurs.

**Paramètres:**

```typescript
{
  rfp_id: string;
  query: string;
  filters?: {
    supplier_ids?: string[];
    domain_names?: string[];
    min_score?: number;
  };
  limit?: number;  // Défaut: 20
}
```

**Réponse:**

```json
{
  "query": "SSO SAML",
  "results_count": 8,
  "results": [
    {
      "requirement": {
        "code": "REQ-001",
        "title": "SSO SAML 2.0",
        "domain": "Sécurité"
      },
      "supplier": {
        "id": "uuid",
        "name": "Acme Corp"
      },
      "response_text": "Notre solution supporte SSO via SAML 2.0...",
      "questions": null,
      "score": 5,
      "comment": "Excellente couverture",
      "status": "pass",
      "match_score": 0.95,
      "highlighted_text": "...SSO via <mark>SAML</mark> 2.0..."
    }
  ]
}
```

---

#### `get_domain_analysis`

Analyse approfondie d'un domaine spécifique.

**Paramètres:**

```typescript
{
  rfp_id: string;
  domain_name: string;
  include_all_suppliers?: boolean;  // Défaut: true
}
```

**Réponse:**

```json
{
  "domain": {
    "name": "Sécurité",
    "code": "DOM-1",
    "weight": 0.3,
    "requirements_count": 35
  },

  "requirements_breakdown": [
    {
      "category": "Authentification",
      "count": 12,
      "avg_score": 4.2
    },
    {
      "category": "Chiffrement",
      "count": 8,
      "avg_score": 3.8
    }
  ],

  "suppliers_performance": [
    {
      "supplier": "Acme Corp",
      "avg_score": 4.5,
      "responses_count": 35,
      "completion": "100%",
      "strengths": ["Authentification excellente", "Conformité RGPD"],
      "weaknesses": []
    },
    {
      "supplier": "Beta Inc",
      "avg_score": 3.8,
      "responses_count": 33,
      "completion": "94%",
      "strengths": ["Chiffrement avancé"],
      "weaknesses": ["SSO limité", "2 exigences non répondues"]
    }
  ],

  "critical_gaps": [
    {
      "requirement": "REQ-015",
      "title": "Audit trail conforme SOC2",
      "suppliers_failing": ["TechCo", "Gamma Ltd"]
    }
  ]
}
```

---

#### `get_requirements_scores`

Récupère les notes de tous les fournisseurs pour une liste d'exigences.

**Paramètres:**

```typescript
{
  rfp_id: string;
  filters?: {
    domain_names?: string[];
    requirement_ids?: string[];
    supplier_ids?: string[];
  };
  include_responses?: boolean;  // Défaut: false
  include_stats?: boolean;       // Défaut: true
  include_details?: boolean;     // Défaut: false - Inclure décomposition AI/Manuel
  sort_by?: "code" | "avg_score" | "variance";  // Défaut: "code"
  limit?: number;                // Défaut: 50, Max: 100
  offset?: number;               // Défaut: 0
}
```

**Note sur `include_details`** :

- `false` (défaut) : Retourne uniquement les champs consolidés (`score`, `comment`)
- `true` : Ajoute l'objet `details` avec la décomposition complète (ai_score, manual_score, etc.)

**Réponse:**

```json
{
  "rfp_id": "uuid",
  "requirements_count": 35,

  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 35,
    "has_more": false
  },

  "requirements": [
    {
      "requirement": {
        "id": "uuid-req-001",
        "code": "REQ-001",
        "title": "SSO SAML 2.0",
        "domain": "Sécurité",
        "weight": 1.0
      },

      "scores_by_supplier": [
        {
          "supplier": {
            "id": "uuid-1",
            "name": "Acme Corp"
          },
          "score": 5,
          "comment": "Validé en démo",
          "status": "pass",
          "evaluated_by": "jean.dupont@example.com",
          "evaluated_at": "2025-01-20T10:30:00Z",

          // Détails IA/Manuel (optionnel)
          "details": {
            "ai_score": 5,
            "ai_comment": "Excellente couverture",
            "manual_score": 5,
            "manual_comment": "Validé en démo"
          }
        },
        {
          "supplier": {
            "id": "uuid-2",
            "name": "Beta Inc"
          },
          "score": 4,
          "comment": "Bonne solution avec quelques limitations",
          "status": "pass",
          "evaluated_by": null,
          "evaluated_at": null,

          "details": {
            "ai_score": 4,
            "ai_comment": "Bonne solution avec quelques limitations",
            "manual_score": null,
            "manual_comment": null
          }
        },
        {
          "supplier": {
            "id": "uuid-3",
            "name": "TechCo"
          },
          "score": 3,
          "comment": "Solution acceptable après discussion",
          "status": "partial",
          "evaluated_by": "marie.martin@example.com",
          "evaluated_at": "2025-01-21T14:00:00Z",

          "details": {
            "ai_score": 2,
            "ai_comment": "Solution limitée",
            "manual_score": 3,
            "manual_comment": "Solution acceptable après discussion"
          }
        }
      ],

      "statistics": {
        "avg_score": 4.0,
        "median_score": 4.0,
        "min_score": 3,
        "max_score": 5,
        "std_deviation": 1.0,
        "completion_rate": "100%",
        "best_supplier": "Acme Corp",
        "worst_supplier": "TechCo"
      }
    },
    {
      "requirement": {
        "id": "uuid-req-002",
        "code": "REQ-002",
        "title": "MFA obligatoire",
        "domain": "Sécurité",
        "weight": 1.0
      },

      "scores_by_supplier": [...],

      "statistics": {
        "avg_score": 4.3,
        "median_score": 4.5,
        "min_score": 3,
        "max_score": 5,
        "std_deviation": 0.8,
        "completion_rate": "100%",
        "best_supplier": "Beta Inc",
        "worst_supplier": "TechCo"
      }
    }
  ],

  "global_statistics": {
    "total_requirements": 35,
    "total_responses": 105,  // 35 req × 3 suppliers
    "avg_score_all": 4.1,
    "completion_rate": "100%",
    "requirements_with_high_variance": 3,  // Écart-type > 1.5
    "requirements_with_low_scores": 5      // Moyenne < 3.0
  }
}
```

---

#### `get_scores_matrix`

Récupère une matrice de scores pour visualisation (requirements × suppliers).

**Paramètres:**

```typescript
{
  rfp_id: string;
  domain_name?: string;      // Optionnel, sinon tous les domaines
  supplier_ids?: string[];   // Optionnel, sinon tous les fournisseurs
  limit?: number;            // Défaut: 50, Max: 100
  offset?: number;           // Défaut: 0
}
```

**Note sur la pagination** :

- Les scores sont calculés sur le score consolidé (`score` = manual_score ?? ai_score)
- Pagination appliquée sur les requirements (pas sur les suppliers)
- Total toujours calculé sur l'ensemble des données (pas juste la page)

**Réponse:**

```json
{
  "rfp_id": "uuid",
  "domain": "Sécurité",

  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 35,
    "has_more": false
  },

  "suppliers": [
    { "id": "uuid-1", "name": "Acme Corp" },
    { "id": "uuid-2", "name": "Beta Inc" },
    { "id": "uuid-3", "name": "TechCo" }
  ],

  "matrix": [
    {
      "requirement": {
        "code": "REQ-001",
        "title": "SSO SAML 2.0",
        "domain": "Sécurité"
      },
      "scores": {
        "uuid-1": 5, // Acme Corp
        "uuid-2": 4, // Beta Inc
        "uuid-3": 3 // TechCo
      },
      "avg": 4.0,
      "best": "uuid-1",
      "worst": "uuid-3"
    },
    {
      "requirement": {
        "code": "REQ-002",
        "title": "MFA obligatoire",
        "domain": "Sécurité"
      },
      "scores": {
        "uuid-1": 5,
        "uuid-2": 5,
        "uuid-3": 3
      },
      "avg": 4.3,
      "best": ["uuid-1", "uuid-2"], // Ex-aequo
      "worst": "uuid-3"
    }
  ],

  "totals": {
    "uuid-1": {
      "total": 175,
      "avg": 5.0,
      "rank": 1
    },
    "uuid-2": {
      "total": 157,
      "avg": 4.5,
      "rank": 2
    },
    "uuid-3": {
      "total": 105,
      "avg": 3.0,
      "rank": 3
    }
  }
}
```

**Réponse alternative (format tableau):**

```json
{
  "headers": ["Requirement", "Acme Corp", "Beta Inc", "TechCo", "Moyenne"],
  "rows": [
    ["REQ-001: SSO SAML 2.0", 5, 4, 3, 4.0],
    ["REQ-002: MFA obligatoire", 5, 5, 3, 4.3],
    ["REQ-003: Audit trail", 4, 4, 2, 3.3],
    ["...", "...", "...", "...", "..."]
  ],
  "footer": ["TOTAL", 175, 157, 105, 145.7],
  "rank": ["", 1, 2, 3, ""]
}
```

---

### 2.2 Export & Rapports

---

### 2.1 Modification des Réponses 🔄

#### `update_response_ai_scores`

Met à jour les scores et commentaires IA pour une réponse fournisseur. **Seul MCP peut modifier les scores IA** (les scores manuels sont mis à jour via l'UI).

**Paramètres:**

```typescript
{
  response_id: string;            // UUID de la réponse à mettre à jour
  ai_score?: number;              // 0-5 (optionnel, si omis = ne pas modifier)
  ai_comment?: string;            // Texte du commentaire IA (optionnel)
  ai_confidence?: number;         // 0.0-1.0, confiance du score IA (optionnel)
}
```

**Notes importantes** :

- ❌ **Ne peut pas modifier** : `manual_score`, `manual_comment`, `questions`, `status`
- ✅ **Peut modifier** : `ai_score`, `ai_comment`, `ai_confidence` uniquement
- La réponse consolidée (`score`, `comment`) est calculée automatiquement : `score = manual_score ?? ai_score`
- Seuls les tokens MCP avec permission `responses:write` peuvent appeler cet outil
- Utilisé par les workflows N8N pour les analyses IA automatiques

**Réponse:**

```json
{
  "success": true,
  "response_id": "uuid-response-123",
  "previous_ai_score": 3,
  "previous_ai_comment": "Support limité",
  "new_ai_score": 4,
  "new_ai_comment": "Support amélioré avec module complémentaire",
  "consolidation": {
    "manual_score": 5,
    "manual_comment": "Validé en démo",
    "ai_score": 4,
    "ai_comment": "Support amélioré avec module complémentaire",
    "final_consolidated_score": 5,
    "final_consolidated_comment": "Validé en démo"
  },
  "updated_at": "2025-01-01T10:30:00Z"
}
```

**Cas d'usage** :

1. **Corrections IA** : Corriger un score IA incorrect après révision

   ```
   update_response_ai_scores({
     response_id: "uuid-123",
     ai_score: 4,
     ai_comment: "Support SAML confirmé avec version 2.0"
   })
   ```

2. **Imports depuis N8N** : Mettre à jour les scores lors d'analyses batch
   ```
   for each response:
     update_response_ai_scores({
       response_id: response.id,
       ai_score: nlp_model.predict(response.text),
       ai_comment: nlp_model.explanation(),
       ai_confidence: nlp_model.confidence()
     })
   ```

**Permissions requises** :

- `responses:write` - Modifier les réponses

**Erreurs possibles** :

- `response_not_found` : response_id invalide
- `forbidden` : Pas la permission responses:write
- `invalid_score` : ai_score non entre 0-5
- `invalid_confidence` : ai_confidence non entre 0.0-1.0

#### `export_domain_responses`

Exporte toutes les réponses d'un domaine.

**Paramètres:**

```typescript
{
  rfp_id: string;
  domain_name: string;
  format: "json" | "csv" | "markdown";
  supplier_ids?: string[];  // Optionnel
  include_requirements?: boolean;  // Défaut: true
  include_scores?: boolean;        // Défaut: true
  include_comments?: boolean;      // Défaut: true
}
```

**Réponse (JSON):**

```json
{
  "export_metadata": {
    "rfp_id": "uuid",
    "domain": "Sécurité",
    "generated_at": "2025-12-29T10:00:00Z",
    "generated_by": "user@example.com"
  },
  "data": [
    {
      "requirement": {...},
      "responses": [...]
    }
  ]
}
```

**Réponse (Markdown):**

```markdown
# Export RFP - Domaine Sécurité

**RFP**: Plateforme CRM 2025
**Date**: 2025-12-29
**Domaine**: Sécurité (35 exigences)

---

## REQ-001: SSO SAML 2.0

**Description**: Le système doit supporter...

### Réponses Fournisseurs

#### Acme Corp (Score: 5/5)

Notre solution supporte SSO via SAML 2.0...

**Évaluation**: ✅ Pass
**Commentaire**: Validé en démo

#### Beta Inc (Score: 3/5)

SAML 2.0 supporté via module optionnel...

**Évaluation**: ⚠️ Partial
**Commentaire**: Nécessite module additionnel

---

## REQ-002: ...
```

---

#### `generate_comparison_report`

Génère un rapport de comparaison complet.

**Paramètres:**

```typescript
{
  rfp_id: string;
  supplier_ids: string[];
  scope?: "full_rfp" | "domain";
  domain_name?: string;
  format?: "markdown" | "json";
}
```

**Réponse (Markdown):**

```markdown
# Rapport de Comparaison - Plateforme CRM 2025

## Résumé Exécutif

**Fournisseurs comparés**: Acme Corp, Beta Inc, TechCo
**Scope**: Domaine Sécurité (35 exigences)
**Date**: 2025-12-29

### Classement Global

1. **Acme Corp** - 4.5/5 (35/35 réponses)
2. **Beta Inc** - 3.8/5 (33/35 réponses)
3. **TechCo** - 3.2/5 (30/35 réponses)

---

## Analyse Détaillée

### Points Forts par Fournisseur

#### Acme Corp

- ✅ Excellente couverture authentification (5/5)
- ✅ Conformité RGPD complète
- ✅ Support 24/7 inclus

#### Beta Inc

- ✅ Chiffrement avancé (AES-256 + HSM)
- ⚠️ SSO limité à SAML (pas OAuth)
- ⚠️ 2 exigences non répondues

...
```

---

## 🔐 3. Sécurité

### 3.1 Authentification PAT

Toutes les requêtes requièrent un Personal Access Token valide.

**Headers requis:**

```http
Authorization: Bearer pat_xxxxxxxxxxxxx
X-Organization-Id: uuid-organization
```

### 3.2 Permissions

Les permissions sont vérifiées par catégorie :

| Resource/Tool            | Permission Requise                        |
| ------------------------ | ----------------------------------------- |
| `rfp://...`              | `requirements:read`                       |
| `requirements://...`     | `requirements:read`                       |
| `suppliers://...`        | `suppliers:read`                          |
| `responses://...`        | `responses:read`                          |
| `get_rfp_with_responses` | `requirements:read` + `responses:read`    |
| `compare_suppliers`      | `suppliers:read` + `responses:read`       |
| `export_*`               | Permission correspondante + `export` flag |

### 3.3 Rate Limiting

- **Consultation (Resources)**: 100 requêtes/minute
- **Tools simples**: 50 requêtes/minute
- **Exports**: 10 requêtes/minute
- **Comparaisons complexes**: 20 requêtes/minute

### 3.4 Audit

Toutes les actions sont loggées dans `mcp_audit_logs` :

```sql
INSERT INTO mcp_audit_logs (
  token_id,
  organization_id,
  action_type,    -- 'resource_access', 'tool_call', 'export'
  resource_type,  -- 'rfp', 'requirement', 'response'
  resource_id,
  metadata        -- Paramètres de la requête (anonymisés)
);
```

---

## 📊 4. Formats de Données

### 4.1 Codes et Identifiants

- **Domaines**: `DOM-1`, `DOM-2`, etc.
- **Catégories**: `CAT-1.1`, `CAT-1.2`, etc.
- **Sous-catégories**: `SUB-1.1.1`, etc.
- **Exigences**: `REQ-001`, `REQ-002`, etc.

### 4.2 Scores et Commentaires (Consolidés)

**Champs consolidés (recommandés)** :

- **score**: 0-5 (entier) = `manual_score ?? ai_score`
- **comment**: string = `manual_comment ?? ai_comment`
- **evaluated_by**: user email (si manual_score existe)
- **evaluated_at**: timestamp (si manual_score existe)

**Champs détaillés (optionnels pour traçabilité)** :

- **ai_score**: 0-5 (score initial IA)
- **ai_comment**: string (commentaire IA)
- **ai_confidence**: 0.0-1.0 (confiance IA)
- **manual_score**: 0-5 ou null (score ajusté humain)
- **manual_comment**: string ou null (commentaire humain)

**Logique de consolidation** :

```typescript
{
  score: response.manual_score ?? response.ai_score,
  comment: response.manual_comment ?? response.ai_comment,
  evaluated_by: response.manual_score ? response.evaluated_by : null,
  evaluated_at: response.manual_score ? response.evaluated_at : null
}
```

### 4.3 Questions et Clarifications

**Champ `questions`** :

- **Type**: `string | null`
- **Description**: Questions ou clarifications soulevées par le fournisseur dans sa réponse
- **Exemples**:
  - "Quel est le coût de la licence enterprise ?"
  - "Clarifier le volume de données attendu"
  - "Besoin de précisions sur le SLA"
- **Usage**: Permet de capturer les points nécessitant des éclaircissements ou des informations complémentaires

### 4.4 Status

- `pending`: Non évalué
- `pass`: Conforme (score >= 4)
- `partial`: Partiellement conforme (score 2-3)
- `fail`: Non conforme (score 0-1)

---

## 🚀 5. Roadmap

### Phase 1 (MVP) ✅

- Resources de base (RFP, Requirements, Suppliers)
- Tool `get_rfp_with_responses`
- Authentification PAT

### Phase 2 (En cours) 🔄

- Resource `responses://` complète
- Tool `compare_suppliers`
- Tool `get_domain_analysis`
- Exports Markdown/JSON

### Phase 3 (Futur) 📋

- **Recherche sémantique RAG hybride** 🧠
  - Embeddings vectoriels (pgvector Supabase)
  - Recherche par similarité sémantique + keyword
  - Tool `semantic_search_requirements`
  - Coût: ~$0.003 par RFP (embedding OpenAI text-embedding-3-small)
- Exports CSV/Excel
- Analyse IA prédictive
- Webhooks pour mise à jour temps réel

---

## 📝 Notes d'Implémentation

### Priority 1: Resources Essentielles ⭐

1. `rfp://list` et `rfp://{id}`
2. `requirements://{rfp_id}/domain/{domain}` (avec et sans responses)
3. `requirements://{requirement_id}` (avec scores_summary)
4. `suppliers://{rfp_id}/list`

### Priority 2: Scores & Moyennes ⭐⭐

1. `get_requirements_scores` - Notes par fournisseur avec statistiques
2. `get_scores_matrix` - Vue matricielle des scores
3. Enrichissement de toutes les réponses avec `score` consolidé et `scores_summary`

### Priority 3: Tool Principal de Consultation

1. `get_rfp_with_responses` avec tous les filtres
2. `responses://{rfp_id}/by-domain`

### Priority 4: Comparaison & Analyse

1. `compare_suppliers` (mode side_by_side)
2. `get_domain_analysis`

### Priority 5: Export

1. Export JSON
2. Export Markdown
3. Export scores matrix (CSV-ready format)

### Priority 6: Recherche Sémantique (Phase 3) 🧠

**Objectif** : Permettre une recherche naturelle et intelligente dans les requirements via RAG hybride.

**Tool** : `semantic_search_requirements`

**Paramètres** :

```typescript
{
  query: string;                    // "sécurité des données RGPD"
  rfp_id: string;                   // Scope à un RFP spécifique
  search_mode?: "semantic" | "keyword" | "hybrid";  // Défaut: "hybrid"
  top_k?: number;                   // Nombre de résultats, défaut: 10
  filters?: {
    domain_names?: string[];        // Filtrer par domaines
    min_similarity?: number;        // 0.0-1.0, défaut: 0.7
  };
  include_responses?: boolean;      // Inclure les réponses fournisseurs, défaut: false
}
```

**Réponse** :

```json
{
  "query": "sécurité des données personnelles",
  "search_mode": "hybrid",
  "results_count": 8,
  "results": [
    {
      "requirement": {
        "id": "uuid-req-042",
        "code": "REQ-042",
        "title": "Conformité RGPD",
        "domain": "Sécurité",
        "description": "Le système doit assurer la protection des données personnelles..."
      },
      "similarity_score": 0.92, // Cosine similarity (embedding)
      "keyword_score": 0.65, // BM25 full-text score
      "combined_score": 0.84, // 0.7 × semantic + 0.3 × keyword
      "matched_terms": ["sécurité", "données", "personnelles"],
      "context_snippet": "...protection des <mark>données personnelles</mark> selon RGPD..."
    }
  ]
}
```

**Architecture technique** :

1. **Embeddings** :
   - Modèle : OpenAI `text-embedding-3-small` (1536 dimensions)
   - Stockage : Colonne `embedding vector(1536)` dans table `requirements`
   - Index : `ivfflat` (pgvector Supabase) pour recherche rapide

2. **Indexation** :
   - Lors de l'import N8N : générer embedding automatiquement
   - Trigger PostgreSQL pour re-indexer si requirement modifié
   - Cache des embeddings queries fréquentes (Redis/Upstash)

3. **Recherche hybride** :

   ```sql
   -- Combinaison semantic + keyword
   SELECT
     r.*,
     (r.embedding <=> query_embedding) AS semantic_score,
     ts_rank(r.search_vector, query_tsquery) AS keyword_score,
     (0.7 * semantic_score + 0.3 * keyword_score) AS combined_score
   FROM requirements r
   WHERE rfp_id = $1
   ORDER BY combined_score DESC
   LIMIT 10;
   ```

4. **Coûts estimés** :
   - Embedding : $0.00002 / 1K tokens (OpenAI)
   - 200 requirements × 100 mots × 1.3 = 26K tokens = **$0.0005 par RFP**
   - Stockage : pgvector inclus dans Supabase (pas de coût additionnel)

**Use cases** :

- "Quelles exigences concernent la haute disponibilité ?" → Trouve REQ-089, REQ-103, REQ-127
- "Conformité réglementaire financière" → Trouve SOC2, PCI-DSS, RGPD requirements
- "Intégration API REST" → Trouve toutes les exigences d'intégration même sans mention exacte de "REST"

**Avantages vs recherche keyword** :

- ✅ Comprend les synonymes et concepts (HA = haute disponibilité)
- ✅ Recherche multilingue possible (français ↔ anglais)
- ✅ Découvre des requirements similaires sémantiquement
- ✅ Score de pertinence plus intelligent

---

## ⚙️ Contraintes de Déploiement

### Vercel Serverless (Hobby Plan)

**Limites importantes** :

- **Timeout d'exécution** : 10 secondes maximum par requête
- **Taille de réponse** : 4.5 MB maximum
- **Mémoire** : 1024 MB par fonction

**Implications pour l'API** :

1. **Pagination obligatoire** :
   - Limite par défaut : 50 items
   - Maximum : 100 items par requête
   - Évite les timeouts sur les RFPs avec nombreuses exigences

2. **Optimisations nécessaires** :
   - Requêtes SQL optimisées avec indexes
   - Eager loading sélectif (pas de N+1 queries)
   - Mise en cache des calculs de statistiques

3. **Endpoints à risque** :
   - `get_requirements_scores` avec tous les domaines
   - `get_scores_matrix` sans filtrage
   - `compare_suppliers` avec > 5 fournisseurs

**Bonnes pratiques** :

```typescript
// ❌ Risque de timeout
GET requirements://uuid-rfp/domain/Sécurité?include_responses=true
// (35 requirements × 10 suppliers = 350 responses)

// ✅ Avec pagination
GET requirements://uuid-rfp/domain/Sécurité?include_responses=true&limit=50&offset=0
```

**Plan d'upgrade** :

Si besoin de dépasser ces limites, envisager :

- Vercel Pro : 60s timeout, 50 MB response
- Vercel Enterprise : Custom limits

---

## 🧪 Exemples d'Utilisation

### Exemple 1: Consulter un domaine complet

```typescript
// Via Resource
GET resources://requirements/uuid-rfp/domain/Sécurité?include_responses=true&supplier_ids[]=uuid-1,uuid-2

// Via Tool
CALL get_rfp_with_responses({
  rfp_id: "uuid-rfp",
  filters: {
    domain_names: ["Sécurité"],
    supplier_ids: ["uuid-1", "uuid-2"]
  },
  options: {
    include_requirements_details: true,
    include_responses: true,
    group_by: "domain"
  }
})
```

### Exemple 2: Comparer tous les fournisseurs sur un domaine

```typescript
CALL compare_suppliers({
  rfp_id: "uuid-rfp",
  supplier_ids: ["uuid-1", "uuid-2", "uuid-3"],
  scope: {
    type: "domain",
    domain_name: "Sécurité"
  },
  comparison_mode: "side_by_side"
})
```

### Exemple 3: Voir les notes de tous les fournisseurs pour un domaine

```typescript
// Option 1: Via Resource avec scores
GET requirements://uuid-rfp/domain/Sécurité?include_responses=true&supplier_ids[]=uuid-1,uuid-2,uuid-3

// Option 2: Via Tool pour scores détaillés
CALL get_requirements_scores({
  rfp_id: "uuid-rfp",
  filters: {
    domain_names: ["Sécurité"]
  },
  include_responses: false,
  include_stats: true,
  sort_by: "avg_score"
})

// Option 3: Matrice de scores
CALL get_scores_matrix({
  rfp_id: "uuid-rfp",
  domain_name: "Sécurité",
  limit: 50
})
```

### Exemple 4: Analyser les moyennes par exigence

```typescript
// Obtenir toutes les notes avec statistiques
CALL get_requirements_scores({
  rfp_id: "uuid-rfp",
  filters: {
    domain_names: ["Sécurité", "Infrastructure"]
  },
  include_stats: true,
  sort_by: "variance"  // Trier par variance pour voir les exigences controversées
})

// Résultat inclura:
// - Scores par fournisseur pour chaque exigence
// - Moyenne, médiane, min, max, écart-type
// - Identification des meilleurs/pires fournisseurs par exigence
// - Statistiques globales
```

### Exemple 5: Exporter un domaine en Markdown avec scores

```typescript
CALL export_domain_responses({
  rfp_id: "uuid-rfp",
  domain_name: "Sécurité",
  format: "markdown",
  include_requirements: true,
  include_scores: true,
  include_comments: true
})
```

---

## 📞 Support

Pour toute question sur les specs :

- Créer une issue dans le repo
- Contacter l'équipe technique

**Dernière mise à jour**: 2025-12-29
