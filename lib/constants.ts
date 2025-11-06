/**
 * Application-wide constants, enums, and configuration values
 */

// ============================================================================
// RESPONSE STATUS VALUES
// ============================================================================

export const RESPONSE_STATUSES = {
  pending: "pending",
  pass: "pass",
  partial: "partial",
  fail: "fail",
} as const

export const RESPONSE_STATUS_LABELS = {
  pending: "En attente",
  pass: "Conforme",
  partial: "Partiellement conforme",
  fail: "Non conforme",
} as const

export const RESPONSE_STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-800 border-gray-300",
  pass: "bg-green-100 text-green-800 border-green-300",
  partial: "bg-blue-100 text-blue-800 border-blue-300",
  fail: "bg-red-100 text-red-800 border-red-300",
} as const

export const RESPONSE_STATUS_ICONS = {
  pending: "clock",
  pass: "check-circle",
  partial: "zap",
  fail: "x-circle",
} as const

// ============================================================================
// USER ROLES
// ============================================================================

export const USER_ROLES = {
  admin: "admin",
  evaluator: "evaluator",
  viewer: "viewer",
} as const

export const USER_ROLE_LABELS = {
  admin: "Administrateur",
  evaluator: "Évaluateur",
  viewer: "Lecteur",
} as const

// ============================================================================
// RFP ACCESS LEVELS
// ============================================================================

export const RFP_ACCESS_LEVELS = {
  owner: "owner",
  evaluator: "evaluator",
  viewer: "viewer",
} as const

export const RFP_ACCESS_LEVEL_LABELS = {
  owner: "Propriétaire",
  evaluator: "Évaluateur",
  viewer: "Lecteur",
} as const

// ============================================================================
// RFP STATUSES
// ============================================================================

export const RFP_STATUSES = {
  in_progress: "in_progress",
  completed: "completed",
  archived: "archived",
} as const

export const RFP_STATUS_LABELS = {
  in_progress: "En cours",
  completed: "Terminé",
  archived: "Archivé",
} as const

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export const SUBSCRIPTION_TIERS = {
  free: "free",
  pro: "pro",
  enterprise: "enterprise",
} as const

export const SUBSCRIPTION_TIER_LIMITS = {
  free: {
    max_users: 10,
    max_rfps: 5,
    max_suppliers_per_rfp: 10,
    max_requirements_per_rfp: 200,
  },
  pro: {
    max_users: 50,
    max_rfps: 20,
    max_suppliers_per_rfp: 20,
    max_requirements_per_rfp: 500,
  },
  enterprise: {
    max_users: Infinity,
    max_rfps: Infinity,
    max_suppliers_per_rfp: Infinity,
    max_requirements_per_rfp: Infinity,
  },
} as const

// ============================================================================
// REQUIREMENT HIERARCHY LEVELS
// ============================================================================

export const REQUIREMENT_LEVELS = {
  domain: 1,
  category: 2,
  subcategory: 3,
  requirement: 4,
} as const

export const REQUIREMENT_LEVEL_LABELS = {
  1: "Domaine",
  2: "Catégorie",
  3: "Sous-catégorie",
  4: "Exigence",
} as const

// ============================================================================
// SCORE RANGES
// ============================================================================

export const SCORE_MIN = 0
export const SCORE_MAX = 5
export const SCORE_STEPS = [0, 1, 2, 3, 4, 5]

export const SCORE_LABELS = {
  0: "0",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
} as const

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const SIDEBAR_COLLAPSE_KEY = "sidebar_collapsed"
export const THEME_PREFERENCE_KEY = "theme_preference"
export const CURRENT_ORG_KEY = "current_organization_id"

export const PAGINATION_DEFAULTS = {
  page_size: 10,
  items_per_page: 25,
} as const

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION = {
  ORG_NAME_MIN: 2,
  ORG_NAME_MAX: 100,
  ORG_SLUG_PATTERN: /^[a-z0-9-]+$/,
  RFP_TITLE_MIN: 3,
  RFP_TITLE_MAX: 255,
  REQUIREMENT_TITLE_MIN: 3,
  REQUIREMENT_TITLE_MAX: 500,
  COMMENT_MAX: 5000,
  QUESTION_MAX: 5000,
} as const

// ============================================================================
// API RESPONSE CONSTANTS
// ============================================================================

export const API_ERRORS = {
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Not Found",
  BAD_REQUEST: "Bad Request",
  CONFLICT: "Conflict",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
} as const

// ============================================================================
// BREADCRUMB SEPARATORS
// ============================================================================

export const BREADCRUMB_SEPARATOR = " / "
