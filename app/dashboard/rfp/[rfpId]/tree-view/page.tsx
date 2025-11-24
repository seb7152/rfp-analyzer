"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditableTableTree } from "@/components/EditableTableTree";

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  children?: TreeNode[];
}

export default function TreeViewPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;

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

  // Charger les données
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

        // Expand all categories by default
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
        collectCategoryIds(result || []);
        setExpandedNodeIds(allCategoryIds);

        // Initialiser les pondérations par défaut
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

          // Répartir 100% entre les nœuds du même niveau
          for (const [, nodesAtLevel] of groupsByLevel) {
            const weightPerNode = 100 / nodesAtLevel.length;
            for (const node of nodesAtLevel) {
              defaultWeights[node.id] = Math.round(weightPerNode * 100) / 100;
            }
          }
        }

        initializeWeights(result || []);
        setWeights(defaultWeights);

        // Essayer de charger les poids existants depuis la base de données
        try {
          const weightsResponse = await fetch(`/api/rfps/${rfpId}/weights`, {
            cache: "no-store",
          });

          if (weightsResponse.ok) {
            const weightsData = await weightsResponse.json();
            const loadedWeights: Record<string, number> = {};

            // Créer une map de tous les poids réels (en %) pour accès rapide
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

            // Recalculer les poids locaux de manière récursive
            // Pour chaque nœud : poids local = (poids réel / poids réel du parent) * 100
            function assignLoadedWeights(
              nodes: TreeNode[],
              parentRealWeight: number = 100
            ) {
              // D'abord, calculer le poids réel du parent s'il n'a pas été trouvé
              // En sommant les enfants qui ont des poids
              let calculatedParentWeight = 0;
              for (const node of nodes) {
                const realWeight = allRealWeights.get(node.id);
                if (realWeight !== undefined && realWeight !== null) {
                  calculatedParentWeight += realWeight;
                }
              }

              // Utiliser le poids calculé des enfants si le parent n'a pas de poids
              // pour recalculer correctement
              const effectiveParentWeight =
                calculatedParentWeight > 0
                  ? calculatedParentWeight
                  : parentRealWeight;

              for (const node of nodes) {
                const realWeight = allRealWeights.get(node.id);

                if (realWeight !== undefined && realWeight !== null) {
                  // Calculer le poids local basé sur le poids réel du parent
                  const localWeight =
                    effectiveParentWeight > 0
                      ? (realWeight / effectiveParentWeight) * 100
                      : 0;
                  loadedWeights[node.id] = Math.round(localWeight * 100) / 100;

                  // Traiter les enfants avec le poids réel du parent
                  if (node.children) {
                    assignLoadedWeights(node.children, realWeight);
                  }
                } else if (node.children) {
                  // Si pas de poids pour ce nœud, continuer avec les enfants
                  assignLoadedWeights(node.children, parentRealWeight);
                }
              }
            }

            assignLoadedWeights(result || []);

            // Seulement utiliser les poids chargés s'il y en a
            if (Object.keys(loadedWeights).length > 0) {
              console.log("Poids chargés depuis DB:", loadedWeights);
              setWeights(loadedWeights);
            }
          }
        } catch (err) {
          console.error("Erreur lors du chargement des poids:", err);
          // Ignorer l'erreur et utiliser les poids par défaut
        }
      } catch (err) {
        console.error("Erreur lors du chargement:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Erreur inconnue lors du chargement"
        );
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

  // Fonction pour calculer la pondération réelle (en cascade)
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

  // Fonction pour obtenir le parent d'un nœud
  const getParentId = (
    targetId: string,
    currentNodes: TreeNode[] = data,
    parentId: string | null = null
  ): string | null => {
    for (const node of currentNodes) {
      if (node.id === targetId) return parentId;
      if (node.children) {
        const found = getParentId(targetId, node.children, node.id);
        if (found !== null) return found;
      }
    }
    return null;
  };

  // Fonction pour calculer les statistiques des exigences avec pondérations réelles
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

  // Collecter toutes les pondérations réelles (en cascade) pour la sauvegarde
  const collectRealWeights = () => {
    const categories: Record<string, number> = {};
    const requirements: Record<string, number> = {};

    function traverse(nodes: TreeNode[]) {
      for (const node of nodes) {
        const realWeight = calculateRealWeight(node.id);
        // Convertir de % (0-100) à décimal (0-1)
        const decimalWeight = Math.round((realWeight / 100) * 10000) / 10000;

        if (node.type === "category") {
          categories[node.id] = decimalWeight;
        } else if (node.type === "requirement") {
          requirements[node.id] = decimalWeight;
        }

        if (node.children) {
          traverse(node.children);
        }
      }
    }

    traverse(data);
    return { categories, requirements };
  };

  // Fonction pour sauvegarder les poids
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
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }

      setSaveMessage({
        type: "success",
        text: "Pondérations sauvegardées avec succès !",
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      setSaveMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Erreur inconnue lors de la sauvegarde",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mb-8" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Erreur de chargement</h1>
          <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Message de succès/erreur */}
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

      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Vue d'ensemble des exigences</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Arborescence hiérarchique avec taux de complétude
          </p>
        </div>
        <Button
          onClick={handleSaveWeights}
          disabled={saving}
          className="whitespace-nowrap"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total d'éléments
          </div>
          <div className="text-2xl font-bold mt-1">
            {(() => {
              let count = 0;
              function countNodes(nodes: TreeNode[]) {
                for (const node of nodes) {
                  count++;
                  if (node.children) {
                    countNodes(node.children);
                  }
                }
              }
              countNodes(data);
              return count;
            })()}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Catégories
          </div>
          <div className="text-2xl font-bold mt-1">
            {(() => {
              let count = 0;
              function countCategories(nodes: TreeNode[]) {
                for (const node of nodes) {
                  if (node.type === "category") count++;
                  if (node.children) {
                    countCategories(node.children);
                  }
                }
              }
              countCategories(data);
              return count;
            })()}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Exigences
          </div>
          <div className="text-2xl font-bold mt-1">
            {(() => {
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
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pondération moyenne
          </div>
          <div className="text-2xl font-bold mt-1">
            {(() => {
              const stats = calculateRequirementStats();
              return `${stats.average.toFixed(2)}%`;
            })()}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pondération max
          </div>
          <div className="text-2xl font-bold mt-1">
            {(() => {
              const stats = calculateRequirementStats();
              if (!stats.max) return "-";
              return `${stats.max.weight.toFixed(2)}%`;
            })()}
          </div>
          {(() => {
            const stats = calculateRequirementStats();
            if (!stats.max) return null;
            return (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ({stats.max.code})
              </div>
            );
          })()}
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pondération min
          </div>
          <div className="text-2xl font-bold mt-1">
            {(() => {
              const stats = calculateRequirementStats();
              if (!stats.min) return "-";
              return `${stats.min.weight.toFixed(2)}%`;
            })()}
          </div>
          {(() => {
            const stats = calculateRequirementStats();
            if (!stats.min) return null;
            return (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ({stats.min.code})
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950 mb-4">
        <h3 className="font-semibold mb-2 text-sm">
          Instructions de pondération
        </h3>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>• Entrez une pondération locale (0-100%) pour chaque élément</li>
          <li>
            • La pondération réelle = pondération locale × pondération du parent
          </li>
          <li>
            • À chaque niveau, la somme des pondérations locales doit égaler
            100%
          </li>
        </ul>
      </div>

      {/* Contrôles d'expansion */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExpandAll}
          className="whitespace-nowrap"
        >
          Tout étendre
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCollapseAll}
          className="whitespace-nowrap"
        >
          Tout condenser
        </Button>
      </div>

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

      {/* Info du sélection */}
      {selectedRequirementId && (
        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
          <h3 className="font-semibold mb-2">Élément sélectionné</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            ID:{" "}
            <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
              {selectedRequirementId}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
