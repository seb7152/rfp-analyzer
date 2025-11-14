/**
 * RFP and Organization type definitions
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown> | null;
  subscription_tier: "free" | "pro" | "enterprise";
  max_users: number;
  max_rfps: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationWithRole extends Organization {
  role: "admin" | "evaluator" | "viewer";
}

export interface RFP {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: "in_progress" | "completed" | "archived";
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface RFPWithDetails extends RFP {
  created_by_user?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export type RFPStatus = "in_progress" | "completed" | "archived";
