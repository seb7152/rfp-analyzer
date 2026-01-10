# Plan MCP RFP Analyzer - Spécifications Collaboratives

## 🎯 Objectif

Créer un serveur MCP spécialisé pour la gestion collaborative des RFP, en exposant les fonctionnalités CRUD et de notation via une interface conversationnelle.

---

## 📋 Outils MCP Prioritaires

### 1. Requirements Management (CRUD)

```typescript
// Outils principaux
create_requirement(rfpId, title, description, categoryId, weight, mandatory);
update_requirement(requirementId, updates);
delete_requirement(requirementId);
list_requirements(rfpId, filters);
get_requirement_details(requirementId);

// Gestion des poids
update_requirement_weight(requirementId, weight);
update_category_weight(categoryId, weight);
recalculate_weights(rfpId);
get_weight_summary(rfpId);

// Flags et statuts
set_requirement_flag(requirementId, flagType, value);
bulk_update_flags(requirementIds, flagUpdates);
```

### 2. Suppliers Management (CRUD)

```typescript
// Outils principaux
add_supplier(rfpId, name, contactInfo, description);
update_supplier(supplierId, updates);
remove_supplier(supplierId);
list_suppliers(rfpId);
get_supplier_details(supplierId);

// Import/Export
import_suppliers(rfpId, suppliersData);
export_supplier_data(supplierId, format);
```

### 3. Supplier Responses (CRUD)

```typescript
// Gestion des réponses
create_response(supplierId, requirementId, content, score);
update_response(responseId, updates);
delete_response(responseId);
get_supplier_responses(supplierId, rfpId);
bulk_update_responses(responsesData);

// Validation et completion
validate_response(responseId, validationNotes);
mark_response_complete(responseId);
get_completion_status(rfpId);
```

### 4. Notes & Comments System

```typescript
// Commentaires sur requirements
add_requirement_comment(requirementId, content, userId, type);
update_comment(commentId, content);
delete_comment(commentId);
get_requirement_comments(requirementId);

// Notes générales sur RFP
add_rfp_note(rfpId, title, content, type, visibility);
update_rfp_note(noteId, updates);
delete_rfp_note(noteId);
get_rfp_notes(rfpId, filters);

// Annotations sur réponses
add_response_annotation(responseId, content, position);
get_response_annotations(responseId);
```

### 5. Scoring & Evaluation

```typescript
// Notation individuelle
score_requirement(requirementId, supplierId, score, justification, userId);
update_score(scoreId, score, justification);
delete_score(scoreId);
get_requirement_scores(requirementId);

// Calculs et synthèses
calculate_supplier_scores(rfpId, supplierId);
get_scores_summary(rfpId);
compare_suppliers_scores(rfpId, supplierIds);
generate_scoring_report(rfpId, format);

// Notation en groupe
bulk_score_requirements(requirementIds, supplierId, scores);
get_scoring_progress(rfpId);
```

### 6. Version Management

```typescript
// Gestion des versions
create_version(rfpId, name, description, copyFromVersion);
switch_active_version(rfpId, versionId);
compare_versions(versionId1, versionId2);
get_version_diff(versionId, field);

// Historique et tracking
get_version_history(rfpId);
get_version_changes(versionId);
revert_to_version(rfpId, versionId);
merge_version_changes(fromVersionId, toVersionId);
```

---

## 🏗️ Architecture Technique

### Structure des Fichiers

```
mcp-rfp-server/
├── app/
│   └── api/
│       └── mcp/
│           └── [transport]/
│               └── route.ts              # Serveur MCP principal
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Client Supabase avec auth
│   │   ├── types.ts                 # Types générés
│   │   └── permissions.ts           # Vérifications RLS
│   ├── mcp/
│   │   ├── tools/                  # Outils MCP organisés
│   │   │   ├── requirements/
│   │   │   │   ├── crud.ts         # CRUD requirements
│   │   │   │   ├── weights.ts       # Gestion poids
│   │   │   │   └── flags.ts        # Flags et statuts
│   │   │   ├── suppliers/
│   │   │   │   ├── crud.ts         # CRUD fournisseurs
│   │   │   │   └── import.ts       # Import/Export
│   │   │   ├── responses/
│   │   │   │   ├── crud.ts         # CRUD réponses
│   │   │   │   └── validation.ts    # Validation completion
│   │   │   ├── comments/
│   │   │   │   ├── requirements.ts # Commentaires requirements
│   │   │   │   ├── responses.ts    # Annotations réponses
│   │   │   │   └── notes.ts        # Notes RFP
│   │   │   ├── scoring/
│   │   │   │   ├── individual.ts   # Notation individuelle
│   │   │   │   ├── bulk.ts         # Notation en groupe
│   │   │   │   └── reports.ts      # Rapports de scoring
│   │   │   └── versions/
│   │   │       ├── crud.ts         # CRUD versions
│   │   │       ├── compare.ts       # Comparaison
│   │   │       └── history.ts       # Historique
│   │   ├── schemas.ts             # Schémas Zod partagés
│   │   ├── utils.ts               # Utilitaires MCP
│   │   └── formatters.ts          # Formatage réponses
│   └── utils/
│       ├── errors.ts               # Gestion d'erreurs
│       ├── validation.ts           # Validation données
│       └── audit.ts               # Logging actions
├── types/
│   └── mcp.ts                    # Types TypeScript MCP
├── .env.local
├── .env.example
├── vercel.json
├── package.json
├── tsconfig.json
└── README.md
```

### Configuration Vercel

```json
{
  "functions": {
    "app/api/mcp/[transport]/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
      "MCP_API_SECRET": "@mcp-secret"
    }
  }
}
```

---

## 🔐 Sécurité & Permissions - Personal Access Tokens (PAT)

### Architecture des Tokens

```sql
-- Table pour les Personal Access Tokens
CREATE TABLE personal_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- Index pour performance
CREATE INDEX idx_pat_user_org ON personal_access_tokens(user_id, organization_id);
CREATE INDEX idx_pat_token_hash ON personal_access_tokens(token_hash);
CREATE INDEX idx_pat_expires_at ON personal_access_tokens(expires_at);
```

### Types de Permissions par Token

```typescript
export interface PATPermissions {
  // Permissions granulaires par catégorie
  requirements?: ("read" | "create" | "update" | "delete")[];
  suppliers?: ("read" | "create" | "update" | "delete")[];
  responses?: ("read" | "create" | "update" | "delete")[];
  comments?: ("read" | "create" | "update" | "delete")[];
  scoring?: ("read" | "create" | "update" | "delete")[];
  versions?: ("read" | "create" | "update" | "delete")[];

  // Restrictions spécifiques
  organization_ids?: string[]; // Limité à certaines organisations
  rfp_ids?: string[]; // Limité à certains RFPs
  ip_whitelist?: string[]; // IPs autorisées
  rate_limit?: {
    // Limites personnalisées
    requests_per_minute: number;
    requests_per_hour: number;
  };
}
```

### Gestion des Tokens

```typescript
// lib/mcp/auth/tokens.ts
import crypto from "crypto";

export class TokenManager {
  // Créer un nouveau PAT
  static async createPAT(
    userId: string,
    organizationId: string,
    name: string,
    permissions: PATPermissions,
    expiresInDays: number = 90
  ): Promise<string> {
    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { error } = await supabase.from("personal_access_tokens").insert({
      user_id: userId,
      organization_id: organizationId,
      name,
      token_hash: tokenHash,
      permissions,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw new Error(`Failed to create PAT: ${error.message}`);

    return token; // Retourner le token clair une seule fois
  }

  // Valider un token
  static async validatePAT(
    token: string,
    requiredPermission: string,
    context?: { rfpId?: string; organizationId?: string }
  ): Promise<{
    valid: boolean;
    userId?: string;
    permissions?: PATPermissions;
  }> {
    const tokenHash = this.hashToken(token);

    const { data: pat, error } = await supabase
      .from("personal_access_tokens")
      .select(
        `
        user_id,
        organization_id,
        permissions,
        expires_at,
        is_active,
        last_used_at
      `
      )
      .eq("token_hash", tokenHash)
      .single();

    if (error || !pat) {
      return { valid: false };
    }

    // Vérifier expiration
    if (new Date(pat.expires_at) < new Date()) {
      await this.revokePAT(pat.id);
      return { valid: false };
    }

    // Vérifier si actif
    if (!pat.is_active) {
      return { valid: false };
    }

    // Vérifier permissions requises
    if (!this.hasPermission(pat.permissions, requiredPermission)) {
      return { valid: false };
    }

    // Vérifier restrictions organisation/RFP
    if (context?.organizationId && pat.permissions.organization_ids) {
      if (!pat.permissions.organization_ids.includes(context.organizationId)) {
        return { valid: false };
      }
    }

    // Mettre à jour last_used_at
    await supabase
      .from("personal_access_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", pat.id);

    return {
      valid: true,
      userId: pat.user_id,
      permissions: pat.permissions,
    };
  }

  // Révoquer un token
  static async revokePAT(tokenId: string): Promise<void> {
    await supabase
      .from("personal_access_tokens")
      .update({ is_active: false })
      .eq("id", tokenId);
  }

  // Utilitaires
  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private static hasPermission(
    permissions: PATPermissions,
    requiredPermission: string
  ): boolean {
    const [category, action] = requiredPermission.split("_");
    const categoryPerms = permissions[category as keyof PATPermissions];

    return (
      Array.isArray(categoryPerms) && categoryPerms.includes(action as any)
    );
  }
}
```

### Middleware de Sécurité Avancé

```typescript
// lib/mcp/auth/middleware.ts
export class SecurityMiddleware {
  // Validation complète d'une requête MCP
  static async validateRequest(
    req: NextRequest,
    requiredPermission: string,
    context?: { rfpId?: string }
  ): Promise<{
    valid: boolean;
    userId?: string;
    organizationId?: string;
    error?: string;
  }> {
    // 1. Extraire le token
    const authHeader = req.headers.get("authorization");
    const patHeader = req.headers.get("x-pat-token");

    if (!authHeader && !patHeader) {
      return { valid: false, error: "Missing authentication token" };
    }

    const token = authHeader?.replace("Bearer ", "") || patHeader;

    // 2. Valider le PAT
    const tokenValidation = await TokenManager.validatePAT(
      token,
      requiredPermission,
      context
    );

    if (!tokenValidation.valid) {
      return { valid: false, error: "Invalid or expired token" };
    }

    // 3. Vérifier l'organisation
    const orgId = req.headers.get("x-organization-id");
    if (!orgId) {
      return { valid: false, error: "Missing organization ID" };
    }

    // 4. Vérifier l'appartenance à l'organisation
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("role, organization_id")
      .eq("user_id", tokenValidation.userId!)
      .eq("organization_id", orgId)
      .single();

    if (!userOrg) {
      return { valid: false, error: "User not member of organization" };
    }

    return {
      valid: true,
      userId: tokenValidation.userId,
      organizationId: orgId,
    };
  }
}
```

### Outils de Gestion des PAT

```typescript
// lib/mcp/tools/auth/tokens.ts
export const registerTokenTools = (server: McpServer) => {
  // Créer un PAT
  server.tool(
    "create_personal_access_token",
    `Crée un nouveau Personal Access Token (PAT) pour l'utilisateur courant.
    
    **Cas d'usage :**
    - "Crée un token pour Claude Desktop avec permissions lecture seule"
    - "Génère un token d'évaluateur pour 30 jours"
    - "Crée un token admin pour l'organisation Acme"
    
    **Permissions disponibles :**
    - requirements: read, create, update, delete
    - suppliers: read, create, update, delete  
    - responses: read, create, update, delete
    - comments: read, create, update, delete
    - scoring: read, create, update, delete
    - versions: read, create, update, delete
    
    **Retourne :**
    - Token secret (à conserver précieusement)
    - ID du token pour référence future
    - Date d'expiration
    
    **⚠️ Important :**
    - Le token n'est affiché qu'une seule fois
    - Conservez-le dans un gestionnaire de mots de passe
    - Révoquez-le immédiatement s'il est compromis`,

    {
      name: z
        .string()
        .describe(
          "Nom descriptif du token (ex: 'Claude Desktop - Lecture seule')"
        ),
      permissions: z
        .object({
          requirements: z
            .array(z.enum(["read", "create", "update", "delete"]))
            .optional(),
          suppliers: z
            .array(z.enum(["read", "create", "update", "delete"]))
            .optional(),
          responses: z
            .array(z.enum(["read", "create", "update", "delete"]))
            .optional(),
          comments: z
            .array(z.enum(["read", "create", "update", "delete"]))
            .optional(),
          scoring: z
            .array(z.enum(["read", "create", "update", "delete"]))
            .optional(),
          versions: z
            .array(z.enum(["read", "create", "update", "delete"]))
            .optional(),
          organization_ids: z.array(z.string()).optional(),
          rfp_ids: z.array(z.string()).optional(),
        })
        .describe("Permissions accordées au token"),
      expires_in_days: z
        .number()
        .int()
        .min(1)
        .max(365)
        .default(90)
        .describe("Durée de validité en jours (max 365)"),
      organization_id: z.string().describe("ID de l'organisation cible"),
    },

    async (
      { name, permissions, expires_in_days, organization_id },
      { context }
    ) => {
      try {
        const userId = context?.user?.id;
        if (!userId) {
          return {
            content: [{ type: "text", text: "❌ Utilisateur non authentifié" }],
            isError: true,
          };
        }

        const token = await TokenManager.createPAT(
          userId,
          organization_id,
          name,
          permissions,
          expires_in_days
        );

        return {
          content: [
            {
              type: "text",
              text: `
🔑 **Nouveau Personal Access Token créé**

**Nom :** ${name}
**Token :** \`${token}\`
**Organisation :** ${organization_id}
**Expire le :** ${new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toLocaleDateString()}

⚠️ **IMPORTANT :**
- Ce token ne sera plus jamais affiché
- Conservez-le immédiatement dans un gestionnaire sécurisé
- Révoquez-le depuis l'interface si compromis

🔧 **Utilisation :**
Configurez ce token dans votre client MCP :
\`\`\`json
{
  "mcpServers": {
    "rfp-analyzer": {
      "url": "https://votre-app.vercel.app/api/mcp",
      "headers": {
        "x-pat-token": "${token}",
        "x-organization-id": "${organization_id}"
      }
    }
  }
}
\`\`\`
            `,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Erreur création token : ${error instanceof Error ? error.message : "Erreur inconnue"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Lister les tokens
  server.tool(
    "list_my_tokens",
    `Liste tous vos Personal Access Tokens actifs.
    
    **Cas d'usage :**
    - "Montre-moi tous mes tokens actifs"
    - "Quels tokens vont expirer bientôt ?"
    - "Liste mes tokens avec permissions admin"
    
    **Retourne :**
    - Nom et permissions de chaque token
    - Date de création et dernière utilisation
    - Date d'expiration
    - Statut (actif/inactif)
    
    **Sécurité :**
    - Seul le propriétaire peut voir ses tokens
    - Les tokens révoqués n'apparaissent pas`,

    {
      organization_id: z.string().describe("ID de l'organisation"),
    },

    async ({ organization_id }, { context }) => {
      try {
        const userId = context?.user?.id;
        if (!userId) {
          return {
            content: [{ type: "text", text: "❌ Utilisateur non authentifié" }],
            isError: true,
          };
        }

        const tokens = await TokenManager.listUserTokens(userId);

        if (!tokens || tokens.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "📝 Aucun token trouvé. Créez-en un avec 'create_personal_access_token'.",
              },
            ],
          };
        }

        const tokenList = tokens
          .map((token, i) => {
            const isActive =
              token.is_active && new Date(token.expires_at) > new Date();
            const daysUntilExpiry = Math.ceil(
              (new Date(token.expires_at).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );

            return `
${i + 1}. **${token.name}** ${isActive ? "🟢" : "🔴"}
   - **ID :** \`${token.id}\`
   - **Permissions :** ${JSON.stringify(token.permissions, null, 2)}
   - **Créé le :** ${new Date(token.created_at).toLocaleDateString()}
   - **Dernière utilisation :** ${token.last_used_at ? new Date(token.last_used_at).toLocaleDateString() : "Jamais"}
   - **Expire :** ${new Date(token.expires_at).toLocaleDateString()} (${daysUntilExpiry} jours)
   - **Statut :** ${isActive ? "Actif" : "Inactif"}
          `.trim();
          })
          .join("\n---\n");

        return {
          content: [
            {
              type: "text",
              text: `🔑 **Vos Personal Access Tokens**

${tokenList}

💡 **Actions disponibles :**
- Révoquer un token : \`revoke_token(token_id)\`
- Créer un nouveau token : \`create_personal_access_token(...)\`
- Mettre à jour un token : \`update_token_permissions(token_id, ...)\`
            `,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Erreur récupération tokens : ${error instanceof Error ? error.message : "Erreur inconnue"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Révoquer un token
  server.tool(
    "revoke_token",
    `Révoque un Personal Access Token.
    
    **Cas d'usage :**
    - "Révoque le token utilisé sur mon ancien appareil"
    - "Supprime le token qui expire demain"
    - "Désactive le token avec permissions admin"
    
    **Sécurité :**
    - Action immédiate et irréversible
    - Le token cesse immédiatement de fonctionner
    - Conservez l'ID pour référence
    
    **Confirmation :**
    - L'action demande confirmation pour éviter les erreurs`,

    {
      token_id: z.string().describe("ID du token à révoquer"),
      confirm: z
        .boolean()
        .describe("Confirmer la révocation (true pour confirmer)"),
    },

    async ({ token_id, confirm }, { context }) => {
      try {
        if (!confirm) {
          return {
            content: [
              {
                type: "text",
                text: "⚠️ Veuillez confirmer la révocation avec confirm: true",
              },
            ],
          };
        }

        const userId = context?.user?.id;
        if (!userId) {
          return {
            content: [{ type: "text", text: "❌ Utilisateur non authentifié" }],
            isError: true,
          };
        }

        await TokenManager.revokePAT(token_id);

        return {
          content: [
            {
              type: "text",
              text: `🗑️ **Token révoqué avec succès**

**ID du token :** \`${token_id}\`
**Révoqué par :** ${userId}
**Date :** ${new Date().toLocaleDateString()}

✅ Le token cesse immédiatement de fonctionner.
Si vous pensez que ce token a été compromis, vérifiez également l'activité récente de votre compte.
            `,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Erreur révocation token : ${error instanceof Error ? error.message : "Erreur inconnue"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
};
```

### Configuration Client MCP avec PAT

```json
// Claude Desktop configuration
{
  "mcpServers": {
    "rfp-analyzer": {
      "url": "https://rfp-mcp-server.vercel.app/api/mcp",
      "headers": {
        "x-pat-token": "pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "x-organization-id": "org_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
      }
    }
  }
}

// Configuration alternative avec Bearer
{
  "mcpServers": {
    "rfp-analyzer": {
      "url": "https://rfp-mcp-server.vercel.app/api/mcp",
      "headers": {
        "authorization": "Bearer pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "x-organization-id": "org_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
      }
    }
  }
}
```

### Avantages du Système PAT

#### 🔐 Sécurité Renforcée

- **Tokens uniques** : Chaque token est cryptographiquement unique
- **Permissions granulaires** : Contrôle fin par catégorie et par action
- **Expiration automatique** : Pas de tokens valides indéfiniment
- **Révocation instantanée** : Désactivation immédiate en cas de compromission

#### 🎯 Flexibilité

- **Multi-appareils** : Un token par client/appareil
- **Permissions ciblées** : Tokens lecture seule pour Claude Desktop
- **Restrictions spécifiques** : Limitation par organisation ou RFP
- **Rate limiting** : Limites personnalisées par token

#### 📊 Traçabilité

- **Audit complet** : Toutes les actions sont loguées par token
- **Last used tracking** : Dernière utilisation connue
- **Usage analytics** : Métriques d'utilisation par token

---

### Rôle-based Access Control

```typescript
const PERMISSIONS = {
  admin: [
    "create_requirement",
    "update_requirement",
    "delete_requirement",
    "add_supplier",
    "update_supplier",
    "remove_supplier",
    "create_response",
    "update_response",
    "delete_response",
    "score_requirement",
    "update_score",
    "delete_score",
    "add_comment",
    "update_comment",
    "delete_comment",
    "add_rfp_note",
    "update_rfp_note",
    "delete_rfp_note",
    "create_version",
    "switch_active_version",
    "merge_version_changes",
    "update_weights",
    "recalculate_weights",
  ],
  evaluator: [
    "update_requirement",
    "score_requirement",
    "update_score",
    "create_response",
    "update_response",
    "add_comment",
    "update_comment",
    "add_response_annotation",
    "bulk_score_requirements",
  ],
  viewer: [
    "list_requirements",
    "get_requirement_details",
    "list_suppliers",
    "get_supplier_details",
    "get_supplier_responses",
    "get_requirement_scores",
    "get_scores_summary",
    "get_requirement_comments",
    "get_rfp_notes",
    "get_response_annotations",
  ],
};
```

### Validation Systématique

```typescript
// Middleware de permissions
export async function checkPermission(
  userId: string,
  organizationId: string,
  action: string
): Promise<boolean> {
  const { data: userOrg } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .single();

  return PERMISSIONS[userOrg?.role]?.includes(action) || false;
}

// Isolation organisation
export async function checkOrganizationAccess(
  userId: string,
  rfpId: string
): Promise<boolean> {
  const { data: rfp } = await supabase
    .from("rfps")
    .select("organization_id")
    .eq("id", rfpId)
    .single();

  const { data: userOrg } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", rfp.organization_id)
    .single();

  return !!userOrg;
}
```

---

## 📝 Cas d'Usage Concrets

### Scénario 1 : Session d'Évaluation Collaborative

```
User: "Ajoute un nouveau critère 'Coût maintenance annuelle' au RFP-123,
poids 20%, catégorie 'Coûts', obligatoire"

Claude: [create_requirement] → Crée le requirement
User: "Note TechCorp à 4/5 sur ce critère avec commentaire 'tarif compétitif mais support cher'"

Claude: [score_requirement + add_requirement_comment] → Ajoute score + commentaire
User: "Fais de même pour InnovationCorp mais avec 3/5 et 'tarif élevé'"

Claude: [score_requirement + add_requirement_comment] → Ajoute score + commentaire
User: "Montre-moi le résumé des scores pour tous les fournisseurs sur ce critère"

Claude: [get_requirement_scores] → Affiche tableau comparatif
```

### Scénario 2 : Gestion des Versions

```
User: "Crée une nouvelle version 'V2 - Révisions client' du RFP-456
en copiant la version actuelle"

Claude: [create_version] → Clone vers nouvelle version
User: "Met à jour le poids de la catégorie 'Sécurité' à 25% dans la V2"

Claude: [update_category_weight + recalculate_weights] → Met à jour les poids
User: "Compare les scores entre V1 et V2 pour le fournisseur DataCorp"

Claude: [compare_versions + get_scores_summary] → Affiche différences
User: "Bascule sur la V2 comme version active"

Claude: [switch_active_version] → Change version active
```

### Scénario 3 : Bulk Operations

```
User: "Importe ces 3 fournisseurs pour le RFP-789:
TechCorp (tech@techcorp.com), DataCorp (contact@datacorp.com), CloudInc (sales@cloudinc.com)"

Claude: [import_suppliers] → Importe les fournisseurs
User: "Met à jour toutes les réponses de TechCorp comme complètes"

Claude: [bulk_update_responses] → Marque comme complètes
User: "Génère un rapport Excel des scores finaux pour tous les fournisseurs"

Claude: [generate_scoring_report] → Crée et retourne le fichier Excel
```

---

## 🔄 Workflow MCP

### 1. Initialisation et Auth

```typescript
// Connexion au serveur MCP
const mcpConnection = await connectToMCP({
  url: "https://rfp-mcp.vercel.app/api/mcp",
  headers: {
    Authorization: "Bearer " + userToken,
    "x-organization-id": organizationId,
  },
});

// Découverte des outils disponibles
const tools = await mcpConnection.listTools();
// → Retourne la liste des 25+ outils avec descriptions
```

### 2. Opérations CRUD en Chaîne

```typescript
// Créer requirement + poids + commentaire
const requirement = await mcpConnection.call("create_requirement", {
  rfpId: "rfp-123",
  title: "Performance database",
  description: "Temps de réponse < 100ms sous charge",
  categoryId: "cat-perf",
  weight: 0.15,
  mandatory: true,
});

await mcpConnection.call("add_requirement_comment", {
  requirementId: requirement.id,
  content: "Critère basé sur les specs techniques du client",
  type: "clarification",
});
```

### 3. Validation et Error Handling

```typescript
try {
  const result = await mcpConnection.call("score_requirement", {
    requirementId: "req-456",
    supplierId: "sup-789",
    score: 4.5,
    justification: "Tests satisfaisants mais documentation incomplète",
  });

  console.log("Score ajouté avec succès");
} catch (error) {
  if (error.code === "PERMISSION_DENIED") {
    console.log("Vous n'avez pas les droits pour noter ce requirement");
  } else if (error.code === "VALIDATION_ERROR") {
    console.log("Score invalide : doit être entre 1 et 5");
  }
}
```

---

## 📊 Monitoring & Audit

### Traçabilité Complète

```typescript
// Log structuré pour chaque action
export function logMCPAction(
  action: string,
  params: any,
  userId: string,
  result: any
) {
  await supabase.from("mcp_audit_logs").insert({
    action,
    params: sanitizeParams(params),
    user_id: userId,
    organization_id: params.organizationId,
    result: result.success ? "success" : "error",
    execution_time_ms: result.duration,
    timestamp: new Date().toISOString(),
  });
}

// Analytics d'utilisation
export async function getUsageAnalytics(
  organizationId: string,
  period: string
) {
  return await supabase
    .from("mcp_audit_logs")
    .select("action, COUNT(*) as count, AVG(execution_time_ms) as avg_time")
    .eq("organization_id", organizationId)
    .gte("timestamp", getDateFromPeriod(period))
    .group("action");
}
```

### Métriques Clés

- **Utilisation par outil** : Quels outils sont les plus utilisés
- **Temps d'exécution** : Performance par type d'opération
- **Taux d'erreur** : Erreurs par utilisateur/outil
- **Collaboration** : Qui contribue le plus
- **Adoption** : Fréquence d'utilisation par organisation

---

## 🚀 Déploiement & Configuration

### 1. Setup Projet

```bash
# Initialisation
npx create-next-app@latest rfp-mcp-server --typescript --app --tailwind
cd rfp-mcp-server

# Dépendances MCP
npm install mcp-handler @modelcontextprotocol/sdk zod @supabase/supabase-js

# Développement
npm install -D @types/node
```

### 2. Configuration Environment

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
MCP_API_SECRET=secret_key_here

# .env.example (à commiter)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
MCP_API_SECRET=your_mcp_api_secret
```

### 3. Déploiement Vercel

```bash
# Git setup
git init
git add .
git commit -m "Initial MCP server for RFP Analyzer"
git remote add origin https://github.com/username/rfp-mcp-server.git
git push -u origin main

# Déploiement
npm i -g vercel
vercel login
vercel --prod
```

### 4. Configuration Client

```json
// Claude Desktop config
{
  "mcpServers": {
    "rfp-analyzer": {
      "url": "https://rfp-mcp-server.vercel.app/api/mcp",
      "headers": {
        "authorization": "Bearer YOUR_JWT_TOKEN",
        "x-organization-id": "YOUR_ORG_ID"
      }
    }
  }
}
```

---

## 🧪 Tests & Validation

### Tests Unitaires par Outil

```typescript
// tests/tools/requirements.test.ts
describe("Requirements Tools", () => {
  test("create_requirement", async () => {
    const result = await mcpConnection.call("create_requirement", {
      rfpId: "test-rfp",
      title: "Test Requirement",
      description: "Test Description",
      weight: 0.1,
    });

    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
  });
});
```

### Tests d'Intégration

```typescript
// tests/integration/collaborative-workflow.test.ts
describe("Collaborative Workflow", () => {
  test("complete evaluation cycle", async () => {
    // 1. Créer requirement
    const req = await createRequirement();

    // 2. Ajouter fournisseurs
    const suppliers = await addSuppliers();

    // 3. Noter par plusieurs utilisateurs
    const scores = await scoreByMultipleUsers();

    // 4. Générer rapport
    const report = await generateReport();

    expect(report.summary.totalRequirements).toBe(1);
    expect(report.summary.totalSuppliers).toBe(2);
  });
});
```

### Tests de Sécurité

```typescript
// tests/security/permissions.test.ts
describe("Security Tests", () => {
  test("viewer cannot delete requirements", async () => {
    const viewerToken = await getViewerToken();

    const result = await mcpConnection.call(
      "delete_requirement",
      {
        requirementId: "test-req",
      },
      { headers: { authorization: `Bearer ${viewerToken}` } }
    );

    expect(result.error).toContain("PERMISSION_DENIED");
  });
});
```

---

## 💡 Optimisations & Performance

### Caching Intelligent

```typescript
// Cache des poids calculés
const getWeightsCache = unstable_cache(
  async (rfpId: string) => {
    return await calculateWeights(rfpId);
  },
  ["weights", rfpId],
  { revalidate: 3600 } // 1 heure
);

// Cache des scores summaries
const getScoresCache = unstable_cache(
  async (rfpId: string) => {
    return await generateScoresSummary(rfpId);
  },
  ["scores", rfpId],
  { revalidate: 1800 } // 30 minutes
);
```

### Pagination Optimisée

```typescript
// Pagination pour gros datasets
async function getPaginatedRequirements(
  rfpId: string,
  page: number = 1,
  pageSize: number = 50
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("requirements")
    .select("*", { count: "exact" })
    .eq("rfp_id", rfpId)
    .range(from, to)
    .order("created_at", { ascending: false });

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      hasMore: to < (count || 0),
    },
  };
}
```

---

## 📈 Roadmap d'Implémentation

### Phase 1 : Core CRUD (Semaine 1)

- [ ] Setup projet Next.js + MCP
- [ ] Configuration Supabase + auth
- [ ] Outils Requirements CRUD
- [ ] Outils Suppliers CRUD
- [ ] Tests basiques
- [ ] Déploiement Vercel

### Phase 2 : Collaboration (Semaine 2)

- [ ] Outils Responses CRUD
- [ ] Système de commentaires
- [ ] Outils de scoring
- [ ] Validation permissions
- [ ] Tests d'intégration

### Phase 3 : Versions & Analytics (Semaine 3)

- [ ] Gestion des versions
- [ ] Comparaison de versions
- [ ] Rapports et analytics
- [ ] Bulk operations
- [ ] Performance optimization

### Phase 4 : Production Ready (Semaine 4)

- [ ] Monitoring complet
- [ ] Error handling avancé
- [ ] Documentation utilisateur
- [ ] Tests de charge
- [ ] Production deployment

---

Ce plan crée un MCP server puissant pour la gestion collaborative des RFP, parfaitement intégré avec votre architecture existante et optimisé pour une utilisation conversationnelle via Claude.
