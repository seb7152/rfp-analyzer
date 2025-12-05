import { type NextRequest } from "next/server";
import { createMcpHandler } from "mcp-handler";
import { createClient } from "@supabase/supabase-js";

// Configuration du serveur MCP
const handler = async (req: NextRequest) => {
  return createMcpHandler(
    (server) => {
      // Enregistrer les outils ici
      // server.tool("tool_name", description, schema, handler);

      // Tool de test
      server.tool(
        "test_connection",
        "Teste la connexion au serveur MCP RFP Analyzer",
        {},
        async () => {
          return {
            content: [
              {
                type: "text",
                text: "✅ Connexion réussie au serveur MCP RFP Analyzer !\n\nServeur opérationnel et prêt à recevoir des requêtes.",
              },
            ],
          };
        }
      );

      // TODO: Enregistrer les outils RFP ici
      // registerRequirementTools(server);
      // registerSupplierTools(server);
      // registerResponseTools(server);
      // registerCommentTools(server);
      // registerScoringTools(server);
      // registerVersionTools(server);
      // registerTokenTools(server);
    },

    // Configuration des capabilities
    {
      capabilities: {
        tools: {
          test_connection: {
            description: "Test de connexion au serveur",
          },
          // TODO: Déclarer tous les outils ici
        },
      },
    },

    // Options du handler
    {
      basePath: "/api/mcp",
      verboseLogs: process.env.NODE_ENV === "development",
      maxDuration: 60,
    }
  )(req);
};

export { handler as GET, handler as POST, handler as DELETE };
