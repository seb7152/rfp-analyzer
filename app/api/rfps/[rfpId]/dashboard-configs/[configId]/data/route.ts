import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DashboardConfiguration,
  RadarConfigData,
  RadarChartData,
  RadarDataPoint,
  Tag,
  Response as DBResponse,
} from "@/lib/supabase/types";

/**
 * GET /api/rfps/[rfpId]/dashboard-configs/[configId]/data
 *
 * Calculate and return data for a dashboard configuration
 * Handles different chart types based on config.type
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string; configId: string } }
) {
  try {
    const { rfpId, configId } = params;

    // Validate inputs
    if (!rfpId || !configId) {
      return NextResponse.json(
        { error: "Invalid RFP ID or Config ID" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: "Access denied to this RFP" },
        { status: 403 }
      );
    }

    // Fetch the configuration
    const { data: config, error: configError } = await supabase
      .from("dashboard_configurations")
      .select("*")
      .eq("id", configId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    if (configError || !config) {
      console.error("Error fetching config:", configError);
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    const dashConfig = config as DashboardConfiguration;

    // Handle different chart types
    if (dashConfig.type === "radar") {
      const radarData = await calculateRadarData(
        supabase,
        rfpId,
        dashConfig.config as RadarConfigData
      );
      return NextResponse.json(radarData);
    }

    // For other types, return a placeholder
    return NextResponse.json({
      type: dashConfig.type,
      data: [],
      message: `Data calculation for ${dashConfig.type} charts not yet implemented`,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Calculate radar chart data for a given configuration
 *
 * Returns weighted scores per tag axis for a specific supplier
 */
async function calculateRadarData(
  supabase: any,
  rfpId: string,
  config: RadarConfigData
): Promise<RadarChartData> {
  const { selectedTagIds, supplierId } = config;

  // Fetch tags
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("rfp_id", rfpId)
    .in("id", selectedTagIds);

  if (tagsError) {
    console.error("Error fetching tags:", tagsError);
    throw new Error("Failed to fetch tags");
  }

  const tagMap = new Map<string, Tag>(
    (tags || []).map((tag: Tag) => [tag.id, tag])
  );

  // Fetch supplier info
  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("id", supplierId)
    .maybeSingle();

  if (supplierError || !supplier) {
    console.error("Error fetching supplier:", supplierError);
    throw new Error("Supplier not found");
  }

  // Fetch all requirements with their tags
  const { data: requirements, error: reqError } = await supabase
    .from("requirements")
    .select("id, title, weight")
    .eq("rfp_id", rfpId);

  if (reqError) {
    console.error("Error fetching requirements:", reqError);
    throw new Error("Failed to fetch requirements");
  }

  const requirementIds = (requirements || []).map((r: any) => r.id);

  // Fetch requirement-tag associations
  const { data: reqTags, error: reqTagsError } = await supabase
    .from("requirement_tags")
    .select("requirement_id, tag_id")
    .in("requirement_id", requirementIds)
    .in("tag_id", selectedTagIds);

  if (reqTagsError) {
    console.error("Error fetching requirement tags:", reqTagsError);
    throw new Error("Failed to fetch requirement tags");
  }

  // Build map of requirements by tag
  const reqsByTag = new Map<string, Set<string>>();
  selectedTagIds.forEach((tagId: string) => {
    reqsByTag.set(
      tagId,
      new Set(
        (reqTags || [])
          .filter((rt: any) => rt.tag_id === tagId)
          .map((rt: any) => rt.requirement_id)
      )
    );
  });

  // Fetch all responses for this supplier
  const { data: responses, error: respError } = await supabase
    .from("responses")
    .select("id, requirement_id, manual_score, ai_score, status")
    .eq("supplier_id", supplierId)
    .eq("rfp_id", rfpId);

  if (respError) {
    console.error("Error fetching responses:", respError);
    throw new Error("Failed to fetch responses");
  }

  // Build map of responses by requirement
  const responsesByReq = new Map<string, DBResponse>();
  (responses || []).forEach((resp: DBResponse) => {
    responsesByReq.set(resp.requirement_id, resp);
  });

  // Build requirement map for weights
  const reqMap = new Map<string, any>(
    (requirements || []).map((r: any) => [r.id, r])
  );

  // Calculate weighted scores per tag
  const radarData: RadarDataPoint[] = [];

  selectedTagIds.forEach((tagId: string) => {
    const tag = tagMap.get(tagId);
    if (!tag) return;

    const reqs = reqsByTag.get(tagId) || new Set();
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let scoredCount = 0;

    reqs.forEach((reqId: string) => {
      const req = reqMap.get(reqId);
      if (!req) return;

      const resp = responsesByReq.get(reqId);
      // Use manual score if available, otherwise use AI score
      const score = resp?.manual_score ?? resp?.ai_score ?? null;

      // Only count if we have an actual score (not null/0 which means unevaluated)
      if (score !== null && score > 0) {
        totalWeightedScore += score * req.weight;
        totalWeight += req.weight;
        scoredCount += 1;
      }
    });

    // Calculate average weighted score
    const value =
      totalWeight > 0
        ? parseFloat((totalWeightedScore / totalWeight).toFixed(2))
        : 0;

    radarData.push({
      axis: tag.name,
      value: Math.min(5, Math.max(0, value)), // Clamp between 0 and 5
      tagId: tag.id,
    });
  });

  // Sort by tag name for consistency
  radarData.sort((a, b) => a.axis.localeCompare(b.axis));

  return {
    type: "radar",
    data: radarData,
    supplierName: supplier.name,
    rfpId,
  };
}
