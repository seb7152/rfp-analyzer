/**
 * Mock data for MCP tools development and testing
 */

export interface MockRFP {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  status: "draft" | "active" | "closed";
  requirementCount: number;
}

export interface MockRequirement {
  id: string;
  rfpId: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  mandatory: boolean;
  createdAt: string;
}

export interface MockSupplier {
  id: string;
  rfpId: string;
  name: string;
  email: string;
  status: "invited" | "submitted" | "approved" | "rejected";
  submittedAt?: string;
}

/**
 * Mock RFPs for testing
 */
export const MOCK_RFPS: MockRFP[] = [
  {
    id: "rfp-001",
    title: "Cloud Infrastructure Platform",
    description:
      "Selection of a cloud infrastructure provider for enterprise use",
    createdAt: "2025-01-01T10:00:00Z",
    status: "active",
    requirementCount: 12,
  },
  {
    id: "rfp-002",
    title: "CRM System Implementation",
    description:
      "Evaluation of CRM solutions for sales and customer management",
    createdAt: "2025-01-02T11:00:00Z",
    status: "active",
    requirementCount: 8,
  },
  {
    id: "rfp-003",
    title: "Data Warehouse Solution",
    description:
      "Assessment of data warehouse platforms for business intelligence",
    createdAt: "2025-01-03T09:00:00Z",
    status: "draft",
    requirementCount: 15,
  },
];

/**
 * Mock Requirements organized by domain
 */
export const MOCK_REQUIREMENTS: MockRequirement[] = [
  // Infrastructure requirements
  {
    id: "req-001",
    rfpId: "rfp-001",
    title: "Multi-region deployment support",
    description:
      "System must support deployment across multiple geographic regions",
    category: "Infrastructure",
    priority: "high",
    mandatory: true,
    createdAt: "2025-01-01T10:30:00Z",
  },
  {
    id: "req-002",
    rfpId: "rfp-001",
    title: "Auto-scaling capabilities",
    description: "Automatic scaling based on demand",
    category: "Infrastructure",
    priority: "high",
    mandatory: true,
    createdAt: "2025-01-01T10:31:00Z",
  },
  {
    id: "req-003",
    rfpId: "rfp-001",
    title: "99.99% uptime SLA",
    description: "Service level agreement guaranteeing 99.99% availability",
    category: "Infrastructure",
    priority: "high",
    mandatory: true,
    createdAt: "2025-01-01T10:32:00Z",
  },
  {
    id: "req-004",
    rfpId: "rfp-001",
    title: "Container orchestration support",
    description: "Support for Kubernetes and Docker",
    category: "Infrastructure",
    priority: "medium",
    mandatory: false,
    createdAt: "2025-01-01T10:33:00Z",
  },

  // Security requirements
  {
    id: "req-005",
    rfpId: "rfp-001",
    title: "End-to-end encryption",
    description: "All data must be encrypted in transit and at rest",
    category: "Security",
    priority: "high",
    mandatory: true,
    createdAt: "2025-01-01T11:00:00Z",
  },
  {
    id: "req-006",
    rfpId: "rfp-001",
    title: "ISO 27001 Certification",
    description:
      "Provider must have ISO 27001 information security certification",
    category: "Security",
    priority: "high",
    mandatory: true,
    createdAt: "2025-01-01T11:01:00Z",
  },
  {
    id: "req-007",
    rfpId: "rfp-001",
    title: "Regular security audits",
    description: "Annual third-party security audits and penetration testing",
    category: "Security",
    priority: "medium",
    mandatory: true,
    createdAt: "2025-01-01T11:02:00Z",
  },

  // CRM requirements
  {
    id: "req-008",
    rfpId: "rfp-002",
    title: "Contact management system",
    description: "Comprehensive contact and company database",
    category: "Core Features",
    priority: "high",
    mandatory: true,
    createdAt: "2025-01-02T11:30:00Z",
  },
  {
    id: "req-009",
    rfpId: "rfp-002",
    title: "Sales pipeline tracking",
    description: "Visual sales pipeline with drag-and-drop opportunities",
    category: "Core Features",
    priority: "high",
    mandatory: true,
    createdAt: "2025-01-02T11:31:00Z",
  },
  {
    id: "req-010",
    rfpId: "rfp-002",
    title: "Integration with email systems",
    description: "Two-way email sync with Outlook and Gmail",
    category: "Integration",
    priority: "high",
    mandatory: true,
    createdAt: "2025-01-02T11:32:00Z",
  },
];

/**
 * Mock Suppliers for RFP evaluation
 */
export const MOCK_SUPPLIERS: MockSupplier[] = [
  {
    id: "sup-001",
    rfpId: "rfp-001",
    name: "CloudTech Solutions",
    email: "sales@cloudtech.com",
    status: "submitted",
    submittedAt: "2025-01-05T14:00:00Z",
  },
  {
    id: "sup-002",
    rfpId: "rfp-001",
    name: "InfraScale Inc",
    email: "contact@infrascale.io",
    status: "submitted",
    submittedAt: "2025-01-06T09:30:00Z",
  },
  {
    id: "sup-003",
    rfpId: "rfp-001",
    name: "SecureCloud Partners",
    email: "info@securecloud.com",
    status: "invited",
  },
  {
    id: "sup-004",
    rfpId: "rfp-002",
    name: "SalesForce Direct",
    email: "enterprise@salesforce.com",
    status: "submitted",
    submittedAt: "2025-01-07T10:00:00Z",
  },
];
