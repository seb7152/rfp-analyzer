import crypto from "crypto";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PATPermissions } from "@/types/mcp";

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

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("personal_access_tokens").insert({
      user_id: userId,
      organization_id: organizationId,
      name,
      token_hash: tokenHash,
      permissions,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw new Error(`Failed to create PAT: ${error.message}`);

    return token;
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
    const supabase = getSupabaseClient();

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
    const supabase = getSupabaseClient();
    await supabase
      .from("personal_access_tokens")
      .update({ is_active: false })
      .eq("id", tokenId);
  }

  // Lister les tokens d'un utilisateur
  static async listUserTokens(userId: string): Promise<any[]> {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("personal_access_tokens")
      .select(
        `
        id,
        name,
        permissions,
        expires_at,
        last_used_at,
        created_at,
        is_active
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return data || [];
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
