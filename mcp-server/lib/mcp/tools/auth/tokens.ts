import { z } from "zod";
import type { McpServer } from "mcp-handler";
import { SecurityMiddleware } from "@/lib/mcp/auth/middleware";
import { TokenManager } from "@/lib/mcp/auth/tokens";
import type { MCPContext } from "@/types/mcp";

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
