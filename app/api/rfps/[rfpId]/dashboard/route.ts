import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRequirements,
  getResponsesForRFP,
  getCategories,
} from "@/lib/supabase/queries";
import {
  getVersionSupplierStatuses,
  getActiveSupplierIds,
} from "@/lib/suppliers/status-cache";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";
import { aggregateDashboard } from "@/lib/dashboard/aggregate";
import type { RFP, ResponseWithSupplier } from "@/lib/supabase/types";

interface DashboardResponse {
  rfp: RFP;
  userAccessLevel: "owner" | "evaluator" | "viewer" | "admin";
  globalProgress: {
    completionPercentage: number;
    totalRequirements: number;
    evaluatedRequirements: number;
    statusDistribution: {
      pass: number;
      partial: number;
      fail: number;
      pending: number;
      roadmap: number;
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
        status: "pass" | "partial" | "fail" | "pending" | "roadmap";
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

    // RFP row, access check and the active version are independent of each
    // other: run them together rather than in four sequential round-trips.
    const [rfpResult, access, activeVersionResult] = await Promise.all([
      supabase.from("rfps").select("*").eq("id", rfpId).maybeSingle(),
      checkRFPAccess(rfpId, user.id),
      versionId
        ? Promise.resolve({ data: { id: versionId } })
        : supabase
            .from("evaluation_versions")
            .select("id")
            .eq("rfp_id", rfpId)
            .eq("is_active", true)
            .maybeSingle(),
    ]);

    const rfp = rfpResult.data;
    if (rfpResult.error || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    if (!access.hasAccess) {
      if (access.error?.includes("not found")) {
        return NextResponse.json({ error: "RFP not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const completionVersionId = activeVersionResult.data?.id ?? null;

    // Requirements, categories and responses are three independent reads.
    const [requirements, categories, allResponses] = await Promise.all([
      getRequirements(rfpId),
      getCategories(rfpId) as unknown as Promise<
        Array<{ id: string; title: string; weight?: number | null }>
      >,
      getResponsesForRFP(rfpId, undefined, versionId || undefined) as Promise<
        ResponseWithSupplier[]
      >,
    ]);

    // Supplier shortlist for the requested version, and for the version the
    // completion percentage is measured against (usually the same one).
    const [versionStatuses, completionStatuses] = await Promise.all([
      versionId ? getVersionSupplierStatuses(supabase, versionId) : null,
      completionVersionId
        ? getVersionSupplierStatuses(supabase, completionVersionId)
        : null,
    ]);

    const aggregated = aggregateDashboard({
      requirements,
      categories,
      responses: allResponses as never,
      activeSupplierIds: versionStatuses
        ? getActiveSupplierIds(versionStatuses)
        : undefined,
      completion: {
        versionId: completionVersionId,
        activeSupplierIds: completionStatuses
          ? getActiveSupplierIds(completionStatuses)
          : null,
      },
    });

    const response: DashboardResponse = {
      rfp,
      userAccessLevel: (access.accessLevel || "viewer") as
        | "owner"
        | "evaluator"
        | "viewer"
        | "admin",
      globalProgress: {
        completionPercentage: aggregated.completionPercentage,
        totalRequirements: aggregated.totalRequirements,
        evaluatedRequirements: aggregated.evaluatedRequirements,
        statusDistribution: aggregated.statusDistribution,
        averageScores: aggregated.averageScores,
      },
      suppliersAnalysis: aggregated.suppliersAnalysis,
      categoriesAnalysis: aggregated.categoriesAnalysis,
      weightsConfiguration: aggregated.weightsConfiguration,
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
