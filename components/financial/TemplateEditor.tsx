"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { AddLineModal } from "./AddLineModal";
import { EditLineModal } from "./EditLineModal";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FinancialTemplateLine,
  formatCurrency,
} from "@/lib/financial/calculations";

interface TemplateEditorProps {
  templateId: string;
  lines: FinancialTemplateLine[];
  onLineAdded: (line: FinancialTemplateLine) => void;
  onLineUpdated: (line: FinancialTemplateLine) => void;
  onLineDeleted: (lineId: string) => void;
}

interface LineTreeNode extends FinancialTemplateLine {
  children: LineTreeNode[];
  level: number;
}

export function TemplateEditor({
  templateId,
  lines,
  onLineAdded,
  onLineUpdated,
  onLineDeleted,
}: TemplateEditorProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] =
    useState<FinancialTemplateLine | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedParentLine, setSelectedParentLine] =
    useState<FinancialTemplateLine | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Build tree structure
  const buildTree = (
    items: FinancialTemplateLine[],
    parentId: string | null = null,
    level: number = 0
  ): LineTreeNode[] => {
    return items
      .filter((item) => item.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        ...item,
        children: buildTree(items, item.id, level + 1),
        level,
      }));
  };

  const treeData = buildTree(lines);

  const toggleExpand = (lineId: string) => {
    setExpandedLines((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) {
        newSet.delete(lineId);
      } else {
        newSet.add(lineId);
      }
      return newSet;
    });
  };

  const handleAddRootLine = () => {
    setSelectedParentId(null);
    setSelectedParentLine(null);
    setIsAddModalOpen(true);
  };

  const handleAddChildLine = (parentId: string) => {
    const parentLine = lines.find((l) => l.id === parentId) || null;
    setSelectedParentId(parentId);
    setSelectedParentLine(parentLine);
    setIsAddModalOpen(true);
  };

  const handleEditLine = (line: FinancialTemplateLine) => {
    setSelectedLine(line);
    setIsEditModalOpen(true);
  };

  const handleDeleteLine = (lineId: string) => {
    setLineToDelete(lineId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLine = async () => {
    if (!lineToDelete) return;

    try {
      const response = await fetch(
        `/api/financial-template-lines/${lineToDelete}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete line");
      }

      toast({
        title: "Succès",
        description: data.message || "Ligne supprimée avec succès",
      });

      onLineDeleted(lineToDelete);
    } catch (error) {
      console.error("Error deleting line:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Échec de la suppression",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setLineToDelete(null);
    }
  };

  const handleMoveLine = async (
    line: FinancialTemplateLine,
    direction: "up" | "down"
  ) => {
    // Find siblings
    const siblings = lines
      .filter((l) => l.parent_id === line.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);

    const currentIndex = siblings.findIndex((l) => l.id === line.id);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetSibling = siblings[targetIndex];

    // Calculate new sort orders
    // Default to swap
    let newOrderCurrent = targetSibling.sort_order;
    let newOrderTarget = line.sort_order;

    // Handle collision (identical sort_orders)
    if (newOrderCurrent === newOrderTarget) {
      if (direction === "up") {
        // Current needs to be smaller than Target
        newOrderCurrent = newOrderTarget - 1;
        // Target can stay same (or we could +1 it to be safe, but let's minimize change)
      } else {
        // Current needs to be larger than Target
        newOrderCurrent = newOrderTarget + 1;
      }
    }

    try {
      const updateCurrent = fetch(`/api/financial-template-lines/${line.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: newOrderCurrent }),
      });

      const updateTarget = fetch(
        `/api/financial-template-lines/${targetSibling.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: newOrderTarget }),
        }
      );

      const [resCurrent, resTarget] = await Promise.all([
        updateCurrent,
        updateTarget,
      ]);

      if (!resCurrent.ok || !resTarget.ok) {
        throw new Error("Failed to reorder lines");
      }

      const dataCurrent = await resCurrent.json();
      const dataTarget = await resTarget.json();

      // Update local state
      onLineUpdated(dataCurrent.line);
      onLineUpdated(dataTarget.line);

      toast({
        title: "Succès",
        description: "Ordre modifié",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error moving line:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'ordre",
        variant: "destructive",
      });
    }
  };

  const expandAll = () => {
    const allIds = new Set(lines.map((line) => line.id));
    setExpandedLines(allIds);
  };

  const collapseAll = () => {
    setExpandedLines(new Set());
  };

  const renderLine = (node: LineTreeNode) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedLines.has(node.id);
    const indentLevel = node.level * 20;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-3 px-4 hover:bg-gray-50 border-b"
          style={{ paddingLeft: `${indentLevel + 16}px` }}
        >
          {/* Expand/Collapse icon */}
          <div className="w-6 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="hover:bg-gray-200 rounded p-1"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>

          {/* Folder icon */}
          <div className="w-5">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-amber-500" />
              ) : (
                <Folder className="h-4 w-4 text-amber-500" />
              )
            ) : null}
          </div>

          {/* Line code */}
          <code className="text-sm font-mono text-gray-600 w-32">
            {node.line_code}
          </code>

          {/* Line name */}
          <div className="flex-1 font-medium">{node.name}</div>

          {/* Line type badge */}
          <Badge
            className={
              node.line_type === "setup"
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
            }
          >
            {node.line_type === "setup" ? "Setup" : "Récurrent"}
            {node.recurrence_type &&
              ` (${node.recurrence_type === "monthly" ? "mensuel" : "annuel"})`}
          </Badge>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Reordering */}
            <div className="flex items-center mr-2 bg-gray-50 rounded-md border border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleMoveLine(node, "up")}
                disabled={(() => {
                  const siblings = lines
                    .filter((l) => l.parent_id === node.parent_id)
                    .sort((a, b) => a.sort_order - b.sort_order);
                  return siblings[0]?.id === node.id;
                })()}
                title="Monter"
              >
                <ArrowUp className="h-3 w-3 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleMoveLine(node, "down")}
                disabled={(() => {
                  const siblings = lines
                    .filter((l) => l.parent_id === node.parent_id)
                    .sort((a, b) => a.sort_order - b.sort_order);
                  return siblings[siblings.length - 1]?.id === node.id;
                })()}
                title="Descendre"
              >
                <ArrowDown className="h-3 w-3 text-gray-500" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddChildLine(node.id)}
              title="Ajouter une ligne fille"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditLine(node)}
              title="Modifier"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteLine(node.id)}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren &&
          isExpanded &&
          node.children.map((child) => renderLine(child))}
      </div>
    );
  };

  const handleLineAddedInternal = (line: FinancialTemplateLine) => {
    onLineAdded(line);
    // Auto-expand parent if the new line is a child
    if (line.parent_id) {
      setExpandedLines((prev) => {
        const newSet = new Set(prev);
        newSet.add(line.parent_id!);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Structure du template</CardTitle>
              <CardDescription>
                Gérez les lignes de coûts et la hiérarchie de votre template
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Tout déplier
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Tout replier
              </Button>
              <Button onClick={handleAddRootLine}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une ligne racine
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lines.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="mb-4">Aucune ligne dans le template</p>
              <Button onClick={handleAddRootLine} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter votre première ligne
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {treeData.map((node) => renderLine(node))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Line Modal */}
      <AddLineModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedParentId(null);
          setSelectedParentLine(null);
        }}
        templateId={templateId}
        parentId={selectedParentId}
        parentLine={selectedParentLine}
        onLineAdded={handleLineAddedInternal}
      />

      {/* Edit Line Modal */}
      {selectedLine && (
        <EditLineModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedLine(null);
          }}
          line={selectedLine}
          allLines={lines}
          onLineUpdated={onLineUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette ligne ? Si la ligne a des
              enfants ou des valeurs associées, elle sera désactivée (soft
              delete). Sinon, elle sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLine}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
