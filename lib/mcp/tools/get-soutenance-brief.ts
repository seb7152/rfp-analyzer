/**
 * MCP Tool: get_soutenance_brief
 * Returns the latest AI-generated soutenance brief (report_markdown) per supplier.
 * The brief is a structured Markdown document covering weak/partial requirements
 * to prepare the supplier presentation/defense meeting.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const GetSoutenanceBriefInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  supplier_id: z
    .string()
    .optional()
    .describe(
      "Filter by supplier UUID. Omit to get the latest brief for each supplier."
    ),
});

export type GetSoutenanceBriefInput = z.infer<
  typeof GetSoutenanceBriefInputSchema
>;

export interface SoutenanceBriefItem {
  id: string;
  supplierId: string;
  supplierName: string | null;
  status: string;
  reportMarkdown: string | null;
  targetStatuses: string[];
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface GetSoutenanceBriefOutput {
  rfpId: string;
  briefs: SoutenanceBriefItem[];
  count: number;
}

export async function handleGetSoutenanceBrief(
  input: GetSoutenanceBriefInput,
  authContext: MCPAuthContext
): Promise<GetSoutenanceBriefOutput> {
  const supabase = createServiceClient();
  const { rfp_id, supplier_id } = input;

  // Verify access
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, organization_id")
    .eq("id", rfp_id)
    .single();

  if (rfpError || !rfp) throw new Error(`RFP not found: ${rfp_id}`);

  if (
    authContext.organizationId &&
    rfp.organization_id !== authContext.organizationId
  ) {
    const { data: assignment } = await supabase
      .from("rfp_user_assignments")
      .select("id")
      .eq("rfp_id", rfp_id)
      .eq("user_id", authContext.userId)
      .single();
    if (!assignment) throw new Error(`Access denied to RFP: ${rfp_id}`);
  }

  // Fetch soutenance briefs ordered by recency
  let query = supabase
    .from("soutenance_briefs")
    .select(
      "id, supplier_id, status, report_markdown, target_statuses, created_at, completed_at, error_message"
    )
    .eq("rfp_id", rfp_id)
    .order("created_at", { ascending: false });

  if (supplier_id) {
    query = query.eq("supplier_id", supplier_id);
  }

  const { data: briefs, error: briefsError } = await query;
  if (briefsError)
    throw new Error(`Failed to fetch soutenance briefs: ${briefsError.message}`);

  if (!briefs || briefs.length === 0) {
    return { rfpId: rfp_id, briefs: [], count: 0 };
  }

  // Keep only the latest brief per supplier
  const bySupplier = new Map<string, (typeof briefs)[0]>();
  for (const brief of briefs) {
    const key = brief.supplier_id ?? "default";
    if (!bySupplier.has(key)) bySupplier.set(key, brief);
  }
  const latestBriefs = Array.from(bySupplier.values());

  // Fetch supplier names
  const supplierIds = latestBriefs
    .map((b) => b.supplier_id)
    .filter(Boolean) as string[];

  const { data: suppliers } =
    supplierIds.length > 0
      ? await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", supplierIds)
      : { data: [] };

  const supplierMap: Record<string, string> = {};
  for (const sup of suppliers ?? []) {
    supplierMap[sup.id] = sup.name;
  }

  const result: SoutenanceBriefItem[] = latestBriefs.map((brief) => ({
    id: brief.id,
    supplierId: brief.supplier_id,
    supplierName: brief.supplier_id
      ? (supplierMap[brief.supplier_id] ?? null)
      : null,
    status: brief.status,
    reportMarkdown: brief.report_markdown ?? null,
    targetStatuses: brief.target_statuses ?? [],
    createdAt: brief.created_at,
    completedAt: brief.completed_at ?? null,
    errorMessage: brief.error_message ?? null,
  }));

  return { rfpId: rfp_id, briefs: result, count: result.length };
}
