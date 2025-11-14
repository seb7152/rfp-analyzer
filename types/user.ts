/**
 * User, authentication, and role type definitions
 */

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends User {
  role: UserRole;
  joined_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown> | null;
  subscription_tier: SubscriptionTier;
  max_users: number;
  max_rfps: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationWithRole extends Organization {
  role: UserRole;
}

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  joined_at: string;
  invited_by: string | null;
}

export interface RFPUserAssignment {
  id: string;
  rfp_id: string;
  user_id: string;
  access_level: RFPAccessLevel;
  assigned_at: string;
  assigned_by: string | null;
}

export interface Session {
  user: User;
  organizations: OrganizationWithRole[];
  current_organization: Organization;
}

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  language?: string;
  notifications_enabled?: boolean;
  sidebar_collapsed?: boolean;
}

export interface InvitationToken {
  id: string;
  email: string;
  organization_id: string;
  role: UserRole;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export type UserRole = "admin" | "evaluator" | "viewer";
export type RFPAccessLevel = "owner" | "evaluator" | "viewer";
export type SubscriptionTier = "free" | "pro" | "enterprise";

export const USER_ROLES = {
  admin: "admin",
  evaluator: "evaluator",
  viewer: "viewer",
} as const;

export const RFP_ACCESS_LEVELS = {
  owner: "owner",
  evaluator: "evaluator",
  viewer: "viewer",
} as const;

export const SUBSCRIPTION_TIERS = {
  free: "free",
  pro: "pro",
  enterprise: "enterprise",
} as const;

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  admin: {
    manage_organization: true,
    invite_users: true,
    create_rfp: true,
    delete_rfp: true,
    assign_evaluators: true,
    view_analytics: true,
  },
  evaluator: {
    manage_organization: false,
    invite_users: false,
    create_rfp: true,
    delete_rfp: false,
    assign_evaluators: false,
    view_analytics: false,
  },
  viewer: {
    manage_organization: false,
    invite_users: false,
    create_rfp: false,
    delete_rfp: false,
    assign_evaluators: false,
    view_analytics: false,
  },
} as const;

// RFP access level permissions mapping
export const RFP_ACCESS_PERMISSIONS = {
  owner: {
    view_rfp: true,
    edit_rfp: true,
    delete_rfp: true,
    manage_assignments: true,
    evaluate_responses: true,
    export_results: true,
  },
  evaluator: {
    view_rfp: true,
    edit_rfp: false,
    delete_rfp: false,
    manage_assignments: false,
    evaluate_responses: true,
    export_results: false,
  },
  viewer: {
    view_rfp: true,
    edit_rfp: false,
    delete_rfp: false,
    manage_assignments: false,
    evaluate_responses: false,
    export_results: false,
  },
} as const;
