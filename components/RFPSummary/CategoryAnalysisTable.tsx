"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useVersion } from "@/contexts/VersionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Sparkles,
  RefreshCw,
  Maximize2,
  AlertTriangle,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Supplier } from "@/types/supplier";
import { toast } from "sonner";
import { EditableList } from "./EditableList";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryAnalysisTableMobile } from "./CategoryAnalysisTableMobile";
import { ClientOnly } from "../ClientOnly";

// Types
interface TreeNode {
  id: string;
  code: string;
  title: string;
  type: "category" | "requirement";
  description?: string;
  children?: TreeNode[];
  level?: number;
  analysis?: {
    forces: string[];
    faiblesses: string[];
  };
}

interface CategoryAnalysisTableProps {
  rfpId: string;
  userAccessLevel?: any;
}

interface SupplierStatus {
  id: string;
  shortlist_status: "active" | "shortlisted" | "removed";
  removal_reason?: string | null;
}

export function CategoryAnalysisTable({ rfpId }: CategoryAnalysisTableProps) {
  const { activeVersion, versions } = useVersion();
  const isMobile = useIsMobile();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierStatuses, setSupplierStatuses] = useState<
    Record<string, SupplierStatus>
  >({});
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [copied, setCopied] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );
  // Initialize with activeVersion, fallback to first version if available
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskIdMap, setTaskIdMap] = useState<Record<string, string>>({});
  const [analysisIdMap, setAnalysisIdMap] = useState<Record<string, string>>(
    {}
  );

  const refreshAnalysisResults = async () => {
    try {
      setIsRefreshing(true);
      console.log("[REFRESH] Refreshing analysis results");

      // Reload all analyses from the server
      let resultsUrl = `/api/rfps/${rfpId}/analyze-defense/results/latest`;
      const params = new URLSearchParams();
      if (selectedVersionId) {
        params.append("versionId", selectedVersionId);
      }
      if (selectedSupplierId) {
        params.append("supplierId", selectedSupplierId);
      }
      if (params.toString()) {
        resultsUrl += `?${params.toString()}`;
      }
      const resultsRes = await fetch(resultsUrl);
      const resultsData = await resultsRes.json();

      const bySupplier: Record<
        string,
        Record<string, { forces: string[]; faiblesses: string[] }>
      > = {};

      if (resultsData.analyses && resultsData.analyses.length > 0) {
        console.log("[REFRESH] Got", resultsData.analyses.length, "analyses");

        // Build task ID and analysis ID maps for editing
        const newTaskIdMap: Record<string, string> = {};
        const newAnalysisIdMap: Record<string, string> = {};

        resultsData.analyses.forEach((task: any) => {
          if (task.category_id && task.result) {
            const supplierKey = task.supplier_id || "default";

            if (!bySupplier[supplierKey]) {
              bySupplier[supplierKey] = {};
            }

            bySupplier[supplierKey][task.category_id] = {
              forces: task.result.forces || [],
              faiblesses: task.result.faiblesses || [],
            };

            // Store task ID for this category (use task_id or id)
            const taskId = task.task_id || task.id;
            if (taskId) {
              newTaskIdMap[task.category_id] = taskId;
            }

            // Store analysis ID for syncing with defense_analyses table
            const analysisId = task.defense_analyses?.id;
            if (analysisId) {
              newAnalysisIdMap[task.category_id] = analysisId;
            }
          }
        });

        setTaskIdMap(newTaskIdMap);
        setAnalysisIdMap(newAnalysisIdMap);

        console.log(
          "[REFRESH] Built supplier map with keys:",
          Object.keys(bySupplier)
        );
        setAllAnalysesBySupplier(bySupplier);
      } else {
        console.log("[ANALYSIS LOADER] No analyses found");
        setAllAnalysesBySupplier({});
        setTaskIdMap({});
        setAnalysisIdMap({});
      }

      // Apply for current supplier
      const analysisMap =
        selectedSupplierId && bySupplier[selectedSupplierId]
          ? bySupplier[selectedSupplierId]
          : {};

      const enrichTree = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.type === "category" && analysisMap[node.id]) {
            return {
              ...node,
              analysis: analysisMap[node.id],
              children: node.children ? enrichTree(node.children) : undefined,
            };
          }
          return {
            ...node,
            analysis: node.type === "category" ? undefined : node.analysis,
            children: node.children ? enrichTree(node.children) : undefined,
          };
        });
      };

      const enrichedTree = enrichTree(tree || []);
      setTree(enrichedTree);
    } catch (error) {
      console.error("Error refreshing analysis results:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Store all analyses grouped by supplier_id
  const [allAnalysesBySupplier, setAllAnalysesBySupplier] = useState<
    Record<string, Record<string, { forces: string[]; faiblesses: string[] }>>
  >({});

  // Load analysis results when rfpId or selectedSupplierId changes
  const loadAnalysisResults = async (
    supplierId: string | null,
    versionId: string | null = null
  ) => {
    try {
      // First, load all analyses for this RFP if not already loaded
      if (Object.keys(allAnalysesBySupplier).length === 0) {
        console.log("[ANALYSIS LOADER] Loading all analyses for RFP");
        let resultsUrl = `/api/rfps/${rfpId}/analyze-defense/results/latest`;
        const params = new URLSearchParams();
        if (versionId) {
          params.append("versionId", versionId);
        }
        if (supplierId) {
          params.append("supplierId", supplierId);
        }
        if (params.toString()) {
          resultsUrl += `?${params.toString()}`;
        }
        const resultsRes = await fetch(resultsUrl);
        const resultsData = await resultsRes.json();

        if (resultsData.analyses && resultsData.analyses.length > 0) {
          console.log(
            "[ANALYSIS LOADER] Got analyses, building map",
            resultsData.analyses
          );

          // Build a map of analyses by supplier_id from the response
          const bySupplier: Record<
            string,
            Record<string, { forces: string[]; faiblesses: string[] }>
          > = {};

          // Build task ID and analysis ID maps for editing
          const newTaskIdMap: Record<string, string> = {};
          const newAnalysisIdMap: Record<string, string> = {};

          resultsData.analyses.forEach((task: any) => {
            if (task.category_id && task.result) {
              // Use supplier_id from response if available, otherwise use a default key
              const supplierKey = task.supplier_id || "default";

              if (!bySupplier[supplierKey]) {
                bySupplier[supplierKey] = {};
              }

              bySupplier[supplierKey][task.category_id] = {
                forces: task.result.forces || [],
                faiblesses: task.result.faiblesses || [],
              };

              // Store task ID for this category (use task_id or id)
              const taskId = task.task_id || task.id;
              if (taskId) {
                newTaskIdMap[task.category_id] = taskId;
              }

              // Store analysis ID for syncing with defense_analyses table
              const analysisId = task.defense_analyses?.id;
              if (analysisId) {
                newAnalysisIdMap[task.category_id] = analysisId;
              }

              console.log(
                `[ANALYSIS LOADER] Task for supplier ${supplierKey}, category ${task.category_id}:`,
                {
                  forces_count: task.result.forces?.length || 0,
                  faiblesses_count: task.result.faiblesses?.length || 0,
                }
              );
            }
          });

          setTaskIdMap(newTaskIdMap);
          setAnalysisIdMap(newAnalysisIdMap);

          console.log(
            "[ANALYSIS LOADER] Built supplier map with keys:",
            Object.keys(bySupplier)
          );
          setAllAnalysesBySupplier(bySupplier);
        } else {
          console.log("[ANALYSIS LOADER] No analyses found");
          setAllAnalysesBySupplier({});
          setTaskIdMap({});
          setAnalysisIdMap({});
        }
      }

      // Now apply the analyses for the selected supplier to the tree
      const analysisMap =
        supplierId && allAnalysesBySupplier[supplierId]
          ? allAnalysesBySupplier[supplierId]
          : {};

      console.log(
        "[ANALYSIS LOADER] Applying analyses for supplier:",
        supplierId,
        "with",
        Object.keys(analysisMap).length,
        "categories"
      );

      // Update tree with loaded analyses
      const enrichTree = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.type === "category" && analysisMap[node.id]) {
            return {
              ...node,
              analysis: analysisMap[node.id],
              children: node.children ? enrichTree(node.children) : undefined,
            };
          }
          return {
            ...node,
            analysis: node.type === "category" ? undefined : node.analysis,
            children: node.children ? enrichTree(node.children) : undefined,
          };
        });
      };

      setTree((prevTree) => {
        const enrichedTree = enrichTree(prevTree || []);
        console.log("[ANALYSIS LOADER] Updated tree for supplier:", supplierId);
        return enrichedTree;
      });
    } catch (error) {
      console.error("Error in loadAnalysisResults:", error);
    }
  };

  useEffect(() => {
    console.log(
      "[CATEGORY ANALYSIS] useEffect triggered! rfpId:",
      rfpId,
      "activeVersion:",
      activeVersion
    );

    async function fetchData() {
      try {
        setLoading(true);
        console.log("[CATEGORY ANALYSIS] fetchData started, rfpId:", rfpId);

        // Build suppliers URL with versionId if available
        let suppliersUrl = `/api/rfps/${rfpId}/suppliers`;
        if (activeVersion?.id) {
          suppliersUrl += `?versionId=${activeVersion.id}`;
        }

        // Build responses URL with versionId if available
        let responsesUrl = `/api/rfps/${rfpId}/responses`;
        if (activeVersion?.id) {
          responsesUrl += `?versionId=${activeVersion.id}`;
        }

        const [treeRes, responsesRes, suppliersRes, weightsRes] =
          await Promise.all([
            fetch(`/api/rfps/${rfpId}/tree`),
            fetch(responsesUrl),
            fetch(suppliersUrl),
            fetch(`/api/rfps/${rfpId}/weights`),
          ]);
        const treeData = await treeRes.json();
        const responsesData = await responsesRes.json();
        const suppliersData = await suppliersRes.json();
        const weightsData = await weightsRes.json();

        console.log("[CATEGORY ANALYSIS] Responses URL was:", responsesUrl);
        console.log("[CATEGORY ANALYSIS] Suppliers URL was:", suppliersUrl);
        console.log(
          "[CATEGORY ANALYSIS] Responses data received:",
          responsesData.responses?.length
        );
        console.log(
          "[CATEGORY ANALYSIS] Suppliers data received:",
          suppliersData.suppliers?.length
        );
        if (suppliersData.suppliers && suppliersData.suppliers.length > 0) {
          console.log("[CATEGORY ANALYSIS] First supplier:", {
            id: suppliersData.suppliers[0].id,
            name: suppliersData.suppliers[0].name,
            shortlist_status: suppliersData.suppliers[0].shortlist_status,
            removal_reason: suppliersData.suppliers[0].removal_reason,
          });
        }

        setResponses(responsesData.responses || []);
        setSuppliers(suppliersData.suppliers || []);

        // Build supplier statuses map
        const statusMap: Record<string, SupplierStatus> = {};
        if (suppliersData.suppliers) {
          suppliersData.suppliers.forEach((supplier: any) => {
            statusMap[supplier.id] = {
              id: supplier.id,
              shortlist_status: supplier.shortlist_status || "active",
              removal_reason: supplier.removal_reason || null,
            };
          });
        }

        console.log(
          "[CATEGORY ANALYSIS] Status map built, size:",
          Object.keys(statusMap).length
        );
        if (Object.keys(statusMap).length > 0) {
          const firstKey = Object.keys(statusMap)[0];
          console.log(
            "[CATEGORY ANALYSIS] First status entry:",
            firstKey,
            statusMap[firstKey]
          );
        }

        // Also log for Witco if it exists
        const witcoId = suppliersData.suppliers?.find((s: any) =>
          s.name?.includes("Witco")
        )?.id;
        if (witcoId) {
          console.log(
            "[CATEGORY ANALYSIS] Witco found, id:",
            witcoId,
            "status:",
            statusMap[witcoId]
          );
        } else {
          console.log("[CATEGORY ANALYSIS] Witco NOT found in suppliers list");
        }

        setSupplierStatuses(statusMap);

        // Flatten weights (requirements only)
        const flatWeights: Record<string, number> = {};
        if (weightsData.requirements) {
          Object.assign(flatWeights, weightsData.requirements);
        }
        setWeights(flatWeights);

        // Set first supplier as selected by default
        let firstSupplierId: string | null = null;
        if (suppliersData.suppliers && suppliersData.suppliers.length > 0) {
          firstSupplierId = suppliersData.suppliers[0].id;
          setSelectedSupplierId(firstSupplierId);
        }

        setTree(treeData || []);

        // Initialize expanded categories (expand top level by default)
        const topLevelIds = (treeData || []).map((n: TreeNode) => n.id);
        setExpandedCategories(new Set(topLevelIds));

        // Load analysis results for the first supplier
        if (firstSupplierId) {
          await loadAnalysisResults(firstSupplierId, activeVersion?.id || null);
        }
      } catch (error) {
        console.error("Error fetching category analysis data:", error);
      } finally {
        setLoading(false);
      }
    }

    console.log(
      "[CATEGORY ANALYSIS] About to call fetchData, rfpId check:",
      !!rfpId
    );
    if (rfpId) {
      fetchData();
    } else {
      console.log("[CATEGORY ANALYSIS] ERROR: rfpId is missing!");
    }
  }, [rfpId, activeVersion?.id]);

  // Sync selected version with active version, with fallback to first version
  useEffect(() => {
    if (activeVersion?.id) {
      console.log(
        "[CategoryAnalysisTable] Setting selectedVersionId from activeVersion:",
        activeVersion.id
      );
      setSelectedVersionId(activeVersion.id);
    } else if (versions && versions.length > 0) {
      console.log(
        "[CategoryAnalysisTable] No activeVersion, using first version:",
        versions[0].id
      );
      setSelectedVersionId(versions[0].id);
    } else {
      console.log("[CategoryAnalysisTable] No versions available");
      setSelectedVersionId(null);
    }
  }, [activeVersion?.id, versions]);

  // Reload analysis results when selected supplier or version changes
  useEffect(() => {
    if (selectedSupplierId && rfpId) {
      loadAnalysisResults(selectedSupplierId, selectedVersionId);
    }
  }, [selectedSupplierId, selectedVersionId, rfpId]);

  // Poll for completed analysis results and update tree
  useEffect(() => {
    if (!lastAnalysisId) return;

    const pollForResults = async () => {
      try {
        const response = await fetch(
          `/api/rfps/${rfpId}/analyze-defense/results?analysisId=${lastAnalysisId}`
        );
        const data = await response.json();

        if (data.analyses && data.analyses.length > 0) {
          // Build analysis map
          const analysisMap: Record<
            string,
            { forces: string[]; faiblesses: string[] }
          > = {};
          data.analyses.forEach((task: any) => {
            if (task.category_id && task.result) {
              analysisMap[task.category_id] = {
                forces: task.result.forces || [],
                faiblesses: task.result.faiblesses || [],
              };
            }
          });

          // Update tree with new analyses
          setTree((prevTree) => {
            const enrichTree = (nodes: TreeNode[]): TreeNode[] => {
              return nodes.map((node) => {
                if (node.type === "category" && analysisMap[node.id]) {
                  return {
                    ...node,
                    analysis: analysisMap[node.id],
                    children: node.children
                      ? enrichTree(node.children)
                      : undefined,
                  };
                }
                return {
                  ...node,
                  children: node.children
                    ? enrichTree(node.children)
                    : undefined,
                };
              });
            };
            return enrichTree(prevTree);
          });
        }
      } catch (error) {
        console.error("Error fetching analysis results:", error);
      }
    };

    // Initial poll
    pollForResults();

    // Poll every 2 seconds
    const interval = setInterval(pollForResults, 2000);
    return () => clearInterval(interval);
  }, [lastAnalysisId, rfpId]);

  // Update analysis handler for inline editing
  const updateTreeAnalysis = (
    nodes: TreeNode[],
    categoryId: string,
    updates: { forces?: string[]; faiblesses?: string[] }
  ): TreeNode[] => {
    return nodes.map((node) => {
      if (node.id === categoryId && node.type === "category") {
        return {
          ...node,
          analysis: {
            ...node.analysis,
            forces: updates.forces ?? node.analysis?.forces ?? [],
            faiblesses: updates.faiblesses ?? node.analysis?.faiblesses ?? [],
          },
        };
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeAnalysis(node.children, categoryId, updates),
        };
      }
      return node;
    });
  };

  const handleUpdateAnalysis = async (
    categoryId: string,
    updates: { forces?: string[]; faiblesses?: string[] }
  ) => {
    const taskId = taskIdMap[categoryId];
    const analysisId = analysisIdMap[categoryId];

    if (!taskId) {
      toast.error("ID de tâche introuvable pour cette catégorie");
      return;
    }

    try {
      // Optimistic UI update
      setTree((prevTree) => updateTreeAnalysis(prevTree, categoryId, updates));

      // Also update allAnalysesBySupplier for consistency
      if (selectedSupplierId) {
        setAllAnalysesBySupplier((prev) => {
          const supplierKey = selectedSupplierId;
          const newData = { ...prev };
          if (newData[supplierKey] && newData[supplierKey][categoryId]) {
            newData[supplierKey][categoryId] = {
              ...newData[supplierKey][categoryId],
              forces: updates.forces ?? newData[supplierKey][categoryId].forces,
              faiblesses:
                updates.faiblesses ??
                newData[supplierKey][categoryId].faiblesses,
            };
          }
          return newData;
        });
      }

      // Step 1: Update defense_analysis_tasks via PATCH
      const response = await fetch(
        `/api/rfps/${rfpId}/analyze-defense/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update analysis");
      }

      const data = await response.json();

      // Confirm with server response
      setTree((prevTree) =>
        updateTreeAnalysis(prevTree, categoryId, {
          forces: data.result.forces,
          faiblesses: data.result.faiblesses,
        })
      );

      // Also update allAnalysesBySupplier with server data
      if (selectedSupplierId) {
        setAllAnalysesBySupplier((prev) => {
          const supplierKey = selectedSupplierId;
          const newData = { ...prev };
          if (!newData[supplierKey]) {
            newData[supplierKey] = {};
          }
          newData[supplierKey][categoryId] = {
            forces: data.result.forces || [],
            faiblesses: data.result.faiblesses || [],
          };
          return newData;
        });
      }

      // Step 2: Sync to defense_analyses.analysis_data if we have analysisId
      if (analysisId) {
        console.log(`[EDIT] Syncing analysis ${analysisId} after task update`);
        const syncResponse = await fetch(
          `/api/rfps/${rfpId}/analyze-defense/sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysisId }),
          }
        );

        if (!syncResponse.ok) {
          console.warn(
            "Warning: Sync to defense_analyses failed, but task was updated:",
            syncResponse.status
          );
          // Don't fail the entire operation, just warn
        } else {
          console.log(`[EDIT] Successfully synced analysis ${analysisId}`);
        }
      }

      toast.success("Analyse mise à jour avec succès");
    } catch (error) {
      // Rollback on error
      await refreshAnalysisResults();
      toast.error("Erreur lors de la mise à jour de l'analyse");
      console.error("Update failed:", error);
    }
  };

  // Flatten categories for display
  const flatCategories = useMemo(() => {
    const flat: (TreeNode & { level: number })[] = [];

    const traverse = (nodes: TreeNode[], level: number) => {
      for (const node of nodes) {
        if (node.type === "category") {
          flat.push({ ...node, level });
          if (expandedCategories.has(node.id) && node.children) {
            traverse(node.children, level + 1);
          }
        }
      }
    };

    traverse(tree, 0);
    return flat;
  }, [tree, expandedCategories]);

  // Helper function to get category score for a supplier
  const getCategoryScore = (
    categoryId: string,
    supplierId: string
  ): number | null => {
    const requirementIds = new Set<string>();

    // Collect all requirement IDs under this category
    const collectRequirementIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "requirement") {
          requirementIds.add(node.id);
        } else if (node.children) {
          collectRequirementIds(node.children);
        }
      }
    };

    const categoryNode = findNodeById(tree, categoryId);
    if (categoryNode && categoryNode.children) {
      collectRequirementIds(categoryNode.children);
    }

    // Calculate weighted score
    let weightedSum = 0;
    let totalWeight = 0;

    responses.forEach((response) => {
      if (
        response.supplier_id === supplierId &&
        requirementIds.has(response.requirement_id)
      ) {
        const weight = weights[response.requirement_id] || 0;
        if (weight > 0) {
          const score = response.manual_score ?? response.ai_score ?? null;
          if (score !== null) {
            weightedSum += score * weight;
            totalWeight += weight;
          }
        }
      }
    });

    if (totalWeight > 0) {
      return weightedSum / totalWeight;
    }
    return null;
  };

  // Helper function to get average category score across all suppliers
  const getAverageCategoryScore = (categoryId: string): number | null => {
    const requirementIds = new Set<string>();

    // Collect all requirement IDs under this category
    const collectRequirementIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "requirement") {
          requirementIds.add(node.id);
        } else if (node.children) {
          collectRequirementIds(node.children);
        }
      }
    };

    const categoryNode = findNodeById(tree, categoryId);
    if (categoryNode && categoryNode.children) {
      collectRequirementIds(categoryNode.children);
    }

    // Calculate average score across all suppliers
    const supplierScores: Record<
      string,
      { weightedSum: number; totalWeight: number }
    > = {};

    responses.forEach((response) => {
      if (requirementIds.has(response.requirement_id)) {
        const weight = weights[response.requirement_id] || 0;
        if (weight > 0) {
          const score = response.manual_score ?? response.ai_score ?? null;
          if (score !== null) {
            if (!supplierScores[response.supplier_id]) {
              supplierScores[response.supplier_id] = {
                weightedSum: 0,
                totalWeight: 0,
              };
            }
            supplierScores[response.supplier_id].weightedSum += score * weight;
            supplierScores[response.supplier_id].totalWeight += weight;
          }
        }
      }
    });

    // Calculate final scores for each supplier
    const scores: number[] = [];
    for (const supplierId in supplierScores) {
      const data = supplierScores[supplierId];
      if (data.totalWeight > 0) {
        scores.push(data.weightedSum / data.totalWeight);
      }
    }

    // Return average
    if (scores.length > 0) {
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    return null;
  };

  // Color function for scores
  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-slate-200 text-slate-600";

    if (score >= 3.5) return "bg-emerald-600 text-white";
    if (score >= 3.0) return "bg-emerald-500 text-white";
    if (score >= 2.5) return "bg-emerald-400 text-white";
    if (score >= 2.0) return "bg-yellow-400 text-slate-900";
    if (score >= 1.0) return "bg-orange-400 text-white";
    return "bg-red-500 text-white";
  };

  const formatScore = (score: number | null) => {
    if (score === null) return "-";
    return score.toFixed(1);
  };

  // Get attention points (questions from responses) for a category and supplier
  // If category is expanded, only show direct child requirements
  // If category is collapsed, show all descendant requirements
  const getAttentionPoints = (
    categoryId: string,
    supplierId?: string,
    isExpanded?: boolean
  ): string[] => {
    const questions = new Set<string>();
    const requirementIds = new Set<string>();

    const categoryNode = findNodeById(tree, categoryId);
    if (!categoryNode || !categoryNode.children) {
      return [];
    }

    // Collect requirement IDs based on expansion state
    if (isExpanded) {
      // Category is expanded: only collect direct child requirements (not from subcategories)
      const collectDirectRequirements = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === "requirement") {
            requirementIds.add(node.id);
          }
          // Don't recurse into subcategories when expanded
        }
      };
      collectDirectRequirements(categoryNode.children);
    } else {
      // Category is collapsed: collect all descendant requirements
      const collectAllRequirements = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === "requirement") {
            requirementIds.add(node.id);
          } else if (node.children) {
            collectAllRequirements(node.children);
          }
        }
      };
      collectAllRequirements(categoryNode.children);
    }

    // Get unique questions from responses for these requirements
    responses.forEach((response) => {
      if (
        requirementIds.has(response.requirement_id) &&
        response.question &&
        response.question.trim() &&
        (!supplierId || response.supplier_id === supplierId)
      ) {
        questions.add(response.question);
      }
    });

    return Array.from(questions);
  };

  // Helper to find a node by ID
  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Get direct child titles (either requirements or subcategories)
  const getChildTitles = (categoryId: string): string[] => {
    const categoryNode = findNodeById(tree, categoryId);
    if (!categoryNode || !categoryNode.children) {
      return [];
    }

    const titles: string[] = [];
    for (const child of categoryNode.children) {
      if (child.type === "requirement") {
        titles.push(child.title);
      } else if (child.type === "category") {
        titles.push(child.title);
      }
    }
    return titles;
  };

  const toggleCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Generate markdown table
  const generateMarkdown = (): string => {
    let markdown =
      "| Catégorie | Détail | Note | Forces | Faiblesses | Points d'attention |\n";
    markdown +=
      "|-----------|--------|------|--------|-----------|--------------------|\n";

    for (const category of flatCategories) {
      const isExpanded = expandedCategories.has(category.id);
      const attentionPoints = getAttentionPoints(
        category.id,
        selectedSupplierId || undefined,
        isExpanded
      );
      const childTitles = getChildTitles(category.id);
      const indent = "  ".repeat(category.level);
      const pointsList =
        attentionPoints.length > 0
          ? attentionPoints.map((p) => `• ${p}`).join(" - ")
          : "";
      const detailList =
        childTitles.length > 0
          ? childTitles.map((p) => `• ${p}`).join(" - ")
          : "";

      const forcesList =
        category.analysis?.forces && category.analysis.forces.length > 0
          ? category.analysis.forces.map((f) => `• ${f}`).join(" - ")
          : "";
      const faiblessesList =
        category.analysis?.faiblesses && category.analysis.faiblesses.length > 0
          ? category.analysis.faiblesses.map((f) => `• ${f}`).join(" - ")
          : "";

      const score =
        selectedSupplierId && selectedSupplierId !== ""
          ? getCategoryScore(category.id, selectedSupplierId)
          : null;
      const averageScore = getAverageCategoryScore(category.id);
      const scoreStr =
        score !== null && averageScore !== null
          ? `${formatScore(score)} / ${formatScore(averageScore)}`
          : "-";

      markdown += `| ${indent}**${category.code}** - ${category.title} | ${detailList} | ${scoreStr} | ${forcesList} | ${faiblessesList} | ${pointsList} |\n`;
    }

    return markdown;
  };

  // Trigger async defense analysis workflow
  const triggerAnalysis = async () => {
    try {
      if (!selectedSupplierId) {
        console.error("No supplier selected");
        return;
      }

      if (!selectedVersionId) {
        console.error("No version selected. Available versions:", versions);
        alert("Please select a version or ensure versions are loaded");
        return;
      }

      setAnalysisLoading(true);

      const payload = {
        supplierId: selectedSupplierId,
        versionId: selectedVersionId,
      };
      console.log("[triggerAnalysis] Payload being sent:", payload);
      console.log("[triggerAnalysis] activeVersion:", activeVersion);
      console.log("[triggerAnalysis] selectedVersionId is:", selectedVersionId);

      // Call backend API to initiate async analysis
      const response = await fetch(`/api/rfps/${rfpId}/analyze-defense`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Analysis initiation error:", errorData);
        return;
      }

      const result = await response.json();
      console.log("Analysis initiated:", result);

      // Store analysis ID for polling results
      setLastAnalysisId(result.analysisId);

      // Show success message with analysis ID
      alert(
        `Analysis started!\nAnalysis ID: ${result.analysisId}\nCorrelation ID: ${result.correlationId}\n\nThe workflow will process all leaf categories and synthesize parent results.`
      );
    } catch (error) {
      console.error("Error triggering analysis:", error);
      alert(`Error initiating analysis: ${error}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Analyse par Catégorie");

      // Define columns
      worksheet.columns = [
        { header: "Catégorie", key: "category", width: 50 },
        { header: "Détail", key: "detail", width: 40 },
        { header: "Note", key: "score", width: 20 },
        { header: "Forces", key: "forces", width: 50 },
        { header: "Faiblesses", key: "faiblesses", width: 50 },
        { header: "Points d'attention", key: "attention", width: 60 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };

      // Add data rows
      for (const category of flatCategories) {
        const isExpanded = expandedCategories.has(category.id);
        const attentionPoints = getAttentionPoints(
          category.id,
          selectedSupplierId || undefined,
          isExpanded
        );
        const childTitles = getChildTitles(category.id);
        const indent = "  ".repeat(category.level);

        const score =
          selectedSupplierId && selectedSupplierId !== ""
            ? getCategoryScore(category.id, selectedSupplierId)
            : null;
        const averageScore = getAverageCategoryScore(category.id);
        const scoreStr =
          score !== null && averageScore !== null
            ? `${formatScore(score)} / ${formatScore(averageScore)}`
            : "-";

        const detailBullets =
          childTitles.length > 0
            ? childTitles.map((t) => `• ${t}`).join("\n")
            : "";
        const forcesBullets =
          category.analysis?.forces && category.analysis.forces.length > 0
            ? category.analysis.forces.map((f) => `• ${f}`).join("\n")
            : "";
        const faiblessesBullets =
          category.analysis?.faiblesses &&
          category.analysis.faiblesses.length > 0
            ? category.analysis.faiblesses.map((f) => `• ${f}`).join("\n")
            : "";
        const attentionBullets =
          attentionPoints.length > 0
            ? attentionPoints.map((p) => `• ${p}`).join("\n")
            : "";

        const row = worksheet.addRow({
          category: `${indent}${category.code} - ${category.title}`,
          detail: detailBullets,
          score: scoreStr,
          forces: forcesBullets,
          faiblesses: faiblessesBullets,
          attention: attentionBullets,
        });

        // Enable text wrapping for cells with bullet points
        row.getCell("detail").alignment = { wrapText: true, vertical: "top" };
        row.getCell("forces").alignment = { wrapText: true, vertical: "top" };
        row.getCell("faiblesses").alignment = {
          wrapText: true,
          vertical: "top",
        };
        row.getCell("attention").alignment = {
          wrapText: true,
          vertical: "top",
        };
      }

      // Enable text wrapping for header row
      worksheet.getRow(1).alignment = { wrapText: true, vertical: "middle" };

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const supplierName =
        suppliers.find((s) => s.id === selectedSupplierId)?.name || "analyse";
      const date = new Date().toISOString().split("T")[0];
      link.download = `analyse-categories-${supplierName}-${date}.xlsx`;

      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Erreur lors de l'export Excel");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape" });

      // Title
      const supplierName =
        suppliers.find((s) => s.id === selectedSupplierId)?.name || "Analyse";
      doc.setFontSize(16);
      doc.text(`Analyse par Catégorie - ${supplierName}`, 14, 15);

      // Prepare table data
      const tableData = flatCategories.map((category) => {
        const isExpanded = expandedCategories.has(category.id);
        const attentionPoints = getAttentionPoints(
          category.id,
          selectedSupplierId || undefined,
          isExpanded
        );
        const childTitles = getChildTitles(category.id);
        const indent = "  ".repeat(category.level);

        const score =
          selectedSupplierId && selectedSupplierId !== ""
            ? getCategoryScore(category.id, selectedSupplierId)
            : null;
        const averageScore = getAverageCategoryScore(category.id);
        const scoreStr =
          score !== null && averageScore !== null
            ? `${formatScore(score)} / ${formatScore(averageScore)}`
            : "-";

        const detailBullets =
          childTitles.length > 0
            ? childTitles.map((t) => `• ${t}`).join("\n")
            : "";
        const forcesBullets =
          category.analysis?.forces && category.analysis.forces.length > 0
            ? category.analysis.forces.map((f) => `• ${f}`).join("\n")
            : "";
        const faiblessesBullets =
          category.analysis?.faiblesses &&
          category.analysis.faiblesses.length > 0
            ? category.analysis.faiblesses.map((f) => `• ${f}`).join("\n")
            : "";
        const attentionBullets =
          attentionPoints.length > 0
            ? attentionPoints.map((p) => `• ${p}`).join("\n")
            : "";

        return [
          `${indent}${category.code} - ${category.title}`,
          detailBullets,
          scoreStr,
          forcesBullets,
          faiblessesBullets,
          attentionBullets,
        ];
      });

      // Generate table
      autoTable(doc, {
        head: [
          [
            "Catégorie",
            "Détail",
            "Note",
            "Forces",
            "Faiblesses",
            "Points d'attention",
          ],
        ],
        body: tableData,
        startY: 25,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [226, 232, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 50 },
          4: { cellWidth: 50 },
          5: { cellWidth: 60 },
        },
        margin: { left: 10, right: 10 },
      });

      // Download
      const date = new Date().toISOString().split("T")[0];
      doc.save(`analyse-categories-${supplierName}-${date}.pdf`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Erreur lors de l'export PDF");
    }
  };

  const copyToClipboard = async () => {
    try {
      const markdown = generateMarkdown();
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  console.log(
    "[CATEGORY ANALYSIS RENDER] Component rendering, loading:",
    loading,
    "suppliers:",
    suppliers?.length
  );

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-500">
        Chargement de l'analyse...
      </div>
    );
  }

  const cardContent = (
    <>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg font-medium">
              Analyse par Catégorie
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="gap-2"
                title="Agrandir le tableau"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              {suppliers.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">
                    Soumissionnaire:
                  </label>
                  <Select
                    value={selectedSupplierId || ""}
                    onValueChange={setSelectedSupplierId}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Sélectionner un soumissionnaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => {
                        const status = supplierStatuses[supplier.id];
                        if (supplier.name?.includes("Witco")) {
                          console.log(
                            "[CATEGORY ANALYSIS RENDER] Witco selectitem - status:",
                            status
                          );
                        }
                        return (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            <div className="flex items-center gap-2">
                              <span>{supplier.name}</span>
                              {status &&
                                status.shortlist_status !== "active" && (
                                  <Badge
                                    variant={
                                      status.shortlist_status === "removed"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {status.shortlist_status === "removed"
                                      ? "Supprimé"
                                      : "Sélectionné"}
                                  </Badge>
                                )}
                              {status?.removal_reason && (
                                <span className="text-xs text-slate-500 ml-2">
                                  ({status.removal_reason})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAnalysisResults}
                disabled={isRefreshing}
                className="gap-2"
                title="Rafraîchir les analyses"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerAnalysis}
                disabled={analysisLoading || !selectedSupplierId}
                className="gap-2"
              >
                {analysisLoading ? (
                  <>
                    <span className="animate-spin">✨</span>
                    Analyse...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyser
                  </>
                )}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exporter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      className="w-full justify-start gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copié!
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Copier Markdown
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportToExcel}
                      className="w-full justify-start gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Télécharger Excel
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportToPDF}
                      className="w-full justify-start gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      Télécharger PDF
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Display supplier status and notes */}
          {selectedSupplierId &&
            (() => {
              const status = supplierStatuses[selectedSupplierId];
              console.log(
                "[CATEGORY ANALYSIS ALERT] Selected supplier:",
                selectedSupplierId,
                "status:",
                status
              );
              return (
                status && (
                  <div className="flex flex-col gap-2">
                    {status.shortlist_status === "removed" &&
                      status.removal_reason && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Raison de la suppression:</strong>{" "}
                            {status.removal_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    {status.shortlist_status === "shortlisted" && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Ce fournisseur a été sélectionné pour cette version.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )
              );
            })()}
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <div className="relative w-full overflow-auto flex-1 border-t border-slate-200">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-medium sticky left-0 bg-slate-50 z-30 border-b border-r min-w-[350px]">
                  Catégorie
                </th>
                <th className="px-6 py-4 font-medium border-b border-r min-w-[300px]">
                  Détail
                </th>
                <th className="px-6 py-4 font-medium border-b border-r min-w-[160px] text-center">
                  Note
                </th>
                <th className="px-6 py-4 font-medium border-b border-r min-w-[250px]">
                  Forces
                </th>
                <th className="px-6 py-4 font-medium border-b border-r min-w-[250px]">
                  Faiblesses
                </th>
                <th className="px-6 py-4 font-medium border-b min-w-[400px]">
                  Points d'attention
                </th>
              </tr>
            </thead>
            <tbody>
              {flatCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const attentionPoints = getAttentionPoints(
                  category.id,
                  selectedSupplierId || undefined,
                  isExpanded
                );
                const score =
                  selectedSupplierId && selectedSupplierId !== ""
                    ? getCategoryScore(category.id, selectedSupplierId)
                    : null;
                const averageScore = getAverageCategoryScore(category.id);
                return (
                  <tr
                    key={category.id}
                    className="border-b transition-colors bg-white hover:bg-slate-50"
                  >
                    <td
                      className={cn(
                        "px-6 py-4 font-medium text-slate-900 sticky left-0 z-10 border-r bg-white hover:bg-slate-50 min-w-[350px]"
                      )}
                    >
                      <div
                        className="flex items-center gap-2 select-none"
                        style={{ paddingLeft: `${category.level * 20}px` }}
                      >
                        <div
                          className="cursor-pointer p-1 hover:bg-slate-200 rounded"
                          onClick={(e) => toggleCategory(category.id, e)}
                        >
                          {category.children &&
                          category.children.some(
                            (c) => c.type === "category"
                          ) ? (
                            expandedCategories.has(category.id) ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </div>

                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          {category.code}
                        </span>
                        <span className="whitespace-normal break-words">
                          {category.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r text-slate-600">
                      {(() => {
                        const childTitles = getChildTitles(category.id);
                        return childTitles.length > 0 ? (
                          <ul className="space-y-1 text-xs">
                            {childTitles.map((title, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="break-words">{title}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null;
                      })()}
                    </td>
                    <td className="px-6 py-4 border-r text-center">
                      <div className="flex items-center justify-center gap-1 mx-auto">
                        <div
                          className={cn(
                            "w-12 h-8 rounded flex items-center justify-center text-xs font-bold",
                            getScoreColor(score)
                          )}
                        >
                          {formatScore(score)}
                        </div>
                        <span className="text-slate-400 text-xs font-medium">
                          /
                        </span>
                        <div
                          className={cn(
                            "w-12 h-8 rounded flex items-center justify-center text-xs font-bold",
                            getScoreColor(averageScore)
                          )}
                        >
                          {formatScore(averageScore)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r text-slate-600">
                      <EditableList
                        items={category.analysis?.forces || []}
                        itemType="force"
                        taskId={taskIdMap[category.id]}
                        onUpdate={(forces) =>
                          handleUpdateAnalysis(category.id, { forces })
                        }
                        readOnly={!taskIdMap[category.id]}
                      />
                    </td>
                    <td className="px-6 py-4 border-r text-slate-600">
                      <EditableList
                        items={category.analysis?.faiblesses || []}
                        itemType="faiblesse"
                        taskId={taskIdMap[category.id]}
                        onUpdate={(faiblesses) =>
                          handleUpdateAnalysis(category.id, { faiblesses })
                        }
                        readOnly={!taskIdMap[category.id]}
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {attentionPoints.length > 0 ? (
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                          {attentionPoints.map((point, idx) => (
                            <li key={idx} className="text-xs flex gap-2">
                              <span className="flex-shrink-0">•</span>
                              <span className="break-words">{point}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </>
  );

  if (isMobile) {
    return (
      <ClientOnly>
        <CategoryAnalysisTableMobile
          flatCategories={flatCategories}
          suppliers={suppliers}
          supplierStatuses={supplierStatuses}
          selectedSupplierId={selectedSupplierId}
          onSupplierChange={setSelectedSupplierId}
          onRefresh={refreshAnalysisResults}
          onAnalyze={triggerAnalysis}
          isRefreshing={isRefreshing}
          analysisLoading={analysisLoading}
          getCategoryScore={getCategoryScore}
          getAverageCategoryScore={getAverageCategoryScore}
          getChildTitles={getChildTitles}
          getAttentionPoints={getAttentionPoints}
        />
      </ClientOnly>
    );
  }

  return (
    <>
      <Card className="w-full overflow-hidden mb-8 h-full">{cardContent}</Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
            <DialogTitle>Analyse par Catégorie - Agrandie</DialogTitle>
            <DialogDescription>
              Vue agrandie du tableau d'analyse des catégories
            </DialogDescription>
          </DialogHeader>
          <Card className="w-full overflow-hidden flex-1 flex flex-col border-0 rounded-none min-h-0">
            {cardContent}
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}
