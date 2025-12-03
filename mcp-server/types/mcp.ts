export interface PATPermissions {
  // Permissions granulaires par catégorie
  requirements?: ("read" | "create" | "update" | "delete")[];
  suppliers?: ("read" | "create" | "update" | "delete")[];
  responses?: ("read" | "create" | "update" | "delete")[];
  comments?: ("read" | "create" | "update" | "delete")[];
  scoring?: ("read" | "create" | "update" | "delete")[];
  versions?: ("read" | "create" | "update" | "delete")[];

  // Restrictions spécifiques
  organization_ids?: string[];
  rfp_ids?: string[];
  ip_whitelist?: string[];
  rate_limit?: {
    requests_per_minute: number;
    requests_per_hour: number;
  };
}

export interface MCPContext {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  organizationId?: string;
  authorization?: string;
}
