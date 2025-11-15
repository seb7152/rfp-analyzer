"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Tag,
  AlertCircle,
  Save,
  Loader2,
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
          throw new Error(`Error ${treeResponse.status}: ${treeResponse.statusText}`);
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

  const renderRows = (items: TreeNode[], level: number = 0): React.ReactNode[] => {
    return items.map((node) => [
      <TableRow key={node.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
        <TableCell className="py-3">
          <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center gap-2">
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

        {/* Optional Checkbox */}
        {node.type === "requirement" && (
          <TableCell className="w-24 text-center">
            <input
              type="checkbox"
              checked={requirementMetadata[node.id]?.isOptional || false}
              onChange={() => toggleCheckbox(node.id, "isOptional")}
              className="h-4 w-4 rounded cursor-pointer"
            />
          </TableCell>
        )}

        {/* Mandatory Checkbox */}
        {node.type === "requirement" && (
          <TableCell className="w-24 text-center">
            <input
              type="checkbox"
              checked={requirementMetadata[node.id]?.isMandatory || false}
              onChange={() => toggleCheckbox(node.id, "isMandatory")}
              className="h-4 w-4 rounded cursor-pointer"
            />
          </TableCell>
        )}

        {/* Tags Display */}
        {node.type === "requirement" && (
          <TableCell className="flex flex-wrap gap-2">
            {(requirementMetadata[node.id]?.tags || []).map((tag) => (
              <Badge
                key={tag.id}
                style={{ backgroundColor: tag.color || "#6B7280" }}
                className="text-white text-xs cursor-pointer hover:opacity-80"
              >
                {tag.name}
              </Badge>
            ))}
            {node.type === "requirement" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add Tags to {node.code}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
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
                          <Badge
                            style={{
                              backgroundColor: tag.color || "#6B7280",
                            }}
                            className="text-white text-xs"
                          >
                            {tag.name}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TableCell>
        )}
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

      {/* Tags Management Card */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Tags
          </h3>

          {/* Create New Tag */}
          <div className="flex gap-2">
            <Input
              placeholder="Tag name (e.g., Security)"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTag()}
            />
            <div className="flex gap-1">
              {TAG_COLORS.map((color, idx) => (
                <button
                  key={color}
                  className={`h-10 w-10 rounded border-2 ${
                    selectedColorIndex === idx
                      ? "border-slate-900 dark:border-white"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColorIndex(idx)}
                  title={`Select color ${idx + 1}`}
                />
              ))}
            </div>
            <Button onClick={addTag} disabled={!newTagName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Tag
            </Button>
          </div>

          {/* Existing Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2"
                >
                  <Badge
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                    className="text-white text-xs"
                  >
                    {tag.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => removeTag(tag.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Requirements Tree with Checkboxes */}
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="p-6 space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="text-left">Requirement</TableHead>
                  <TableHead className="w-24 text-center">Optional</TableHead>
                  <TableHead className="w-24 text-center">Mandatory</TableHead>
                  <TableHead className="text-left">Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderRows(data)}
              </TableBody>
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
