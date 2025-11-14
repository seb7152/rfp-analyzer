"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import { Box, TextField, Typography } from "@mui/material";

// Types pour notre structure de données
interface WeightNode {
  id: string;
  title: string;
  type: "category" | "requirement";
  level: number;
  absoluteWeight: number; // Poids absolu sauvegardé en base
  relativeWeight: number; // Poids relatif calculé (pourcentage)
  categoryId?: string; // Pour les exigences
  children?: WeightNode[];
  parentId?: string;
  uniqueId?: string; // Identifiant unique pour Material React Table
}

interface WeightConfigurationTableProps {
  categories: Array<{
    id: string;
    title: string;
    currentWeight: number;
    defaultWeight: number;
  }>;
  requirements: Array<{
    id: string;
    title: string;
    categoryId: string;
    currentWeight: number;
    defaultWeight: number;
  }>;
  onWeightsChange?: (updatedWeights: {
    categories: Record<string, number>;
    requirements: Record<string, number>;
  }) => void;
}

export function WeightConfigurationTable({
  categories,
  requirements,
  onWeightsChange,
}: WeightConfigurationTableProps) {
  // État pour les poids modifiés
  const [weights, setWeights] = useState<{
    categories: Record<string, number>;
    requirements: Record<string, number>;
  }>(() => {
    const initialCategories: Record<string, number> = {};
    const initialRequirements: Record<string, number> = {};

    categories.forEach((cat) => {
      initialCategories[cat.id] = cat.currentWeight;
    });

    requirements.forEach((req) => {
      initialRequirements[req.id] = req.currentWeight;
    });

    return { categories: initialCategories, requirements: initialRequirements };
  });

  // Construction de la structure arborescente
  const treeData = useMemo(() => {
    // Créer les nœuds de catégories avec leurs exigences comme enfants
    const categoryNodes: WeightNode[] = categories.map((cat) => {
      // Trouver les exigences pour cette catégorie
      const categoryRequirements = requirements.filter(
        (req) => req.categoryId === cat.id,
      );

      // Créer les nœuds d'exigences
      const requirementNodes: WeightNode[] = categoryRequirements.map(
        (req) => ({
          id: req.id,
          title: req.title,
          type: "requirement",
          level: 1,
          absoluteWeight: weights.requirements[req.id] || req.currentWeight,
          relativeWeight: 0, // Sera calculé plus tard
          categoryId: req.categoryId,
          parentId: req.categoryId,
        }),
      );

      return {
        id: cat.id,
        title: cat.title,
        type: "category",
        level: 0,
        absoluteWeight: weights.categories[cat.id] || cat.currentWeight,
        relativeWeight: 0, // Sera calculé plus tard
        children: requirementNodes,
      };
    });

    // Calculer les poids relatifs
    const calculateRelativeWeights = (nodes: WeightNode[]): WeightNode[] => {
      return nodes.map((node) => {
        if (node.type === "category") {
          // Pour les catégories, le poids relatif est par rapport au total des catégories
          const totalCategoryWeight = nodes.reduce(
            (sum, cat) => sum + cat.absoluteWeight,
            0,
          );
          const relativeWeight =
            totalCategoryWeight > 0
              ? (node.absoluteWeight / totalCategoryWeight) * 100
              : 0;

          const updatedNode = { ...node, relativeWeight };

          // Calculer les poids relatifs des exigences dans cette catégorie
          if (updatedNode.children && updatedNode.children.length > 0) {
            const totalRequirementWeight = updatedNode.children.reduce(
              (sum, req) => sum + req.absoluteWeight,
              0,
            );
            updatedNode.children = updatedNode.children.map((child) => ({
              ...child,
              relativeWeight:
                totalRequirementWeight > 0
                  ? (child.absoluteWeight / totalRequirementWeight) * 100
                  : 0,
            }));
          }

          return updatedNode;
        }
        return node;
      });
    };

    return calculateRelativeWeights(categoryNodes);
  }, [categories, requirements, weights]);

  // Aplatir les données pour Material React Table avec identifiants uniques
  const flatData = useMemo(() => {
    const flatten = (nodes: WeightNode[], level = 0): WeightNode[] => {
      let idCounter = 0;
      return nodes.reduce((acc: WeightNode[], node) => {
        acc.push({ ...node, level, uniqueId: `node-${idCounter++}` });
        if (node.children && node.children.length > 0) {
          acc.push(...flatten(node.children, level + 1));
        }
        return acc;
      }, []);
    };
    return flatten(treeData);
  }, [treeData]);

  // Gestionnaire de mise à jour des poids
  const handleWeightChange = useCallback(
    (
      nodeId: string,
      nodeType: "category" | "requirement",
      newValue: number,
    ) => {
      setWeights((prev) => {
        const updated = { ...prev };
        if (nodeType === "category") {
          updated.categories[nodeId] = newValue;
        } else {
          updated.requirements[nodeId] = newValue;
        }

        // Notifier le parent si callback fourni
        if (onWeightsChange) {
          onWeightsChange(updated);
        }

        return updated;
      });
    },
    [onWeightsChange],
  );

  // Définition des colonnes
  const columns = useMemo<MRT_ColumnDef<WeightNode>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Élément",
        Cell: ({ row }) => {
          const node = row.original;
          const indent = node.level * 24;

          return (
            <Box
              sx={{ display: "flex", alignItems: "center", pl: `${indent}px` }}
            >
              {node.type === "category" ? (
                <Box sx={{ mr: 1, color: "primary.main", fontWeight: "bold" }}>
                  📁
                </Box>
              ) : (
                <Box sx={{ mr: 1, color: "secondary.main" }}>📄</Box>
              )}
              <Typography
                variant="body2"
                fontWeight={node.type === "category" ? "bold" : "normal"}
              >
                {node.title}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: "absoluteWeight",
        header: "Poids absolu",
        Cell: ({ row }) => {
          const node = row.original;
          return (
            <TextField
              type="number"
              value={node.absoluteWeight}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                handleWeightChange(node.id, node.type, value);
              }}
              inputProps={{ min: 0, max: 1, step: 0.01 }}
              size="small"
              sx={{ width: "100px" }}
            />
          );
        },
      },
      {
        accessorKey: "relativeWeight",
        header: "Poids relatif (%)",
        Cell: ({ row }) => {
          const node = row.original;
          return (
            <Typography
              variant="body2"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              {node.relativeWeight.toFixed(1)}%
            </Typography>
          );
        },
      },
    ],
    [handleWeightChange],
  );

  // Configuration de la table
  const table = useMaterialReactTable({
    columns,
    data: flatData,
    enableExpanding: true, // Activer l'expansion pour voir les exigences
    enableSorting: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableBottomToolbar: false,
    enableTopToolbar: false,
    getSubRows: (row) => {
      // Retourner les enfants (exigences) pour les catégories
      if (row && row.type === "category") {
        return row.children || [];
      }
      return [];
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        backgroundColor: row.original.type === "category" ? "grey.50" : "white",
      },
    }),
    initialState: {
      expanded: true, // Déplier toutes les catégories par défaut
    },
    // Utiliser l'identifiant unique pour éviter les doublons
    getRowId: (row) => row.uniqueId || row.id,
  });

  return (
    <Box sx={{ width: "100%" }}>
      <MaterialReactTable table={table} />
    </Box>
  );
}
