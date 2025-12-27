import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
import {
  getRequirements,
  getResponsesForRFP,
  getRFPCompletionPercentage,
  getCategories,
} from "@/lib/supabase/queries";
import type { RFP, ResponseWithSupplier } from "@/lib/supabase/types";

interface DashboardResponse {
  rfp: RFP;
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
    requirementsByCategory: Record<
      string,
      Array<{
        id: string;
        title: string;
        currentWeight: number;
        averageScore: number;
        status: "pass" | "partial" | "fail" | "pending";
      }>
    >;
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

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("versionId");

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch RFP details
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("*")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user access to RFP
    const accessCheckResponse = await verifyRFPAccess(rfpId, user.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Fetch requirements
    const requirements = await getRequirements(rfpId);
    const totalRequirements = requirements.filter((r) => r.level === 4).length;

    // Fetch categories
    const categories = (await getCategories(rfpId)) as any;

    // Fetch all responses
    const allResponses: ResponseWithSupplier[] = await getResponsesForRFP(
      rfpId,
      versionId || undefined
    );

    // Calculate global progress
    const completionPercentage = await getRFPCompletionPercentage(
      rfpId,
      versionId || undefined
    );
    const evaluatedRequirements = Math.round(
      (completionPercentage / 100) * totalRequirements
    );

    // Status distribution
    const statusDistribution = {
      pass: allResponses.filter((r) => r.status === "pass").length,
      partial: allResponses.filter((r) => r.status === "partial").length,
      fail: allResponses.filter((r) => r.status === "fail").length,
      pending: allResponses.filter((r) => r.status === "pending").length,
    };

    // Average scores by supplier
    const averageScores: Record<string, number> = {};
    allResponses.forEach((response) => {
      const supplierId = response.supplier_id;
      if (!averageScores[supplierId]) {
        averageScores[supplierId] = 0;
      }
      averageScores[supplierId] +=
        response.manual_score || response.ai_score || 0;
    });
    Object.keys(averageScores).forEach((supplierId) => {
      averageScores[supplierId] /= allResponses.filter(
        (r) => r.supplier_id === supplierId
      ).length;
    });

    // Suppliers analysis
    const suppliers = [...new Set(allResponses.map((r) => r.supplier_id))];
    const suppliersData = await Promise.all(
      suppliers.map(async (supplierId) => {
        const supplierResponses = allResponses.filter(
          (r) => r.supplier_id === supplierId
        );
        const supplierName =
          supplierResponses[0]?.supplier.name || `Fournisseur ${supplierId}`;

        // Category scores
        const categoryScores: Record<string, number> = {};
        categories.forEach((category: any) => {
          const categoryReqs = requirements.filter(
            (r) => r.category_id === category.id
          );
          const categoryResponses = supplierResponses.filter((sr) =>
            categoryReqs.some((cr) => cr.id === sr.requirement_id)
          );
          const avgCategoryScore =
            categoryResponses.reduce(
              (sum, resp) => sum + (resp.manual_score || resp.ai_score || 0),
              0
            ) / Math.max(categoryResponses.length, 1);
          categoryScores[category.id] = avgCategoryScore;
        });

        const totalScore = Object.values(categoryScores).reduce(
          (sum, score) => sum + score,
          0
        );

        return {
          supplierId,
          supplierName,
          totalScore,
          categoryScores,
          ranking: 0, // To be calculated later
        };
      })
    );

    // Calculate rankings
    const rankedSuppliers = [...suppliersData].sort(
      (a, b) => b.totalScore - a.totalScore
    );
    rankedSuppliers.forEach((supplier, index) => {
      supplier.ranking = index + 1;
    });

    // Performance matrix
    const supplierNames = rankedSuppliers.map((s: any) => s.supplierName);
    const categoryNames = categories.map((c: any) => c.title);
    const scoresMatrix = rankedSuppliers.map((supplier: any) =>
      categories.map(
        (category: any) => supplier.categoryScores[category.id] || 0
      )
    );

    const performanceMatrix = {
      suppliers: supplierNames,
      categories: categoryNames,
      scores: scoresMatrix,
    };

    // Ranking with variation (simplified - vs average)
    const avgTotalScore =
      rankedSuppliers.reduce((sum, s) => sum + s.totalScore, 0) /
      rankedSuppliers.length;
    const ranking = rankedSuppliers.map((supplier) => ({
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      finalScore: supplier.totalScore,
      ranking: supplier.ranking,
      variation: ((supplier.totalScore - avgTotalScore) / avgTotalScore) * 100,
    }));

    // Categories analysis
    const categoriesAnalysis = categories.map((category: any) => {
      const categoryReqs = requirements.filter(
        (r) => r.category_id === category.id
      );
      const categoryResponses = allResponses.filter((ar) =>
        categoryReqs.some((cr) => cr.id === ar.requirement_id)
      );
      const requirementCount = categoryReqs.length;
      const avgScore =
        categoryResponses.reduce(
          (sum, resp) => sum + (resp.manual_score || resp.ai_score || 0),
          0
        ) / Math.max(categoryResponses.length, 1);
      const completionRate =
        (categoryResponses.filter((r) => r.is_checked).length /
          Math.max(categoryResponses.length, 1)) *
        100;

      return {
        id: category.id,
        title: category.title,
        currentWeight: category.weight || 1, // Assuming weight field exists
        requirementCount,
        averageScore: avgScore,
        completionRate,
      };
    });

    // Requirements by category
    const requirementsByCategory: Record<
      string,
      Array<{
        id: string;
        title: string;
        currentWeight: number;
        averageScore: number;
        status: "pass" | "partial" | "fail" | "pending";
      }>
    > = {};
    categories.forEach((category: any) => {
      const categoryReqs = requirements.filter(
        (r) => r.category_id === category.id
      );
      requirementsByCategory[category.id] = categoryReqs.map((req) => {
        const reqResponses = allResponses.filter(
          (ar) => ar.requirement_id === req.id
        );
        const avgScore =
          reqResponses.reduce(
            (sum, resp) => sum + (resp.manual_score || resp.ai_score || 0),
            0
          ) / Math.max(reqResponses.length, 1);
        const checkedCount = reqResponses.filter((r) => r.is_checked).length;
        const totalCount = reqResponses.length;
        let status: "pass" | "partial" | "fail" | "pending" = "pending";
        if (checkedCount === totalCount && totalCount > 0) status = "pass";
        else if (checkedCount > 0 && checkedCount < totalCount)
          status = "partial";
        else if (checkedCount === 0 && totalCount > 0) status = "pending";

        return {
          id: req.id,
          title: req.title,
          currentWeight: req.weight || 1,
          averageScore: avgScore,
          status,
        };
      });
    });

    // Weights configuration (using current weights as default)
    const weightsConfiguration = {
      categories: categories.map((cat: any) => ({
        id: cat.id,
        title: cat.title,
        currentWeight: cat.weight || 1,
        defaultWeight: cat.weight || 1,
      })),
      requirements: requirements.map((req) => ({
        id: req.id,
        title: req.title,
        categoryId: req.category_id || "",
        currentWeight: req.weight || 1,
        defaultWeight: req.weight || 1,
      })),
    };

    const response: DashboardResponse = {
      rfp,
      globalProgress: {
        completionPercentage,
        totalRequirements,
        evaluatedRequirements,
        statusDistribution,
        averageScores,
      },
      suppliersAnalysis: {
        comparisonTable: rankedSuppliers,
        performanceMatrix,
        ranking,
      },
      categoriesAnalysis: {
        categories: categoriesAnalysis,
        requirementsByCategory,
      },
      weightsConfiguration,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
