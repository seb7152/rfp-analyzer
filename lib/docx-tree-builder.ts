/**
 * Utilities for building hierarchical tree from DOCX sections
 */

export interface ParsedRequirement {
  code: string;
  title?: string;
  content?: string;
  contexts?: string[];
}

export interface Section {
  level: number;
  title: string;
  content: string[];
  tables: string[][];
  requirements: ParsedRequirement[];
}

export interface CategoryMapping {
  type: "existing" | "new";
  existingId?: string; // ID of existing category in DB
  newCode?: string; // Code for new category to create
}

export interface SectionTreeNode {
  id: string; // Temporary ID for UI
  level: number;
  title: string;
  content: string[]; // Section content (used for contexts)
  requirements: ParsedRequirement[];
  children: SectionTreeNode[];

  // Category mapping fields
  isCategory: boolean; // Should this section become a category?
  categoryMapping?: CategoryMapping;
}

/**
 * Builds a hierarchical tree from flat sections array
 * Sections with lower level numbers become parents of higher levels
 * (e.g., Heading1 (level 1) is parent of Heading2 (level 2))
 */
export function buildSectionTree(sections: Section[]): SectionTreeNode[] {
  const roots: SectionTreeNode[] = [];
  const stack: SectionTreeNode[] = [];

  sections.forEach((section, index) => {
    const node: SectionTreeNode = {
      id: `section-${index}`,
      level: section.level,
      title: section.title,
      content: section.content, // Preserve content for contexts
      requirements: section.requirements,
      children: [],
      isCategory: false, // Default: not selected as category
    };

    // Special handling for "Root" section (level 0)
    if (section.level === 0) {
      // Root section - collect requirements but don't create a visible node
      roots.push(node);
      stack.push(node);
      return;
    }

    // Pop from stack until we find the parent (level < current)
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // This is a top-level section
      roots.push(node);
    } else {
      // Add as child of the last item in stack
      const parent = stack[stack.length - 1];
      parent.children.push(node);
    }

    stack.push(node);
  });

  return roots;
}

/**
 * Flattens the tree to get all requirements with their parent category
 * Only includes sections marked as isCategory
 */
export function flattenTreeToRequirements(
  nodes: SectionTreeNode[],
  parentCategoryNode?: SectionTreeNode
): Array<{
  requirement: ParsedRequirement;
  categoryNode: SectionTreeNode | undefined;
}> {
  const results: Array<{
    requirement: ParsedRequirement;
    categoryNode: SectionTreeNode | undefined;
  }> = [];

  for (const node of nodes) {
    // Determine the category for this node's requirements
    const categoryForThisNode = node.isCategory ? node : parentCategoryNode;

    // Add this node's requirements with contexts from the section content
    node.requirements.forEach((req) => {
      results.push({
        requirement: {
          ...req,
          contexts: node.content.length > 0 ? node.content : undefined,
        },
        categoryNode: categoryForThisNode,
      });
    });

    // Recursively process children
    if (node.children.length > 0) {
      const childResults = flattenTreeToRequirements(
        node.children,
        categoryForThisNode
      );
      results.push(...childResults);
    }
  }

  return results;
}

/**
 * Gets the category name for a requirement based on its parent category node
 */
export function getCategoryNameForRequirement(
  categoryNode: SectionTreeNode | undefined,
  existingCategories: Array<{ id: string; code: string; title: string }>
): string | null {
  if (!categoryNode || !categoryNode.isCategory) {
    return null;
  }

  const mapping = categoryNode.categoryMapping;
  if (!mapping) {
    return null;
  }

  if (mapping.type === "existing" && mapping.existingId) {
    // Find the category by ID
    const category = existingCategories.find(
      (c) => c.id === mapping.existingId
    );
    return category ? category.code : null;
  }

  if (mapping.type === "new" && mapping.newCode) {
    return mapping.newCode;
  }

  return null;
}
