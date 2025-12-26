/**
 * AI Feature Permissions
 *
 * AI features are only available to RFP owners
 * Evaluators and viewers cannot access AI functionality
 */

import type { RFPAccessLevel } from "@/types/user";

export function canUseAIFeatures(accessLevel: RFPAccessLevel | null | undefined): boolean {
  return accessLevel === "owner";
}

export function requiresAIPermission(): string {
  return "Only RFP owners can use AI features. Please contact the RFP owner for access.";
}
