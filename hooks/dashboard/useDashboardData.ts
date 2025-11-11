"use client";

import { useQuery } from "@tanstack/react-query";

interface DashboardData {
  rfp: any;
  globalProgress: {
    completionPercentage: number;
    totalRequirements: number;
    evaluatedRequirements: number;
    statusDistribution: {
      pass: number;
      partial: number;
      fail: number;
      pending: number;
    };
    averageScores: Record<string, number>;
  };
  suppliersAnalysis: {
    comparisonTable: Array<{
      supplierId: string;
      supplierName: string;
      totalScore: number;
      categoryScores: Record<string, number>;
      ranking: number;
    }>;
    performanceMatrix: {
      suppliers: string[];
      categories: string[];
      scores: number[][];
    };
    ranking: Array<{
      supplierId: string;
      supplierName: string;
      finalScore: number;
      ranking: number;
      variation: number;
    }>;
  };
  categoriesAnalysis: {
    categories: Array<{
      id: string;
      title: string;
      currentWeight: number;
      requirementCount: number;
      averageScore: number;
      completionRate: number;
    }>;
    requirementsByCategory: Record<string, Array<{
      id: string;
      title: string;
      currentWeight: number;
      averageScore: number;
      status: "pass" | "partial" | "fail" | "pending";
    }>>;
  };
  weightsConfiguration: {
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
  };
}

export function useDashboardData(rfpId: string) {
  return useQuery({
    queryKey: ["dashboard-data", rfpId],
    queryFn: async () => {
      const response = await fetch(`/api/rfps/${rfpId}/dashboard`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      return response.json() as Promise<DashboardData>;
    },
    enabled: !!rfpId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}