import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const versionId = request.nextUrl.searchParams.get("versionId");

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (versionId) {
      const { data: suppliers, error } = await supabase
        .from("suppliers")
        .select(`
          id,
          name,
          supplier_id_external,
          version_supplier_status!inner (
            is_active,
            shortlist_status
          )
        `)
        .eq("rfp_id", rfpId)
        .eq("version_supplier_status.version_id", versionId)
        .eq("version_supplier_status.is_active", true)
        .neq("version_supplier_status.shortlist_status", "removed");

      if (error) {
        console.error("Error fetching suppliers by version:", error);
        return NextResponse.json({ suppliers: [] }, { status: 200 });
      }

      const mappedSuppliers = suppliers?.map(s => ({
        id: s.id,
        name: s.name,
        supplier_id_external: s.supplier_id_external
      })) || [];

      return NextResponse.json({ suppliers: mappedSuppliers });
    } else {
      const { data: suppliers, error } = await supabase
        .from("suppliers")
        .select("id, name, supplier_id_external")
        .eq("rfp_id", rfpId);

      if (error) {
        console.error("Error fetching suppliers:", error);
        return NextResponse.json({ suppliers: [] }, { status: 200 });
      }

      return NextResponse.json({ suppliers: suppliers || [] });
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ suppliers: [] }, { status: 200 });
  }
}
