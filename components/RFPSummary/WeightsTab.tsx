"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditableTableTree } from "@/components/EditableTableTree";
import { KPICard } from "@/components/RFPSummary/KPICard";
import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { FileText } from "lucide-react";

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  children?: TreeNode[];
}

interface WeightsTabProps {
  rfpId: string;
}

export function WeightsTab({ rfpId }: WeightsTabProps) {
  const [data, setData] = useState<TreeNode[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedRequirementId, setSelectedRequirementId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});
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
        const response = await fetch(`/api/rfps/${rfpId}/tree`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result || []);

        // Keep tree collapsed by default
        // setExpandedNodeIds(new Set());

        // Initialize default weights
        const defaultWeights: Record<string, number> = {};
        function initializeWeights(nodes: TreeNode[]) {
          const groupsByLevel = new Map<number, TreeNode[]>();

          function collectByLevel(nodes: TreeNode[]) {
            for (const node of nodes) {
              if (!groupsByLevel.has(node.level)) {
                groupsByLevel.set(node.level, []);
              }
              groupsByLevel.get(node.level)!.push(node);
              if (node.children) {
                collectByLevel(node.children);
              }
            }
          }

          collectByLevel(nodes);

          // Distribute 100% among nodes at the same level
          for (const [, nodesAtLevel] of groupsByLevel) {
            const weightPerNode = 100 / nodesAtLevel.length;
            for (const node of nodesAtLevel) {
              defaultWeights[node.id] = Math.round(weightPerNode * 100) / 100;
            }
          }
        }

        initializeWeights(result || []);
        setWeights(defaultWeights);

        // Try to load existing weights from database
        try {
          const weightsResponse = await fetch(`/api/rfps/${rfpId}/weights`, {
            cache: "no-store",
          });

          if (weightsResponse.ok) {
            const weightsData = await weightsResponse.json();
            const loadedWeights: Record<string, number> = {};

            const allRealWeights = new Map<string, number>();
            for (const [id, weight] of Object.entries(
              weightsData.categories || {}
            )) {
              allRealWeights.set(id as string, (weight as number) * 100);
            }
            for (const [id, weight] of Object.entries(
              weightsData.requirements || {}
            )) {
              allRealWeights.set(id as string, (weight as number) * 100);
            }

            function assignLoadedWeights(
              nodes: TreeNode[],
              parentRealWeight: number = 100
            ) {
              let calculatedParentWeight = 0;
              for (const node of nodes) {
                const realWeight = allRealWeights.get(node.id);
                if (realWeight !== undefined && realWeight !== null) {
                  calculatedParentWeight += realWeight;
                }
              }

              const effectiveParentWeight =
                calculatedParentWeight > 0
                  ? calculatedParentWeight
                  : parentRealWeight;

              for (const node of nodes) {
                const realWeight = allRealWeights.get(node.id);

                if (realWeight !== undefined && realWeight !== null) {
                  const localWeight =
                    effectiveParentWeight > 0
                      ? (realWeight / effectiveParentWeight) * 100
                      : 0;
                  loadedWeights[node.id] = Math.round(localWeight * 100) / 100;

                  if (node.children) {
                    assignLoadedWeights(node.children, realWeight);
                  }
                } else if (node.children) {
                  assignLoadedWeights(node.children, parentRealWeight);
                }
              }
            }

            assignLoadedWeights(result || []);

            if (Object.keys(loadedWeights).length > 0) {
              setWeights(loadedWeights);
            }
          }
        } catch (err) {
          console.error("Error loading weights:", err);
        }
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

  const handleToggleNode = (nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
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

  const handleCollapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  const handleSelectRequirement = (id: string) => {
    setSelectedRequirementId(id);
  };

  const handleWeightChange = (nodeId: string, weight: number) => {
    setWeights((prev) => ({
      ...prev,
      [nodeId]: weight,
    }));
  };

  const handleEquidistribute = (
    _parentId: string | null,
    childrenIds: string[]
  ) => {
    if (childrenIds.length === 0) return;

    const weightPerChild = 100 / childrenIds.length;
    const newWeights = { ...weights };

    childrenIds.forEach((childId) => {
      newWeights[childId] = Math.round(weightPerChild * 100) / 100;
    });

    setWeights(newWeights);
  };

  const calculateRealWeight = (
    nodeId: string,
    nodes: TreeNode[] = data,
    parentId: string | null = null
  ): number => {
    const localWeight = weights[nodeId] || 0;
    if (!parentId) return localWeight;

    const parentRealWeight = calculateRealWeight(parentId, nodes);
    return (localWeight * parentRealWeight) / 100;
  };

  const calculateRequirementStats = () => {
    const requirements: Array<{ code: string; weight: number }> = [];

    function traverse(nodes: TreeNode[], parentId: string | null = null) {
      for (const node of nodes) {
        if (node.type === "requirement") {
          const realWeight = calculateRealWeight(node.id, data, parentId);
          requirements.push({ code: node.code, weight: realWeight });
        }
        if (node.children) {
          traverse(node.children, node.id);
        }
      }
    }

    traverse(data);

    if (requirements.length === 0) {
      return {
        average: 0,
        max: null,
        min: null,
      };
    }

    const sum = requirements.reduce((acc, r) => acc + r.weight, 0);
    const average = sum / requirements.length;

    const max = requirements.reduce((prev, current) =>
      current.weight > prev.weight ? current : prev
    );

    const min = requirements.reduce((prev, current) =>
      current.weight < prev.weight ? current : prev
    );

    return {
      average: Math.round(average * 100) / 100,
      max,
      min,
    };
  };

  const collectRealWeights = () => {
    const categories: Record<string, number> = {};
    const requirements: Record<string, number> = {};

    function traverse(nodes: TreeNode[], parentId: string | null = null) {
      for (const node of nodes) {
        const realWeight = calculateRealWeight(node.id, data, parentId);
        const decimalWeight = Math.round((realWeight / 100) * 10000) / 10000;

        if (node.type === "category") {
          categories[node.id] = decimalWeight;
        } else if (node.type === "requirement") {
          requirements[node.id] = decimalWeight;
        }

        if (node.children) {
          traverse(node.children, node.id);
        }
      }
    }

    traverse(data);
    return { categories, requirements };
  };

  const handleSaveWeights = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      const { categories, requirements } = collectRealWeights();

      const response = await fetch(`/api/rfps/${rfpId}/weights`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories,
          requirements,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error saving weights");
      }

      setSaveMessage({
        type: "success",
        text: "Weights saved successfully!",
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Error saving weights:", err);
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving weights",
      });
    } finally {
      setSaving(false);
    }
  };

  const stats = calculateRequirementStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">
          Chargement des pondérations...
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Message */}
      {saveMessage && (
        <div
          className={`p-4 rounded-lg ${
            saveMessage.type === "success"
              ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200"
              : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Exigences"
          value={(() => {
            let count = 0;
            function countRequirements(nodes: TreeNode[]) {
              for (const node of nodes) {
                if (node.type === "requirement") count++;
                if (node.children) {
                  countRequirements(node.children);
                }
              }
            }
            countRequirements(data);
            return count;
          })()}
          icon={<FileText className="h-5 w-5" />}
          hint="Total requirements"
        />
        <KPICard
          label="Pondérations moyennes"
          value={`${stats.average.toFixed(2)}%`}
          icon={<FileText className="h-5 w-5" />}
          hint="Average weight"
        />
        <KPICard
          label="Pondérations max"
          value={stats.max ? `${stats.max.weight.toFixed(2)}%` : "-"}
          icon={<FileText className="h-5 w-5" />}
          subtitle={stats.max ? `(${stats.max.code})` : undefined}
          hint="Maximum weight"
        />
        <KPICard
          label="Pondérations min"
          value={stats.min ? `${stats.min.weight.toFixed(2)}%` : "-"}
          icon={<FileText className="h-5 w-5" />}
          subtitle={stats.min ? `(${stats.min.code})` : undefined}
          hint="Minimum weight"
        />
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
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
        <Button
          onClick={handleSaveWeights}
          disabled={saving}
          className="gap-2 ml-auto"
        >
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* Tree Table */}
      <EditableTableTree
        data={data}
        expandedNodeIds={expandedNodeIds}
        onToggleNode={handleToggleNode}
        weights={weights}
        onWeightChange={handleWeightChange}
        onSelectRequirement={handleSelectRequirement}
        selectedRequirementId={selectedRequirementId}
        onEquidistribute={handleEquidistribute}
      />
    </div>
  );
}
