import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/rfps/[rfpId]/suppliers/[supplierId]/completion
 * Calculate supplier completion score with weighted average per requirement
 * Score = SUM(requirement_score * requirement_weight) / (5 * SUM(all requirement weights))
 * where requirement_score is on scale 0-5
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string; supplierId: string } }
) {
  try {
    const { rfpId, supplierId } = params;

    if (!rfpId || !supplierId) {
      return NextResponse.json(
        { error: "RFP ID and Supplier ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get weights configuration from categories and requirements
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, weight")
      .eq("rfp_id", rfpId);

    if (categoriesError) {
      throw categoriesError;
    }

    const { data: requirements, error: requirementsError } = await supabase
      .from("requirements")
      .select("id, weight")
      .eq("rfp_id", rfpId);

    if (requirementsError) {
      throw requirementsError;
    }

    const weightsConfig: Record<string, number> = {};

    // Add category weights
    (categories || []).forEach((cat: any) => {
      if (cat.weight) {
        weightsConfig[cat.id] = cat.weight;
      }
    });

    // Add requirement weights
    (requirements || []).forEach((req: any) => {
      if (req.weight) {
        weightsConfig[req.id] = req.weight;
      }
    });

    // Get all responses for this supplier
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select("id, supplier_id, requirement_id, manual_score, ai_score")
      .eq("supplier_id", supplierId)
      .eq("rfp_id", rfpId);

    if (responsesError) {
      throw responsesError;
    }

    // Get all requirements with hierarchy info (level, parent_id, title)
    const { data: allRequirements, error: reqError } = await supabase
      .from("requirements")
      .select("id, title, parent_id, level")
      .eq("rfp_id", rfpId);

    if (reqError) {
      throw reqError;
    }

    // Build requirement map
    const reqMap = new Map(allRequirements?.map((r) => [r.id, r]) || []);

    // Helper function to find category (level 1 parent)
    const findCategory = (requirementId: string): string | null => {
      let current = reqMap.get(requirementId);
      while (current) {
        if (current.level === 1) return current.id;
        if (!current.parent_id) return null;
        current = reqMap.get(current.parent_id);
      }
      return null;
    };

    // Calculate weighted score per requirement and group by category
    let totalWeightedScore = 0;
    let totalWeight = 0;

    interface CategoryData {
      categoryId: string;
      categoryName: string;
      weightedScore: number;
      weight: number;
      requirements: Array<{
        requirementId: string;
        requirementTitle: string;
        score: number;
        weight: number;
        weightedScore: number;
      }>;
    }

    const categoryMap: Record<string, CategoryData> = {};
    const requirementScores: Array<{
      requirementId: string;
      requirementTitle: string;
      score: number;
      weight: number;
      weightedScore: number;
      categoryId: string;
    }> = [];

    responses?.forEach((response: any) => {
      // Only include responses that have a score (manual or AI)
      const hasScore =
        response.manual_score !== null || response.ai_score !== null;
      const score = response.manual_score ?? response.ai_score ?? 0;
      const reqWeight = (weightsConfig[response.requirement_id] as number) || 0;
      const categoryId = findCategory(response.requirement_id);

      // Only count responses with scores in the weighted calculation
      if (hasScore) {
        const weightedScore = score * reqWeight;

        totalWeightedScore += weightedScore;
        totalWeight += reqWeight;

        const reqData = reqMap.get(response.requirement_id);
        const categoryData = reqMap.get(categoryId || "");

        // Initialize category if not exists
        if (categoryId && !categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            categoryId,
            categoryName: categoryData?.title || "Sans titre",
            weightedScore: 0,
            weight: 0,
            requirements: [],
          };
        }

        // Add to category
        if (categoryId) {
          categoryMap[categoryId].weightedScore += weightedScore;
          categoryMap[categoryId].weight += reqWeight;
        }

        const reqObj = {
          requirementId: response.requirement_id,
          requirementTitle: reqData?.title || "Sans titre",
          score: Math.round(score * 100) / 100,
          weight: reqWeight,
          weightedScore: Math.round(weightedScore * 100) / 100,
          categoryId: categoryId || "",
        };

        requirementScores.push(reqObj);

        if (categoryId) {
          categoryMap[categoryId].requirements.push({
            requirementId: response.requirement_id,
            requirementTitle: reqData?.title || "Sans titre",
            score: Math.round(score * 100) / 100,
            weight: reqWeight,
            weightedScore: Math.round(weightedScore * 100) / 100,
          });
        }
      }
    });

    // Calculate category scores (weighted average per category)
    const categoryScores = Object.entries(categoryMap).map(([_, category]) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      weightedScore: Math.round(category.weightedScore * 100) / 100,
      categoryWeight: category.weight,
      score:
        category.weight > 0
          ? Math.round((category.weightedScore / category.weight) * 100) / 100
          : 0,
    }));

    // Calculate final completion percentage
    // Completion = (sum of weighted scores) / (max possible score)
    // max possible score = 5 (max score on /5) * total weight
    const maxPossibleScore = 5 * totalWeight;
    const completionPercentage =
      maxPossibleScore > 0
        ? Math.round((totalWeightedScore / maxPossibleScore) * 100)
        : 0;

    return NextResponse.json(
      {
        supplierId,
        completionPercentage: Math.min(100, Math.max(0, completionPercentage)),
        averageScore:
          totalWeight > 0
            ? Math.round((totalWeightedScore / totalWeight) * 100) / 100
            : 0,
        categoryScores,
        requirementScores,
        totalRequirements: requirementScores.length, // Only count requirements with scores
        totalScoredRequirements: requirementScores.length,
        totalResponseCount: responses?.length || 0, // Total responses including unsolved
        totalWeight,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error calculating supplier completion:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
