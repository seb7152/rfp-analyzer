"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoveToDialog } from "@/components/RFPSummary/MoveToDialog";
import { PeerReviewBadge } from "@/components/PeerReviewBadge";
import { usePeerReviewStatuses } from "@/hooks/use-peer-review";
import { v4 as uuidv4 } from "uuid";
import {
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Tag,
  AlertCircle,
  Save,
  ChevronUp,
  CheckCircle2,
  Info,
  Pencil,
  FolderInput,
  Trash2,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  is_mandatory?: boolean;
  is_optional?: boolean;
  description?: string;
  children?: TreeNode[];
}

interface TagData {
  id: string;
  name: string;
  color: string | null;
}

interface RequirementMetadata {
  [requirementId: string]: {
    tags: TagData[];
    isOptional: boolean;
    isMandatory: boolean;
  };
}

interface RequirementsTabProps {
  rfpId: string;
  peerReviewEnabled?: boolean;
  versionId?: string;
}

const DEFAULT_TAGS = [
  { name: "Fonctionnel", color: "#3B82F6" },
  { name: "Technique", color: "#8B5CF6" },
  { name: "Projet", color: "#EC4899" },
  { name: "Exploitation", color: "#F59E0B" },
  { name: "SLA", color: "#10B981" },
];

const TAG_COLORS = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Green
  "#06B6D4", // Cyan
  "#EF4444", // Red
  "#6366F1", // Indigo
];

interface CategoryTagDialogProps {
  node: TreeNode;
  tags: TagData[];
  onApply: (selectedTagIds: Set<string>) => void;
}

function CategoryTagDialog({ node, tags, onApply }: CategoryTagDialogProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleTag = (tagId: string) => {
    const updated = new Set(selectedTags);
    if (updated.has(tagId)) {
      updated.delete(tagId);
    } else {
      updated.add(tagId);
    }
    setSelectedTags(updated);
  };

  const handleApply = () => {
    onApply(selectedTags);
    setSelectedTags(new Set());
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          title="Apply tags to all requirements in this category"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply Tags to Category: {node.code}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Select tags to apply to all requirements under this category
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              No tags available. Create tags in the Tags Manager section above.
            </p>
          ) : (
            tags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTags.has(tag.id)}
                  onChange={() => handleToggleTag(tag.id)}
                  className="h-4 w-4 rounded"
                />
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: tag.color || "#6B7280",
                  }}
                  aria-hidden="true"
                />
                <span className="text-sm">{tag.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="mt-6 flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={selectedTags.size === 0}
          >
            Apply Tags
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RequirementsTab({ rfpId, peerReviewEnabled = false, versionId }: RequirementsTabProps) {
  const [data, setData] = useState<TreeNode[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requirementMetadata, setRequirementMetadata] =
    useState<RequirementMetadata>({});
  const [initialMetadata, setInitialMetadata] = useState<RequirementMetadata>(
    {}
  );
  const [tags, setTags] = useState<TagData[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );

  // Structure Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTargetNodeIds, setMoveTargetNodeIds] = useState<string[]>([]);

  // Peer review statuses — only fetched when peer review is enabled
  const { statuses: reviewStatuses } = usePeerReviewStatuses(
    peerReviewEnabled ? rfpId : undefined,
    peerReviewEnabled ? versionId : undefined
  );

  // Check for unsaved changes
  const hasChanges = (): boolean => {
    return (
      JSON.stringify(requirementMetadata) !== JSON.stringify(initialMetadata)
    );
  };

  // Update hasUnsavedChanges when metadata changes
  useEffect(() => {
    setHasUnsavedChanges(hasChanges());
  }, [requirementMetadata, initialMetadata]);

  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch tree data
        const treeResponse = await fetch(`/api/rfps/${rfpId}/tree`, {
          cache: "no-store",
        });

        if (!treeResponse.ok) {
          throw new Error(
            `Error ${treeResponse.status}: ${treeResponse.statusText}`
          );
        }

        const treeData = await treeResponse.json();
        setData(treeData || []);

        // Initialize empty metadata for all requirements
        const metadata: RequirementMetadata = {};
        function initializeMetadata(nodes: TreeNode[]) {
          for (const node of nodes) {
            if (node.type === "requirement") {
              metadata[node.id] = {
                tags: [],
                isOptional: node.is_optional || false,
                isMandatory: node.is_mandatory || false,
              };
            }
            if (node.children) {
              initializeMetadata(node.children);
            }
          }
        }
        initializeMetadata(treeData || []);
        setInitialMetadata(JSON.parse(JSON.stringify(metadata)));

        // Fetch tags from database
        const tagsResponse = await fetch(`/api/rfps/${rfpId}/tags`, {
          cache: "no-store",
        });

        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setTags(tagsData.tags || []);

          // Load requirement-tag associations for all requirements in bulk
          const requirementIds = Object.keys(metadata);
          if (requirementIds.length > 0) {
            try {
              const bulkTagsResponse = await fetch(
                `/api/rfps/${rfpId}/tags/bulk-fetch`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ requirementIds }),
                  cache: "no-store",
                }
              );
              if (bulkTagsResponse.ok) {
                const bulkTagsData = await bulkTagsResponse.json();
                const tagsByRequirement = bulkTagsData.tagsByRequirement || {};
                for (const [requirementId, tags] of Object.entries(
                  tagsByRequirement
                )) {
                  metadata[requirementId].tags = (tags as any[]) || [];
                }
              }
            } catch (err) {
              console.error("Error loading tags in bulk:", err);
            }
          }
        } else {
          // Fall back to default tags if API fails
          setTags(
            DEFAULT_TAGS.map((tag, idx) => ({ id: `tag-${idx}`, ...tag }))
          );
        }
        setRequirementMetadata(metadata);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Error loading data");
      } finally {
        setLoading(false);
      }
    }

    if (rfpId) {
      fetchData();
    }
  }, [rfpId]);

  const toggleNodeExpanded = (nodeId: string) => {
    const newSet = new Set(expandedNodeIds);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    setExpandedNodeIds(newSet);
  };

  const handleCollapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  const handleExpandAll = () => {
    const allCategoryIds = new Set<string>();
    function collectCategoryIds(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.type === "category") {
          allCategoryIds.add(node.id);
        }
        if (node.children) {
          collectCategoryIds(node.children);
        }
      }
    }
    collectCategoryIds(data);
    setExpandedNodeIds(allCategoryIds);
  };

  const toggleTag = (requirementId: string, tag: TagData) => {
    setRequirementMetadata((prev) => {
      const current = prev[requirementId] || {
        tags: [],
        isOptional: false,
        isMandatory: false,
      };
      const hasTag = current.tags.some((t) => t.id === tag.id);
      const newTags = hasTag
        ? current.tags.filter((t) => t.id !== tag.id)
        : [...current.tags, tag];

      // Persist to database immediately if tag is being removed
      if (hasTag) {
        fetch(`/api/rfps/${rfpId}/requirements/${requirementId}/tags`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagId: tag.id }),
        }).catch((err) => console.error("Error removing tag:", err));
      }
      // Adding tags will be handled by the Save button

      return {
        ...prev,
        [requirementId]: { ...current, tags: newTags },
      };
    });
  };

  const toggleCheckbox = (
    requirementId: string,
    field: "isOptional" | "isMandatory"
  ) => {
    setRequirementMetadata((prev) => {
      const current = prev[requirementId] || {
        tags: [],
        isOptional: false,
        isMandatory: false,
      };

      // If toggling mandatory, uncheck optional
      const updates = { ...current, [field]: !current[field] };
      if (field === "isMandatory" && updates.isMandatory) {
        updates.isOptional = false;
      }
      // If toggling optional, uncheck mandatory
      if (field === "isOptional" && updates.isOptional) {
        updates.isMandatory = false;
      }

      return {
        ...prev,
        [requirementId]: updates,
      };
    });
  };

  const addTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const color = TAG_COLORS[selectedColorIndex % TAG_COLORS.length];
      const response = await fetch(`/api/rfps/${rfpId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color,
          description: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error response from API:", error);
        setSaveMessage({
          type: "error",
          text: error.error || "Failed to create tag",
        });
        // Keep error message visible for longer
        setTimeout(() => setSaveMessage(null), 5000);
        return;
      }

      const { tag } = await response.json();
      setTags([...tags, tag]);
      setNewTagName("");
      setSelectedColorIndex((prev) => (prev + 1) % TAG_COLORS.length);
      setSaveMessage({
        type: "success",
        text: "✓ Tag created successfully!",
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Error adding tag:", err);
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create tag",
      });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      // Delete tag from database
      const response = await fetch(`/api/rfps/${rfpId}/tags/${tagId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error response from API:", error);
        setSaveMessage({
          type: "error",
          text: error.error || "Failed to delete tag",
        });
        setTimeout(() => setSaveMessage(null), 5000);
        return;
      }

      // Remove from local state after successful deletion
      setTags(tags.filter((t) => t.id !== tagId));
      // Also remove from all requirements
      setRequirementMetadata((prev) => {
        const updated = { ...prev };
        for (const reqId in updated) {
          updated[reqId].tags = updated[reqId].tags.filter(
            (t) => t.id !== tagId
          );
        }
        return updated;
      });

      setSaveMessage({
        type: "success",
        text: "✓ Tag deleted successfully!",
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Error deleting tag:", err);
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete tag",
      });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  // Get all requirements under a category (cascade)
  const getChildRequirements = (
    nodeId: string,
    nodes: TreeNode[] = data
  ): string[] => {
    const requirementIds: string[] = [];

    function traverse(items: TreeNode[]) {
      for (const item of items) {
        if (item.type === "requirement") {
          requirementIds.push(item.id);
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    }

    // Find the node and traverse its children
    for (const item of nodes) {
      if (item.id === nodeId) {
        if (item.children) {
          traverse(item.children);
        }
        break;
      }
      if (item.children) {
        const found = getChildRequirements(nodeId, item.children);
        if (found.length > 0) {
          return found;
        }
      }
    }

    return requirementIds;
  };

  // Apply tags to category and all child requirements
  const applyTagsToCategory = (categoryId: string, selectedTags: TagData[]) => {
    const childRequirementIds = getChildRequirements(categoryId);

    setRequirementMetadata((prev) => {
      const updated = { ...prev };
      for (const reqId of childRequirementIds) {
        if (updated[reqId]) {
          // Add new tags that aren't already there
          const existingTagIds = new Set(updated[reqId].tags.map((t) => t.id));
          const newTags = selectedTags.filter((t) => !existingTagIds.has(t.id));
          updated[reqId].tags = [...updated[reqId].tags, ...newTags];
        }
      }
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      // Helper function to check if ID is a valid UUID
      const isValidUUID = (id: string): boolean => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };

      // Build bulk assignments array
      const assignments: Array<{ requirementId: string; tagIds: string[] }> =
        [];

      for (const [requirementId, metadata] of Object.entries(
        requirementMetadata
      )) {
        if (metadata.tags && metadata.tags.length > 0) {
          // Filter out fallback tags (those with non-UUID IDs like "tag-0")
          const validTags = metadata.tags.filter((t) => isValidUUID(t.id));

          if (validTags.length > 0) {
            const tagIds = validTags.map((t) => t.id);
            assignments.push({ requirementId, tagIds });
          }
        }
      }

      // Send all assignments in a single API call
      if (assignments.length > 0) {
        const response = await fetch(`/api/rfps/${rfpId}/tags/bulk-assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to save tags");
        }
      }

      // Build bulk flag updates array
      const flagUpdates: Array<{
        requirementId: string;
        is_mandatory: boolean;
        is_optional: boolean;
      }> = [];

      for (const [requirementId, metadata] of Object.entries(
        requirementMetadata
      )) {
        // Check if flags have changed from initial state
        const initialMeta = initialMetadata[requirementId];
        if (
          initialMeta &&
          (metadata.isMandatory !== initialMeta.isMandatory ||
            metadata.isOptional !== initialMeta.isOptional)
        ) {
          flagUpdates.push({
            requirementId,
            is_mandatory: metadata.isMandatory,
            is_optional: metadata.isOptional,
          });
        }
      }

      // Send all flag updates in a single API call
      if (flagUpdates.length > 0) {
        const flagResponse = await fetch(
          `/api/rfps/${rfpId}/requirements/bulk-update-flags`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates: flagUpdates }),
          }
        );

        if (!flagResponse.ok) {
          const error = await flagResponse.json();
          throw new Error(
            error.error || "Failed to save mandatory/optional flags"
          );
        }
      }

      setSaveMessage({
        type: "success",
        text: "✓ All changes saved successfully!",
      });
      // Reset initial metadata to reflect saved state
      setInitialMetadata(JSON.parse(JSON.stringify(requirementMetadata)));
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Error saving tags:", err);
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving tags",
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Structure Editing Handlers ---

  const handleCheckboxChange = (nodeId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(nodeId);
    } else {
      newSelected.delete(nodeId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set<string>();
      const traverse = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          allIds.add(node.id);
          if (node.children) traverse(node.children);
        });
      };
      traverse(data);
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleMoveNode = (nodeId: string, direction: "up" | "down") => {
    const newData = [...data];

    // Recursive function to find and reorder
    const reorder = (nodes: TreeNode[]): boolean => {
      const index = nodes.findIndex((n) => n.id === nodeId);
      if (index !== -1) {
        if (direction === "up" && index > 0) {
          [nodes[index], nodes[index - 1]] = [nodes[index - 1], nodes[index]];
          return true;
        }
        if (direction === "down" && index < nodes.length - 1) {
          [nodes[index], nodes[index + 1]] = [nodes[index + 1], nodes[index]];
          return true;
        }
        return false; // Can't move
      }

      for (const node of nodes) {
        if (node.children && reorder(node.children)) return true;
      }
      return false;
    };

    if (reorder(newData)) {
      setData(newData);
    }
  };

  const handleMoveTo = (nodeId: string) => {
    setMoveTargetNodeIds([nodeId]);
    setIsMoveDialogOpen(true);
  };

  const handleMoveSelected = () => {
    if (selectedIds.size === 0) return;
    setMoveTargetNodeIds(Array.from(selectedIds));
    setIsMoveDialogOpen(true);
  };

  const handleMoveConfirm = (targetCategoryId: string | null) => {
    const newData = [...data];
    const nodesToMove: TreeNode[] = [];

    // 1. Remove nodes from their current locations
    const removeNodes = (nodes: TreeNode[]) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (moveTargetNodeIds.includes(node.id)) {
          nodesToMove.push(node);
          nodes.splice(i, 1);
        } else if (node.children) {
          removeNodes(node.children);
        }
      }
    };
    removeNodes(newData);

    // 2. Add nodes to the target location
    if (targetCategoryId === null) {
      // Move to root
      newData.push(...nodesToMove);
    } else {
      const addToTarget = (nodes: TreeNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === targetCategoryId) {
            node.children = [...(node.children || []), ...nodesToMove];
            // Ensure target is expanded to show moved items
            setExpandedNodeIds((prev) => new Set(prev).add(targetCategoryId));
            return true;
          }
          if (node.children && addToTarget(node.children)) return true;
        }
        return false;
      };
      addToTarget(newData);
    }

    setData(newData);
    setSelectedIds(new Set()); // Clear selection after move
  };

  const handleAddCategory = (parentId: string | null) => {
    const newCategory: TreeNode = {
      id: uuidv4(),
      type: "category",
      code: "NEW",
      title: "Nouvelle catégorie",
      level: 0, // Will be recalculated or ignored by UI for now
      children: [],
    };

    const newData = [...data];
    if (parentId === null) {
      newData.push(newCategory);
    } else {
      const addToParent = (nodes: TreeNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === parentId) {
            node.children = [...(node.children || []), newCategory];
            setExpandedNodeIds((prev) => new Set(prev).add(parentId));
            return true;
          }
          if (node.children && addToParent(node.children)) return true;
        }
        return false;
      };
      addToParent(newData);
    }
    setData(newData);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer cet élément et ses enfants ?"
      )
    )
      return;

    const newData = [...data];
    const deleteRecursive = (nodes: TreeNode[]): boolean => {
      const index = nodes.findIndex((n) => n.id === nodeId);
      if (index !== -1) {
        nodes.splice(index, 1);
        return true;
      }
      for (const node of nodes) {
        if (node.children && deleteRecursive(node.children)) return true;
      }
      return false;
    };

    if (deleteRecursive(newData)) {
      setData(newData);
      // Remove from selection if deleted
      if (selectedIds.has(nodeId)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(nodeId);
        setSelectedIds(newSelected);
      }
    }
  };

  const renderRows = (
    items: TreeNode[],
    level: number = 0
  ): React.ReactNode[] => {
    return items.map((node, index) => [
      <TableRow
        key={node.id}
        className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
      >
        {/* Checkbox for selection (Edit Mode) */}
        {isEditing && (
          <TableCell className="w-[40px] px-2">
            <Checkbox
              checked={selectedIds.has(node.id)}
              onCheckedChange={(checked) =>
                handleCheckboxChange(node.id, checked as boolean)
              }
            />
          </TableCell>
        )}

        <TableCell className="py-3">
          <div
            style={{ paddingLeft: `${level * 24}px` }}
            className="flex items-center gap-2"
          >
            {node.children && node.children.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleNodeExpanded(node.id)}
              >
                {expandedNodeIds.has(node.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {!node.children && <div className="h-6 w-6" />}
            <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
              {node.code}
            </span>
            {node.type === "requirement" && peerReviewEnabled && (
              <PeerReviewBadge
                status={reviewStatuses.get(node.id)?.status ?? "draft"}
                size="sm"
                iconOnly
              />
            )}
            <span className="font-medium">{node.title}</span>
            {node.type === "requirement" && node.description && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span className="sr-only">Description</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {node.description}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </TableCell>

        {/* Optional Checkbox - Only for requirements */}
        <TableCell className="w-20 text-center">
          {node.type === "requirement" && (
            <input
              type="checkbox"
              checked={requirementMetadata[node.id]?.isOptional || false}
              onChange={() => toggleCheckbox(node.id, "isOptional")}
              className="h-4 w-4 rounded cursor-pointer"
            />
          )}
        </TableCell>

        {/* Mandatory Checkbox - Only for requirements */}
        <TableCell className="w-20 text-center">
          {node.type === "requirement" && (
            <input
              type="checkbox"
              checked={requirementMetadata[node.id]?.isMandatory || false}
              onChange={() => toggleCheckbox(node.id, "isMandatory")}
              className="h-4 w-4 rounded cursor-pointer"
            />
          )}
        </TableCell>

        {/* Tags Display - Different for categories vs requirements */}
        <TableCell className="py-3">
          <div className="flex flex-wrap gap-1 items-center">
            {node.type === "requirement" &&
              (requirementMetadata[node.id]?.tags || []).map((tag) => (
                <div
                  key={tag.id}
                  className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                    aria-hidden="true"
                  />
                  {tag.name}
                  <button
                    onClick={() => toggleTag(node.id, tag)}
                    className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:text-red-600 dark:hover:text-red-400"
                    title="Remove tag"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            {node.type === "requirement" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs ml-1"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add Tags to {node.code}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tags.map((tag) => {
                      const isSelected =
                        requirementMetadata[node.id]?.tags.some(
                          (t) => t.id === tag.id
                        ) || false;
                      return (
                        <label
                          key={tag.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTag(node.id, tag)}
                            className="h-4 w-4 rounded"
                          />
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: tag.color || "#6B7280",
                            }}
                            aria-hidden="true"
                          />
                          <span className="text-sm">{tag.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {node.type === "category" && (
              <CategoryTagDialog
                node={node}
                tags={tags}
                onApply={(selectedTagIds) => {
                  const selectedTags = tags.filter((t) =>
                    selectedTagIds.has(t.id)
                  );
                  applyTagsToCategory(node.id, selectedTags);
                }}
              />
            )}
          </div>
        </TableCell>

        {/* Actions Menu (Edit Mode) */}
        {isEditing && (
          <TableCell className="w-[50px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleMoveNode(node.id, "up")}
                  disabled={index === 0}
                >
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Monter
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleMoveNode(node.id, "down")}
                  disabled={index === items.length - 1}
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Descendre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoveTo(node.id)}>
                  <FolderInput className="mr-2 h-4 w-4" />
                  Déplacer vers...
                </DropdownMenuItem>
                {node.type === "category" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAddCategory(node.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter sous-catégorie
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteNode(node.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>,
      ...(expandedNodeIds.has(node.id) && node.children
        ? renderRows(node.children, level + 1)
        : []),
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">
          Chargement des exigences...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 text-sm flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {saveMessage && (
        <div
          className={`fixed bottom-6 right-6 p-4 rounded-xl text-sm flex gap-3 shadow-lg border animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            saveMessage.type === "success"
              ? "bg-green-50 dark:bg-green-950/80 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800"
          }`}
        >
          {saveMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{saveMessage.text}</span>
        </div>
      )}

      {/* Tags Management Card - Collapsible */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <button
          onClick={() => setShowTagsManager(!showTagsManager)}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Tags
          </h3>
          {showTagsManager ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>

        {showTagsManager && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-6 space-y-4">
            {/* Create New Tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Tag name (e.g., Security)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTag()}
              />
              <div className="flex gap-1">
                {TAG_COLORS.slice(0, 5).map((color, idx) => (
                  <button
                    key={color}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      selectedColorIndex === idx
                        ? "border-slate-900 dark:border-white scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColorIndex(idx)}
                    title={`Select color ${idx + 1}`}
                  />
                ))}
              </div>
              <Button onClick={addTag} disabled={!newTagName.trim()} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Existing Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: tag.color || "#6B7280" }}
                      aria-hidden="true"
                    />
                    {tag.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                      onClick={() => removeTag(tag.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCollapseAll}
          className="gap-2"
        >
          <ChevronDown className="h-4 w-4" />
          Condenser
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExpandAll}
          className="gap-2"
        >
          <ChevronUp className="h-4 w-4" />
          Étendre
        </Button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

        <Button
          variant={isEditing ? "secondary" : "outline"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="gap-2"
        >
          {isEditing ? (
            <X className="h-4 w-4" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
          {isEditing ? "Quitter mode édition" : "Modifier structure"}
        </Button>

        {isEditing && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddCategory(null)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter catégorie
            </Button>

            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMoveSelected}
                className="gap-2"
              >
                <FolderInput className="h-4 w-4" />
                Déplacer sélection ({selectedIds.size})
              </Button>
            )}
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 ml-auto"
        >
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* Requirements Tree with Checkboxes */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="p-6 space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  {isEditing && (
                    <TableHead className="w-[40px] px-2">
                      <Checkbox
                        checked={
                          data.length > 0 &&
                          selectedIds.size ===
                            (() => {
                              let count = 0;
                              const countNodes = (nodes: TreeNode[]) => {
                                nodes.forEach((n) => {
                                  count++;
                                  if (n.children) countNodes(n.children);
                                });
                              };
                              countNodes(data);
                              return count;
                            })()
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(checked as boolean)
                        }
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-left">Requirement</TableHead>
                  <TableHead className="w-20 text-center text-xs">
                    Optional
                  </TableHead>
                  <TableHead className="w-20 text-center text-xs">
                    Mandatory
                  </TableHead>
                  <TableHead className="text-left">Tags</TableHead>
                  {isEditing && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows(data)}</TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Unsaved Changes Modal */}
      <Dialog open={showUnsavedModal} onOpenChange={setShowUnsavedModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <DialogTitle>Unsaved Changes</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You have unsaved changes to tags and requirements. Do you want to
            save them before leaving?
          </p>
          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowUnsavedModal(false);
                if (pendingNavigation) {
                  setPendingNavigation(null);
                }
              }}
            >
              Discard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowUnsavedModal(false);
                handleSave().then(() => {
                  if (pendingNavigation) {
                    // Navigate after save
                    window.location.href = pendingNavigation;
                  }
                });
              }}
            >
              Save First
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowUnsavedModal(false);
                if (pendingNavigation) {
                  window.location.href = pendingNavigation;
                }
              }}
            >
              Leave Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MoveToDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        data={data}
        onMove={handleMoveConfirm}
        sourceNodeIds={moveTargetNodeIds}
      />
    </div>
  );
}
