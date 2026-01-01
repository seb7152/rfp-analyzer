import { type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TokenManager } from "@/lib/mcp/auth/tokens";
import type { MCPContext } from "@/types/mcp";

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
    const supabase = createServiceClient();
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

  // Créer le contexte pour les outils
  static createContext(req: NextRequest, validation: any): MCPContext {
    return {
      user: validation.userId
        ? {
            id: validation.userId,
            email: "", // TODO: Récupérer depuis users table
            role: "", // TODO: Récupérer depuis user_organizations
          }
        : undefined,
      organizationId: validation.organizationId,
      authorization:
        req.headers.get("authorization") || req.headers.get("x-pat-token"),
    };
  }
}
