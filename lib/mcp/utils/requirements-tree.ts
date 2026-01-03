/**
 * Requirements Tree Builder
 * Constructs hierarchical tree structures from flat requirement lists
 * Supports 4-level hierarchy: Domain > Category > SubCategory > Requirement
 */

import { MOCK_REQUIREMENTS } from "./mock-data";

/**
 * 4-Level Hierarchy Structure
 */
export interface RequirementNode {
  id: string;
  title: string;
  description?: string;
  type: "domain" | "category" | "subcategory" | "requirement";
  children?: RequirementNode[];
  priority?: "high" | "medium" | "low";
  mandatory?: boolean;
  count?: number; // For aggregate nodes
}

/**
 * Extract domain from requirement (first part before space or dash)
 */
function extractDomain(text: string): string {
  const parts = text.split(/[-\s]/);
  return parts[0] || "General";
}

/**
 * Group requirements by domain and category
 */
function groupRequirements(rfpId: string) {
  const requirements = MOCK_REQUIREMENTS.filter((req) => req.rfpId === rfpId);

  const grouped: Record<string, Record<string, typeof requirements>> = {};

  for (const req of requirements) {
    const domain = extractDomain(req.category);
    const category = req.category;

    if (!grouped[domain]) {
      grouped[domain] = {};
    }
    if (!grouped[domain][category]) {
      grouped[domain][category] = [];
    }

    grouped[domain][category].push(req);
  }

  return grouped;
}

/**
 * Build a hierarchical tree from grouped requirements
 */
export function buildRequirementsTree(rfpId: string): RequirementNode {
  const grouped = groupRequirements(rfpId);

  const domains: RequirementNode[] = [];

  for (const [domainName, categories] of Object.entries(grouped)) {
    const categoryNodes: RequirementNode[] = [];

    for (const [categoryName, requirements] of Object.entries(categories)) {
      const requirementNodes: RequirementNode[] = requirements.map((req) => ({
        id: req.id,
        title: req.title,
        description: req.description,
        type: "requirement",
        priority: req.priority,
        mandatory: req.mandatory,
      }));

      categoryNodes.push({
        id: `cat-${categoryName.replace(/\s+/g, "-").toLowerCase()}`,
        title: categoryName,
        type: "category",
        children: requirementNodes,
        count: requirementNodes.length,
      });
    }

    domains.push({
      id: `domain-${domainName.replace(/\s+/g, "-").toLowerCase()}`,
      title: domainName,
      type: "domain",
      children: categoryNodes,
      count: categoryNodes.reduce((sum, cat) => sum + (cat.count || 0), 0),
    });
  }

  return {
    id: `rfp-${rfpId}`,
    title: rfpId,
    type: "domain",
    children: domains,
    count: domains.reduce((sum, domain) => sum + (domain.count || 0), 0),
  };
}

/**
 * Flatten tree to a list with hierarchy level info
 */
export interface FlatRequirement {
  id: string;
  title: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  mandatory?: boolean;
  level: number;
  domain: string;
  category: string;
  path: string; // e.g., "Infrastructure > Security > TLS > Requirement Title"
}

export function flattenRequirementsTree(
  tree: RequirementNode,
  level: number = 0,
  path: string[] = []
): FlatRequirement[] {
  const result: FlatRequirement[] = [];

  if (tree.type === "requirement") {
    result.push({
      id: tree.id,
      title: tree.title,
      description: tree.description,
      priority: tree.priority,
      mandatory: tree.mandatory,
      level,
      domain: path[0] || "General",
      category: path[1] || "Uncategorized",
      path: [...path, tree.title].join(" > "),
    });
  } else if (tree.children) {
    for (const child of tree.children) {
      const newPath = [...path];
      if (tree.type === "domain" || tree.type === "category") {
        newPath.push(tree.title);
      }
      result.push(...flattenRequirementsTree(child, level + 1, newPath));
    }
  }

  return result;
}

/**
 * Search requirements in tree by keyword
 */
export function searchInTree(
  tree: RequirementNode,
  keyword: string
): RequirementNode[] {
  const results: RequirementNode[] = [];
  const lowerKeyword = keyword.toLowerCase();

  function search(node: RequirementNode) {
    if (
      node.title.toLowerCase().includes(lowerKeyword) ||
      (node.description &&
        node.description.toLowerCase().includes(lowerKeyword))
    ) {
      results.push({
        ...node,
        children: node.children
          ? node.children.map((child) => ({ ...child }))
          : undefined,
      });
    }

    if (node.children) {
      for (const child of node.children) {
        search(child);
      }
    }
  }

  search(tree);
  return results;
}

/**
 * Get statistics from tree
 */
export interface TreeStatistics {
  totalDomains: number;
  totalCategories: number;
  totalRequirements: number;
  highPriorityCount: number;
  mandatoryCount: number;
  requirementsByPriority: Record<string, number>;
}

export function getTreeStatistics(tree: RequirementNode): TreeStatistics {
  let totalDomains = 0;
  let totalCategories = 0;
  let totalRequirements = 0;
  let highPriorityCount = 0;
  let mandatoryCount = 0;
  const requirementsByPriority: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  function traverse(node: RequirementNode) {
    if (node.type === "domain" && node !== tree) {
      totalDomains++;
    } else if (node.type === "category") {
      totalCategories++;
    } else if (node.type === "requirement") {
      totalRequirements++;
      if (node.priority) {
        requirementsByPriority[node.priority]++;
      }
      if (node.priority === "high") {
        highPriorityCount++;
      }
      if (node.mandatory) {
        mandatoryCount++;
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(tree);

  return {
    totalDomains,
    totalCategories,
    totalRequirements,
    highPriorityCount,
    mandatoryCount,
    requirementsByPriority,
  };
}
