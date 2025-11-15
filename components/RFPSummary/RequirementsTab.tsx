"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Tag,
  AlertCircle,
  Save,
  Loader2,
  ChevronUp,
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

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
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

export function RequirementsTab({ rfpId }: RequirementsTabProps) {
  const [data, setData] = useState<TreeNode[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requirementMetadata, setRequirementMetadata] =
    useState<RequirementMetadata>({});
  const [tags, setTags] = useState<TagData[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showTagsManager, setShowTagsManager] = useState(false);

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
            `Error ${treeResponse.status}: ${treeResponse.statusText}`,
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
                isOptional: false,
                isMandatory: false,
              };
            }
            if (node.children) {
              initializeMetadata(node.children);
            }
          }
        }
        initializeMetadata(treeData || []);
        setRequirementMetadata(metadata);

        // Load default tags
        setTags(DEFAULT_TAGS.map((tag, idx) => ({ id: `tag-${idx}`, ...tag })));
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

      return {
        ...prev,
        [requirementId]: { ...current, tags: newTags },
      };
    });
  };

  const toggleCheckbox = (
    requirementId: string,
    field: "isOptional" | "isMandatory",
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

  const addTag = () => {
    if (!newTagName.trim()) return;

    const newTag = {
      id: `tag-${Date.now()}`,
      name: newTagName,
      color: TAG_COLORS[selectedColorIndex % TAG_COLORS.length],
    };

    setTags([...tags, newTag]);
    setNewTagName("");
    setSelectedColorIndex((prev) => (prev + 1) % TAG_COLORS.length);
  };

  const removeTag = (tagId: string) => {
    setTags(tags.filter((t) => t.id !== tagId));
    // Also remove from all requirements
    setRequirementMetadata((prev) => {
      const updated = { ...prev };
      for (const reqId in updated) {
        updated[reqId].tags = updated[reqId].tags.filter((t) => t.id !== tagId);
      }
      return updated;
    });
  };

  // Get all requirements under a category (cascade)
  const getChildRequirements = (nodeId: string, nodes: TreeNode[] = data): string[] => {
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

      // Save metadata (in a real implementation, this would save to the database)
      // For now, we'll just store it in localStorage for demo purposes
      localStorage.setItem(
        `requirement-metadata-${rfpId}`,
        JSON.stringify({ tags, requirementMetadata }),
      );

      setSaveMessage({
        type: "success",
        text: "Metadata saved successfully!",
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Error saving metadata:", err);
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving metadata",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderRows = (
    items: TreeNode[],
    level: number = 0,
  ): React.ReactNode[] => {
    return items.map((node) => [
      <TableRow
        key={node.id}
        className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
      >
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
            <span className="font-medium">{node.title}</span>
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
            {node.type === "requirement" && (requirementMetadata[node.id]?.tags || []).map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color || "#6B7280" }}
                  aria-hidden="true"
                />
                {tag.name}
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
                          (t) => t.id === tag.id,
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
                    selectedTagIds.has(t.id),
                  );
                  applyTagsToCategory(node.id, selectedTags);
                }}
              />
            )}
          </div>
        </TableCell>
      </TableRow>,
      ...(expandedNodeIds.has(node.id) && node.children
        ? renderRows(node.children, level + 1)
        : []),
    ]);
  };

  if (loading) {
    return <div className="p-4">Loading requirements...</div>;
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
          className={`p-3 rounded-lg text-sm flex gap-2 ${
            saveMessage.type === "success"
              ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200"
              : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200"
          }`}
        >
          {saveMessage.text}
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

      {/* Requirements Tree with Checkboxes */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="p-6 space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="text-left">Requirement</TableHead>
                  <TableHead className="w-20 text-center text-xs">
                    Optional
                  </TableHead>
                  <TableHead className="w-20 text-center text-xs">
                    Mandatory
                  </TableHead>
                  <TableHead className="text-left">Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows(data)}</TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        size="lg"
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
}
