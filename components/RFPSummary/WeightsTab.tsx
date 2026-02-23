"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditableTableTree } from "@/components/EditableTableTree";
import { KPICard } from "@/components/RFPSummary/KPICard";
import { ChevronDown, ChevronUp, Save, FileText } from "lucide-react";

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  children?: TreeNode[];
  description?: string;
  short_name?: string;
  is_mandatory?: boolean;
  is_optional?: boolean;
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
  const [localWeights, setLocalWeights] = useState<Record<string, number>>({}); // NEW: Store local weights independently
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
        let loadedWeights: Record<string, number> = {};
        try {
          const weightsResponse = await fetch(`/api/rfps/${rfpId}/weights`, {
            cache: "no-store",
          });

          if (weightsResponse.ok) {
            const weightsData = await weightsResponse.json();

            // Load only REQUIREMENT weights from database (categories are calculated bottom-up)
            // The database stores global/effective weights
            for (const [id, weight] of Object.entries(
              weightsData.requirements || {}
            )) {
              if (weight !== null && weight !== undefined) {
                loadedWeights[id] = Number(weight);
              }
            }

            // Merge loaded weights with defaults
            if (Object.keys(loadedWeights).length > 0) {
              setWeights((prev) => ({
                ...prev,
                ...loadedWeights,
              }));
            }
          }
        } catch (err) {
          console.error("Error loading weights:", err);
        }

        // Initialize local weights from effective weights
        const initialEffective = computeEffectiveWeights(result || [], {
          ...defaultWeights,
          ...loadedWeights,
        });
        const initialLocal: Record<string, number> = {};
        const calculateInitialLocal = (
          nodes: TreeNode[],
          parentEff: number
        ) => {
          for (const node of nodes) {
            const eff = initialEffective[node.id] || 0;
            initialLocal[node.id] = parentEff > 0 ? (eff / parentEff) * 100 : 0;
            if (node.children) {
              calculateInitialLocal(node.children, eff || 1);
            }
          }
        };
        calculateInitialLocal(result || [], 1.0);
        setLocalWeights(initialLocal);
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

  // Helper to compute effective global weights (Bottom-Up)
  // Leaf = stored weight
  // Category = sum of children's effective weights
  const computeEffectiveWeights = (
    nodes: TreeNode[],
    currentWeights: Record<string, number>
  ): Record<string, number> => {
    const effective: Record<string, number> = {};

    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        if (node.children && node.children.length > 0) {
          traverse(node.children);
          // Sum children for category
          let sum = 0;
          for (const child of node.children) {
            sum += effective[child.id] || 0;
          }
          effective[node.id] = sum;
        } else {
          // Leaf (or empty category): use stored weight
          if (node.type === "category") {
            effective[node.id] = 0;
          } else {
            effective[node.id] = currentWeights[node.id] || 0;
          }
        }
      }
    };

    traverse(nodes);
    return effective;
  };

  // NEW: Compute effective weights from local percentages (top-down)
  const computeEffectiveFromLocal = (
    nodes: TreeNode[],
    locals: Record<string, number>
  ): Record<string, number> => {
    const effective: Record<string, number> = {};

    const traverse = (nodeList: TreeNode[], parentEffective: number) => {
      for (const node of nodeList) {
        const localPercent = locals[node.id] || 0;
        // Effective = local% × parentEffective
        effective[node.id] = (localPercent / 100) * parentEffective;

        if (node.children && node.children.length > 0) {
          traverse(node.children, effective[node.id]);
        }
      }
    };

    traverse(nodes, 1.0); // Start with base 1.0 for root
    return effective;
  };

  // Use localWeights to compute effective weights for display and saving
  const effectiveWeights = computeEffectiveFromLocal(data, localWeights);

  const handleWeightChange = (nodeId: string, newLocalWeight: number) => {
    // Simply update the local weight - siblings remain unchanged!
    setLocalWeights((prev) => ({
      ...prev,
      [nodeId]: newLocalWeight,
    }));
  };

  const handleEquidistribute = (
    parentId: string | null,
    childrenIds: string[]
  ) => {
    if (childrenIds.length === 0) return;

    // Distribute equally: each child gets Total/N.
    // We need to determine "Total".
    // If strict bottom-up, "Total" is the sum of current effective,
    // OR it's the Parent's effective (which is the same).

    let totalToDistribute = 0;
    if (parentId) {
      totalToDistribute = effectiveWeights[parentId] || 0;
    } else {
      totalToDistribute = childrenIds.reduce(
        (sum, id) => sum + (effectiveWeights[id] || 0),
        0
      );
    }

    if (totalToDistribute === 0) return;

    const perChild = totalToDistribute / childrenIds.length;
    const newWeights = { ...weights };

    // We need to set each child so that its effective weight becomes `perChild`.
    // If child is leaf: set weights[child] = perChild.
    // If child is category: scale its descendants so their sum = perChild.

    const updateNodeTotal = (id: string, targetWeight: number) => {
      const current = effectiveWeights[id] || 0;
      if (current === 0) {
        // If 0, distribute evenly to leaves?
        // We need to find the node to get its children.
        const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
          for (const n of nodes) {
            if (n.id === id) return n;
            if (n.children) {
              const found = findNode(n.children);
              if (found) return found;
            }
          }
        };
        const node = findNode(data);
        if (node && node.children) {
          // Distribute to all primitive descendants (leaves)
          const leaves: string[] = [];
          const collectLeaves = (n: TreeNode) => {
            if (n.children && n.children.length > 0) {
              n.children.forEach(collectLeaves);
            } else {
              leaves.push(n.id);
            }
          };
          collectLeaves(node);
          if (leaves.length > 0) {
            const val = targetWeight / leaves.length;
            leaves.forEach((lId) => (newWeights[lId] = val));
          }
        } else {
          newWeights[id] = targetWeight;
        }
      } else {
        const ratio = targetWeight / current;
        // Scale descendants
        const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
          for (const n of nodes) {
            if (n.id === id) return n;
            if (n.children) {
              const found = findNode(n.children);
              if (found) return found;
            }
          }
        };
        const node = findNode(data);
        if (node) {
          const scale = (n: TreeNode) => {
            if (n.children && n.children.length > 0) {
              n.children.forEach(scale);
            } else {
              newWeights[n.id] = (newWeights[n.id] || 0) * ratio;
            }
          };
          scale(node);
        }
      }
    };

    childrenIds.forEach((id) => updateNodeTotal(id, perChild));
    setWeights(newWeights);
  };

  const calculateRequirementStats = () => {
    const requirements: Array<{ code: string; weight: number }> = [];

    function traverse(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.type === "requirement") {
          const globalWeight = effectiveWeights[node.id] || 0;
          requirements.push({ code: node.code, weight: globalWeight });
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    }

    traverse(data);

    if (requirements.length === 0) {
      return { average: 0, max: null, min: null };
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
      average: Math.round(average * 100 * 100) / 100,
      max: { ...max, weight: Math.round(max.weight * 100 * 100) / 100 },
      min: { ...min, weight: Math.round(min.weight * 100 * 100) / 100 },
    };
  };

  const collectWeights = () => {
    const categories: Record<string, number> = {};
    const requirements: Record<string, number> = {};

    function traverse(nodes: TreeNode[]) {
      for (const node of nodes) {
        // Use EFFECTIVE weights for saving
        const globalWeight = effectiveWeights[node.id] || 0;

        if (node.type === "category") {
          categories[node.id] = globalWeight;
        } else if (node.type === "requirement") {
          requirements[node.id] = globalWeight;
        }

        if (node.children) {
          traverse(node.children);
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

      const { categories, requirements } = collectWeights();

      const response = await fetch(`/api/rfps/${rfpId}/weights`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, requirements }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error saving weights");
      }

      setSaveMessage({ type: "success", text: "Weights saved successfully!" });
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

  // localWeights is now stored in state and initialized at load time

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
        weights={localWeights}
        onWeightChange={handleWeightChange}
        onSelectRequirement={handleSelectRequirement}
        selectedRequirementId={selectedRequirementId}
        onEquidistribute={handleEquidistribute}
      />
    </div>
  );
}
