import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const rfpId = "4fef2cbb-30df-45af-a1ce-f9fa11ec2d54";

async function checkRfpDocuments() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log("🔍 Checking all documents for RFP:", rfpId);
  console.log("─".repeat(60));

  // Check all documents for this RFP
  const { data: allDocs, error: docsError } = await supabase
    .from("rfp_documents")
    .select("id, filename, gcs_object_name, created_at")
    .eq("rfp_id", rfpId)
    .is("deleted_at", null);

  if (docsError) {
    console.error("❌ Error fetching documents:", docsError);
    return;
  }

  console.log(`✅ Found ${allDocs?.length || 0} total documents for this RFP`);
  console.log("");

  if (allDocs && allDocs.length > 0) {
    console.log("📄 All documents:");
    for (const doc of allDocs) {
      console.log(`   - ${doc.filename}`);
      console.log(`     ID: ${doc.id}`);
      console.log(`     GCS: ${doc.gcs_object_name}`);

      // Check if this document has supplier associations
      const { data: suppliers } = await supabase
        .from("document_suppliers")
        .select("supplier:suppliers(name)")
        .eq("document_id", doc.id);

      if (suppliers && suppliers.length > 0) {
        console.log(`     Suppliers: ${suppliers.map((s: any) => s.supplier?.name).join(", ")}`);
      } else {
        console.log(`     Suppliers: ⚠️  None (unassociated)`);
      }
      console.log("");
    }
  }

  console.log("─".repeat(60));
}

checkRfpDocuments().catch(console.error);
