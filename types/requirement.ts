/**
 * Requirement type definitions including 4-level hierarchy
 */

export interface Requirement {
  id: string;
  rfp_id: string;
  requirement_id_external: string;
  title: string;
  description: string | null;
  context: string | null;
  parent_id: string | null;
  level: 1 | 2 | 3 | 4;
  weight: number;
  position_in_pdf: {
    page?: number;
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  } | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RequirementWithChildren extends Requirement {
  children?: RequirementWithChildren[];
}

export interface RequirementBreadcrumb {
  id: string;
  externalId: string;
  title: string;
  level: 1 | 2 | 3 | 4;
}

export interface RequirementHierarchy {
  level1: Requirement[];
  level2: Record<string, Requirement[]>;
  level3: Record<string, Requirement[]>;
  level4: Record<string, Requirement[]>;
}

export interface RequirementCompletionStatus {
  totalResponses: number;
  checkedResponses: number;
  isComplete: boolean;
  completionPercentage: number;
}

export type RequirementLevel = 1 | 2 | 3 | 4;
