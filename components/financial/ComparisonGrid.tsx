"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Save,
  Undo,
  ChevronsDown,
  ChevronsUp,
  Eye,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FinancialTemplateLine,
  LineWithValues,
  buildLineTree,
} from "@/lib/financial/calculations";
import { FinancialOfferValue } from "@/types/financial";
import {
  useFinancialVersions,
  useFinancialValues,
  useBatchUpdateFinancialValues,
  useCreateFinancialVersion,
} from "@/hooks/use-financial-data";
import { CellWithComment } from "./CellWithComment";
import { SupplierColumnHeader } from "./SupplierColumnHeader";
import { CreateVersionModal } from "./CreateVersionModal";
import { SaveVersionModal } from "./SaveVersionModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface ComparisonGridProps {
  rfpId: string;
  templateLines: FinancialTemplateLine[];
  suppliers: { id: string; name: string }[];
  tcoPeriod: number; // US-3: Added TCO period
  selectedVersions?: Map<string, string>; // supplierId -> versionId
  onVersionChange?: (supplierId: string, versionId: string) => void;
}

interface EditState {
  versionId: string;
  values: Map<string, Partial<FinancialOfferValue>>; // template_line_id -> value
  history: Map<string, Partial<FinancialOfferValue>>[];
  historyIndex: number;
}

export function ComparisonGrid({
  rfpId,
  templateLines,
  suppliers,
  tcoPeriod,
  selectedVersions: externalSelectedVersions,
  onVersionChange,
}: ComparisonGridProps) {
  // Authentication
  const { user } = useAuth();
  const currentUserId = user?.id || "";

  // Data Fetching
  const { data: versions = [] } = useFinancialVersions(rfpId);
  const { data: remoteValues = [] } = useFinancialValues(rfpId, "comparison");

  // Local State
  const [internalSelectedVersions, setInternalSelectedVersions] = useState<
    Map<string, string>
  >(new Map()); // supplierId -> versionId

  // Use external state if provided, otherwise internal
  const selectedVersions = externalSelectedVersions || internalSelectedVersions;

  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  // Modals
  const [createVersionModal, setCreateVersionModal] = useState<{
    isOpen: boolean;
    supplierId: string;
    supplierName: string;
  }>({
    isOpen: false,
    supplierId: "",
    supplierName: "",
  });
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Mutations
  const { mutate: batchUpdate, isLoading: isSaving } =
    useBatchUpdateFinancialValues();
  const { mutate: createVersion, isLoading: isCreating } =
    useCreateFinancialVersion(rfpId);

  // Initialize selected versions (most recent by default)
  useEffect(() => {
    // Only auto-select if NOT controlled externally (or if external map is empty and we want to help?)
    // If controlled, parent should handle initialization via preferences.
    if (externalSelectedVersions) return;

    if (versions.length > 0) {
      const newSelection = new Map(internalSelectedVersions);
      let changed = false;
      suppliers.forEach((s) => {
        if (!newSelection.has(s.id)) {
          const supplierVersions = versions.filter(
            (v) => v.supplier_id === s.id
          );
          if (supplierVersions.length > 0) {
            newSelection.set(s.id, supplierVersions[0].id); // First is most recent due to order
            changed = true;
          }
        }
      });
      if (changed) setInternalSelectedVersions(newSelection);
    }
  }, [versions, suppliers, externalSelectedVersions, internalSelectedVersions]);

  // Expand all lines by default
  useEffect(() => {
    if (templateLines.length > 0 && expandedLines.size === 0) {
      const allIds = new Set(templateLines.map((l) => l.id));
      setExpandedLines(allIds);
    }
  }, [templateLines]);

  // Prepare Data for Render
  const activeVersions = useMemo(() => {
    return suppliers.map((s) => {
      const versionId = selectedVersions.get(s.id);
      const version = versions.find((v) => v.id === versionId);
      return { supplier: s, version };
    });
  }, [suppliers, selectedVersions, versions]);

  // Derived Values map (merge remote and local edits)
  const currentValuesMap = useMemo(() => {
    // Start with remote values
    // Map: versionId -> templateLineId -> Value
    const map = new Map<string, Map<string, FinancialOfferValue>>();

    // Index remote values
    remoteValues.forEach((v) => {
      if (!map.has(v.version_id)) map.set(v.version_id, new Map());
      map.get(v.version_id)!.set(v.template_line_id, v);
    });

    // Apply local edits if editing
    if (editingVersionId && editState) {
      const editingMap =
        map.get(editingVersionId) || new Map<string, FinancialOfferValue>();
      editState.values.forEach((val, lineId) => {
        const existing = editingMap.get(lineId);
        // Create a merged object
        const merged: FinancialOfferValue = {
          id: existing?.id || "temp",
          version_id: editingVersionId,
          template_line_id: lineId,
          setup_cost:
            val.setup_cost !== undefined
              ? val.setup_cost
              : (existing?.setup_cost ?? null),
          recurrent_cost:
            val.recurrent_cost !== undefined
              ? val.recurrent_cost
              : (existing?.recurrent_cost ?? null),
          quantity:
            val.quantity !== undefined
              ? val.quantity
              : (existing?.quantity ?? 1),
          created_at: existing?.created_at || "",
          updated_at: existing?.updated_at || "",
        };
        editingMap.set(lineId, merged);
      });
      map.set(editingVersionId, editingMap);
    }

    return map;
  }, [remoteValues, editState, editingVersionId]);

  const handleToggleExpand = (lineId: string) => {
    const newSet = new Set(expandedLines);
    if (newSet.has(lineId)) newSet.delete(lineId);
    else newSet.add(lineId);
    setExpandedLines(newSet);
  };

  const handleVersionChange = (supplierId: string, versionId: string) => {
    if (onVersionChange) {
      onVersionChange(supplierId, versionId);
    } else {
      const newMap = new Map(internalSelectedVersions);
      newMap.set(supplierId, versionId);
      setInternalSelectedVersions(newMap);
    }
  };

  const handleStartEdit = (versionId: string) => {
    setEditingVersionId(versionId);
    setEditState({
      versionId,
      values: new Map(),
      history: [],
      historyIndex: -1,
    });
  };

  const handleCancelEdit = () => {
    if (editState && editState.values.size > 0) {
      if (
        !confirm(
          "Vous avez des modifications non sauvegardées. Voulez-vous vraiment annuler ?"
        )
      )
        return;
    }
    setEditingVersionId(null);
    setEditState(null);
  };

  const handleCellValueChange = (
    lineId: string,
    field: "setup_cost" | "recurrent_cost",
    value: number | null
  ) => {
    if (!editState || !editingVersionId) return;

    // Push to history
    const newHistory = editState.history.slice(0, editState.historyIndex + 1);
    newHistory.push(new Map(editState.values));

    // Update value
    const newValues = new Map(editState.values);
    const lineVal = newValues.get(lineId) || {};
    newValues.set(lineId, { ...lineVal, [field]: value });

    setEditState({
      ...editState,
      values: newValues,
      history: newHistory,
      historyIndex: newHistory.length,
    });
  };

  const handleUndo = () => {
    if (!editState || editState.historyIndex < 0) return;

    const prevValues = editState.history[editState.historyIndex];
    setEditState({
      ...editState,
      values: prevValues,
      historyIndex: editState.historyIndex - 1,
    });
  };

  const expandAll = () => {
    const allIds = new Set(templateLines.map((l) => l.id));
    setExpandedLines(allIds);
  };

  const collapseAll = () => {
    setExpandedLines(new Set());
  };

  const onSaveConfirm = (versionName: string, mode: "new" | "replace") => {
    if (!editState) return;

    const valuesToSave = Array.from(editState.values.entries()).map(
      ([lineId, val]) => ({
        template_line_id: lineId,
        ...val,
      })
    );

    if (valuesToSave.length === 0) {
      toast.info("Aucune modification à sauvegarder");
      setEditingVersionId(null);
      setEditState(null);
      setSaveModalOpen(false);
      return;
    }

    const handleBatchUpdate = (targetVersionId: string) => {
      batchUpdate(
        { versionId: targetVersionId, values: valuesToSave },
        {
          onSuccess: () => {
            toast.success("Modifications sauvegardées");
            setEditingVersionId(null);
            setEditState(null);
            setSaveModalOpen(false);
          },
          onError: (err: unknown) => {
            toast.error(
              "Erreur lors de la sauvegarde: " +
              (err instanceof Error ? err.message : "Erreur inconnue")
            );
          },
        }
      );
    };

    if (mode === "new") {
      // Find current supplier
      const currentVersion = versions.find((v) => v.id === editingVersionId);
      if (!currentVersion) {
        toast.error("Impossible de retrouver la version source");
        return;
      }

      createVersion(
        {
          supplierId: currentVersion.supplier_id,
          versionName: versionName,
          versionDate: new Date().toISOString(),
        },
        {
          onSuccess: (response) => {
            // response.version is the new version object
            const newVersionId = response.version.id;

            // Auto-select the new version in the grid
            if (onVersionChange) {
              onVersionChange(currentVersion.supplier_id, newVersionId);
            }
            // Update internal state as fallback
            setInternalSelectedVersions(prev => {
              const map = new Map(prev);
              map.set(currentVersion.supplier_id, newVersionId);
              return map;
            });

            // Proceed to save values to this new version
            // Merge existing values (from source version) with new edits
            const sourceValues = remoteValues.filter(v => v.version_id === editingVersionId);
            const mergedValuesMap = new Map<string, Partial<FinancialOfferValue>>();

            // 1. Populate with existing source values
            sourceValues.forEach(v => {
              mergedValuesMap.set(v.template_line_id, {
                setup_cost: v.setup_cost,
                recurrent_cost: v.recurrent_cost,
                quantity: v.quantity
              });
            });

            // 2. Overwrite with edits
            if (editState) {
              editState.values.forEach((val, lineId) => {
                const existing = mergedValuesMap.get(lineId) || {};
                mergedValuesMap.set(lineId, { ...existing, ...val });
              });
            }

            const fullValuesToSave = Array.from(mergedValuesMap.entries()).map(([lineId, val]) => ({
              template_line_id: lineId,
              ...val
            }));

            // Use batchUpdate to save the FULL set of values to the new version
            batchUpdate(
              { versionId: newVersionId, values: fullValuesToSave },
              {
                onSuccess: () => {
                  toast.success("Version créée avec copie des valeurs");
                  setEditingVersionId(null);
                  setEditState(null);
                  setSaveModalOpen(false);
                },
                onError: (err: unknown) => {
                  toast.error("Erreur lors de la copie des valeurs: " + (err instanceof Error ? err.message : "Erreur inconnue"));
                }
              }
            );
          },
          onError: (err: any) => {
            toast.error("Erreur lors de la création de la version: " + err.message);
          },
        }
      );
    } else {
      // Replace mode
      handleBatchUpdate(editingVersionId!);
    }
  };

  // Helper to calculate total value recursively for a line (setup or recurrent)
  const calculateLineTotal = (
    line: LineWithValues,
    valuesMap: Map<string, Map<string, FinancialOfferValue>>,
    versionId: string | undefined,
    type: "setup" | "recurrent"
  ): number | null => {
    if (!versionId) return null;

    // If leaf node, return direct value
    if (!line.children || line.children.length === 0) {
      const val = valuesMap.get(versionId)?.get(line.id);
      if (!val) return null;
      return type === "setup"
        ? (val.setup_cost ?? 0)
        : (val.recurrent_cost ?? 0);
    }

    // If has children, sum them up
    let total = 0;
    let hasValue = false;

    for (const child of line.children) {
      const childTotal = calculateLineTotal(child, valuesMap, versionId, type);
      if (childTotal !== null) {
        total += childTotal;
        hasValue = true;
      }
    }

    return hasValue ? total : null;
  };

  // Processing tree
  const tree = useMemo(() => buildLineTree(templateLines), [templateLines]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2 mt-2 px-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="text-xs text-slate-500 hover:text-slate-900 h-8"
          >
            <ChevronsDown className="h-3.5 w-3.5 mr-1.5" />
            Déplier tout
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="text-xs text-slate-500 hover:text-slate-900 h-8"
          >
            <ChevronsUp className="h-3.5 w-3.5 mr-1.5" />
            Replier tout
          </Button>
        </div>

        <div className="flex items-center gap-2 pr-2">
          {activeVersions.length > 1 && (
            <Button
              variant={isAnalysisMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsAnalysisMode(!isAnalysisMode)}
              className={cn(
                "h-8 text-xs font-medium transition-colors",
                isAnalysisMode
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
                  : "text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {isAnalysisMode ? "Mode Analyse actif" : "Mode Analyse"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-md">
        <Table className="relative w-full min-w-[max-content]">
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[300px] min-w-[300px] pl-4 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">
                Ligne de coût
              </TableHead>
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-slate-500">
                Type
              </TableHead>
              {activeVersions.map(({ supplier, version }) => (
                <TableHead
                  key={supplier.id}
                  className="min-w-[180px] p-0 align-top border-l bg-gray-50/30"
                >
                  <SupplierColumnHeader
                    supplierId={supplier.id}
                    supplierName={supplier.name}
                    versions={versions.filter(
                      (v) => v.supplier_id === supplier.id
                    )}
                    selectedVersionId={version?.id || ""}
                    onVersionChange={(vid) =>
                      handleVersionChange(supplier.id, vid)
                    }
                    onNewVersion={() =>
                      setCreateVersionModal({
                        isOpen: true,
                        supplierId: supplier.id,
                        supplierName: supplier.name,
                      })
                    }
                    onImportVersion={() => {
                      /* TODO US-7 */
                    }}
                    onEditManual={() => version && handleStartEdit(version.id)}
                    isEditing={editingVersionId === version?.id}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderRows(
              tree,
              expandedLines,
              handleToggleExpand,
              activeVersions,
              currentValuesMap,
              editingVersionId,
              handleCellValueChange,
              calculateLineTotal,
              0,
              currentUserId,
              rfpId,
              isAnalysisMode
            )}

            {/* Totals Row */}
            <TableRow className="bg-slate-100/80 font-bold hover:bg-slate-100/80 border-t-2 border-slate-200">
              <TableCell className="pl-4 py-4">TOTAUX</TableCell>
              <TableCell className="py-4">-</TableCell>
              {activeVersions.map(({ supplier, version }) => {
                const isEditing = editingVersionId === version?.id;

                // Calculate totals
                let totalSetup = 0;
                let totalRecurrentAnnual = 0;

                if (version) {
                  const versionValues = currentValuesMap.get(version.id);
                  if (versionValues) {
                    // Iterate over lines to sum up only LEAF nodes to avoid double counting
                    templateLines.forEach((line) => {
                      const isLeaf = !templateLines.some(
                        (l) => l.parent_id === line.id
                      );
                      if (isLeaf) {
                        const val = versionValues.get(line.id);
                        if (val) {
                          const qty = Number(val.quantity ?? 1);
                          if (line.line_type === "setup") {
                            totalSetup += Number(val.setup_cost || 0) * qty;
                          } else if (line.line_type === "recurrent") {
                            let annualCost =
                              Number(val.recurrent_cost || 0) * qty;
                            if (line.recurrence_type === "monthly") {
                              annualCost *= 12;
                            }
                            totalRecurrentAnnual += annualCost;
                          }
                        }
                      }
                    });
                  }
                }

                const rawPeriod = Number(tcoPeriod);
                const safeTcoPeriod =
                  isNaN(rawPeriod) || rawPeriod <= 0 ? 3 : rawPeriod;
                const tcoTotal =
                  Number(totalSetup || 0) +
                  Number(totalRecurrentAnnual || 0) * safeTcoPeriod;

                return (
                  <TableCell
                    key={supplier.id}
                    className={cn(
                      "border-l p-4 min-w-[200px]",
                      isEditing && "bg-orange-50/50 border-orange-200"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-medium text-slate-500">
                        <span>Setup total:</span>
                        <span className="text-slate-900">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          }).format(totalSetup)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 border-b border-slate-200 pb-1">
                        <span>Récurrent total/an:</span>
                        <span className="text-slate-900">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          }).format(totalRecurrentAnnual)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[13px] font-bold text-slate-900 pt-1">
                        <span>TCO :</span>
                        <span className="text-emerald-600">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          }).format(tcoTotal)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {editingVersionId && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between z-20 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-sm text-gray-600">
              <Button
                variant="outline"
                size="icon"
                onClick={handleUndo}
                disabled={!editState || editState.historyIndex < 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <span className="self-center">
                {editState?.values.size || 0} modifications en attente
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleCancelEdit}>
              Annuler
            </Button>
            <Button
              onClick={() => setSaveModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="mr-2 h-4 w-4" /> Sauvegarder version
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateVersionModal
        isOpen={createVersionModal.isOpen}
        onClose={() =>
          setCreateVersionModal((prev) => ({ ...prev, isOpen: false }))
        }
        rfpId={rfpId}
        supplierId={createVersionModal.supplierId}
        supplierName={createVersionModal.supplierName}
      />

      <SaveVersionModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={onSaveConfirm}
        isLoading={isSaving || isCreating}
        defaultName={
          versions.find((v) => v.id === editingVersionId)?.version_name || ""
        }
      />

    </div>
  );
}

// Helper to render rows recursively
function renderRows(
  lines: LineWithValues[],
  expanded: Set<string>,
  onToggle: (id: string) => void,
  activeVersions: any[],
  valuesMap: Map<string, Map<string, FinancialOfferValue>>,
  editingVersionId: string | null,
  onCellChange: (
    lineId: string,
    field: "setup_cost" | "recurrent_cost",
    val: number | null
  ) => void,
  calculateTotal: (
    line: LineWithValues,
    map: Map<string, Map<string, FinancialOfferValue>>,
    vid: string | undefined,
    type: "setup" | "recurrent"
  ) => number | null,
  depth: number = 0,
  currentUserId: string = "",
  rfpId: string = "",
  isAnalysisMode: boolean = false
): React.ReactNode[] {
  return lines.flatMap((line) => {
    const isExpanded = expanded.has(line.id);
    const hasChildren = line.children && line.children.length > 0;

    // --- Analysis Logic ---
    let analysisMetrics = null;
    let minVersionId: string | null = null;
    let maxVersionId: string | null = null;

    if (isAnalysisMode && !hasChildren && activeVersions.length > 1) {
      // Collect values for this line across all active versions
      const lineValues: { versionId: string; value: number }[] = [];

      activeVersions.forEach(({ version }) => {
        if (!version) return;
        const versionVals = valuesMap.get(version.id);
        const val = versionVals?.get(line.id);
        if (val) {
          const cost =
            line.line_type === "setup"
              ? Number(val.setup_cost)
              : Number(val.recurrent_cost);

          if (!isNaN(cost)) {
            lineValues.push({ versionId: version.id, value: cost });
          }
        }
      });

      if (lineValues.length > 1) {
        const sorted = [...lineValues].sort((a, b) => a.value - b.value);
        const min = sorted[0].value;
        const max = sorted[sorted.length - 1].value;

        // Only show indicators if there is a difference
        if (min !== max) {
          const sum = lineValues.reduce((acc, curr) => acc + curr.value, 0);
          const avg = sum / lineValues.length;

          minVersionId = sorted[0].versionId;
          maxVersionId = sorted[sorted.length - 1].versionId;

          analysisMetrics = {
            rowMin: min,
            rowMax: max,
            average: avg,
            // Pre-calculate diffs? No, depend on cell value.
            // But we need to pass the base metrics.
          };
        }
      }
    }
    const row = (
      <TableRow
        key={line.id}
        className={cn(
          "hover:bg-slate-50/50 transition-colors",
          hasChildren &&
          "bg-slate-50/30 font-semibold text-slate-900 border-l-2 border-l-slate-200"
        )}
      >
        <TableCell className="py-2 pl-4">
          <div
            className="flex items-center min-w-0"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => onToggle(line.id)}
                className="mr-2 p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-7" />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase leading-none mb-1">
                {line.line_code}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm truncate font-medium">{line.name}</span>
                {line.description && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="focus:outline-none">
                        <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      className="w-80 p-3 text-xs bg-white/95 backdrop-blur shadow-lg border-slate-200 z-[100]"
                    >
                      <p className="font-mono text-[10px] font-bold text-slate-400 uppercase mb-1">
                        [{line.line_code}]
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        {line.description}
                      </p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 px-2 font-semibold uppercase tracking-tight",
              line.line_type === "setup"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {line.line_type === "setup" ? "Setup" : "Rec"}
          </Badge>
        </TableCell>

        {activeVersions.map(({ supplier, version }) => {
          const isEditing = editingVersionId === version?.id;
          const versionValues = version ? valuesMap.get(version.id) : null;
          const value = versionValues?.get(line.id);

          const isModified = isEditing && value !== undefined;

          // Calculate total if parent
          const calculatedTotal = hasChildren
            ? calculateTotal(
              line,
              valuesMap,
              version?.id,
              line.line_type === "setup" ? "setup" : "recurrent"
            )
            : null;

          // Compute cell specific metrics
          let cellMetrics = undefined;
          let isMin = false;
          let isMax = false;

          if (analysisMetrics && version && !hasChildren) {
            const versionVals = valuesMap.get(version.id);
            const val = versionVals?.get(line.id);
            const cost =
              line.line_type === "setup"
                ? Number(val?.setup_cost || 0)
                : Number(val?.recurrent_cost || 0);

            if (version.id === minVersionId) isMin = true;
            if (version.id === maxVersionId) isMax = true;

            const diffMin =
              analysisMetrics.rowMin !== 0
                ? (cost - analysisMetrics.rowMin) / analysisMetrics.rowMin
                : 0;
            const diffMax =
              analysisMetrics.rowMax !== 0
                ? (cost - analysisMetrics.rowMax) / analysisMetrics.rowMax
                : 0;

            cellMetrics = {
              ...analysisMetrics,
              diffMin,
              diffMax,
            };
          }

          return (
            <TableCell
              key={supplier.id}
              className={cn(
                "p-2 border-l align-middle",
                isEditing && "bg-orange-50/30 border-orange-200"
              )}
            >
              {hasChildren ? (
                <div className="text-right text-xs font-bold text-slate-900 px-3">
                  {calculatedTotal !== null
                    ? new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(calculatedTotal)
                    : "-"}
                </div>
              ) : (
                <CellWithComment
                  lineId={line.id}
                  versionId={version?.id}
                  currentUserId={currentUserId}
                  value={
                    line.line_type === "setup"
                      ? (value?.setup_cost ?? null)
                      : (value?.recurrent_cost ?? null)
                  }
                  onChange={(val) =>
                    onCellChange(
                      line.id,
                      line.line_type === "setup"
                        ? "setup_cost"
                        : "recurrent_cost",
                      val
                    )
                  }
                  isEditing={isEditing}
                  type="currency"
                  suffix={
                    line.line_type === "recurrent" &&
                      line.recurrence_type === "monthly"
                      ? "/m"
                      : line.line_type === "recurrent"
                        ? "/a"
                        : ""
                  }
                  isModified={isModified}
                  isAnalysisMode={isAnalysisMode}
                  isMin={isMin}
                  isMax={isMax}
                  metrics={cellMetrics}
                />
              )}
            </TableCell>
          );
        })}
      </TableRow>
    );

    if (isExpanded && hasChildren) {
      return [
        row,
        ...renderRows(
          line.children!,
          expanded,
          onToggle,
          activeVersions,
          valuesMap,
          editingVersionId,
          onCellChange,
          calculateTotal,
          depth + 1,
          currentUserId,
          rfpId,
          isAnalysisMode
        ),
      ];
    }
    return [row];
  });
}
