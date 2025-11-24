/**
 * TypeScript types generated from Supabase schema
 * These types match the database tables and are used for type safety
 */

// ============================================================================
// MULTI-TENANT TYPES
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_code: string;
  settings: Record<string, unknown> | null;
  subscription_tier: "free" | "pro" | "enterprise";
  max_users: number;
  max_rfps: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: "admin" | "evaluator" | "viewer";
  joined_at: string;
  invited_by: string | null;
}

export interface OrganizationWithRole extends Organization {
  role: "admin" | "evaluator" | "viewer";
}

export interface UserWithRole extends User {
  role: "admin" | "evaluator" | "viewer";
  joined_at: string;
}

// ============================================================================
// RFP TYPES
// ============================================================================

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

export interface RFPUserAssignment {
  id: string;
  rfp_id: string;
  user_id: string;
  access_level: "owner" | "evaluator" | "viewer";
  assigned_at: string;
  assigned_by: string | null;
}

// ============================================================================
// REQUIREMENT TYPES
// ============================================================================

export interface Requirement {
  id: string;
  rfp_id: string;
  requirement_id_external: string;
  title: string;
  description: string | null;
  context: string | null;
  category_id: string | null;
  parent_id: string | null;
  level: 1 | 2 | 3 | 4;
  weight: number;
  position_in_pdf: Record<string, unknown> | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RequirementWithChildren extends Requirement {
  children?: RequirementWithChildren[];
}

// ============================================================================
// TAG TYPES
// ============================================================================

export interface Tag {
  id: string;
  rfp_id: string;
  name: string;
  color: string | null;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

export interface RequirementTag {
  id: string;
  requirement_id: string;
  tag_id: string;
  created_at: string;
  created_by: string | null;
}

export interface RequirementWithTags extends Requirement {
  tags?: Tag[];
}

export interface RequirementWithChildrenAndTags
  extends RequirementWithChildren {
  tags?: Tag[];
  children?: RequirementWithChildrenAndTags[];
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export interface Category {
  id: string;
  rfp_id: string;
  code: string;
  title: string;
  short_name: string;
  parent_id: string | null;
  level: 1 | 2 | 3 | 4;
  weight: number;
  position_in_pdf: Record<string, unknown> | null;
  display_order?: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

// ============================================================================
// SUPPLIER TYPES
// ============================================================================

export interface Supplier {
  id: string;
  rfp_id: string;
  supplier_id_external: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface Response {
  id: string;
  rfp_id: string;
  requirement_id: string;
  supplier_id: string;
  response_text: string | null;
  ai_score: number | null; // Now supports decimal values (0.5 increments)
  ai_comment: string | null;
  manual_score: number | null; // Now supports decimal values (0.5 increments)
  status: "pending" | "pass" | "partial" | "fail";
  is_checked: boolean;
  manual_comment: string | null;
  question: string | null;
  last_modified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResponseUpdate {
  manual_score?: number | null; // Now supports decimal values (0.5 increments)
  status?: "pending" | "pass" | "partial" | "fail";
  is_checked?: boolean;
  manual_comment?: string | null;
  question?: string | null;
}

export interface ResponseAudit {
  id: string;
  response_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  modified_by: string;
  modified_at: string;
}

// ============================================================================
// COMPOSITE TYPES (for API responses)
// ============================================================================

export interface ResponseWithSupplier extends Response {
  supplier: Supplier;
}

export interface RequirementWithResponses extends Requirement {
  responses: ResponseWithSupplier[];
}

export interface RFPWithDetails extends RFP {
  requirements: RequirementWithChildren[];
  suppliers: Supplier[];
}

// ============================================================================
// QUERY RETURN TYPES
// ============================================================================

export interface GetRFPsResponse {
  rfps: RFP[];
  meta: {
    total: number;
    limit: number;
  };
}

export interface GetRequirementsResponse {
  requirements: RequirementWithChildren[];
  meta: {
    total: number;
    levels: Record<number, number>;
  };
}

export interface GetResponsesResponse {
  responses: ResponseWithSupplier[];
  meta: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export interface GetOrganizationMembersResponse {
  members: UserWithRole[];
  meta: {
    total: number;
    limit: number;
  };
}

export interface GetRFPAssignmentsResponse {
  assignments: (RFPUserAssignment & { user: User })[];
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportCategoryPayload {
  id: string;
  code: string;
  title: string;
  short_name: string;
  level: 1 | 2 | 3 | 4;
  parent_id?: string;
}

export interface ImportCategoriesRequest {
  categories: ImportCategoryPayload[];
}

export interface ImportRequirementPayload {
  id?: string;
  code: string;
  title: string;
  description: string;
  weight: number;
  category_name: string;
  is_mandatory?: boolean;
  is_optional?: boolean;
  page_number?: number;
  document_name?: string;
}

export interface ImportRequirementsRequest {
  requirements: ImportRequirementPayload[];
  suppliers?: Array<{
    id: string;
    name: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  }>;
}

// ============================================================================
// DASHBOARD CONFIGURATION TYPES
// ============================================================================

export type DashboardConfigType = "radar" | "bar" | "line" | "scatter";

export interface RadarConfigData {
  selectedTagIds: string[];
  supplierId: string;
}

export type DashboardConfigData = RadarConfigData;

export interface DashboardConfiguration {
  id: string;
  rfp_id: string;
  name: string;
  type: DashboardConfigType;
  config: DashboardConfigData;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ============================================================================
// RADAR DATA TYPES
// ============================================================================

export interface RadarDataPoint {
  axis: string;
  value: number;
  tagId?: string;
}

export interface RadarChartData {
  type: "radar";
  data: RadarDataPoint[];
  supplierName?: string;
  rfpId?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
