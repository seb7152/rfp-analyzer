/**
 * Test validation script to debug Vertex Search no-results issue
 * Run with: npx tsx test-validation.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local file
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supplierId = "c7ebad76-aac8-45d6-914e-12472c610327";

async function validateDocuments() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log("🔍 Validating documents for supplier:", supplierId);
  console.log("─".repeat(60));

  // 1. Check if supplier exists
  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("id, name, rfp_id")
    .eq("id", supplierId)
    .single();

  if (supplierError || !supplier) {
    console.error("❌ Supplier not found:", supplierError);
    return;
  }

  console.log("✅ Supplier found:", supplier.name);
  console.log("   RFP ID:", supplier.rfp_id);
  console.log("");

  // 2. Check RFP organization
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, title, organization_id")
    .eq("id", supplier.rfp_id)
    .single();

  if (rfpError || !rfp) {
    console.error("❌ RFP not found:", rfpError);
    return;
  }

  console.log("✅ RFP found:", rfp.title);
  console.log("   Organization ID:", rfp.organization_id);
  console.log("");

  // 3. Check document_suppliers associations
  const { data: docSuppliers, error: docSuppliersError } = await supabase
    .from("document_suppliers")
    .select(
      `
      document_id,
      documents:rfp_documents!inner(
        id,
        filename,
        gcs_object_name,
        rfp_id,
        deleted_at
      )
    `
    )
    .eq("supplier_id", supplierId)
    .eq("documents.rfp_id", supplier.rfp_id)
    .is("documents.deleted_at", null);

  if (docSuppliersError) {
    console.error("❌ Error fetching document suppliers:", docSuppliersError);
    return;
  }

  console.log(
    `✅ Found ${docSuppliers?.length || 0} documents for supplier`
  );

  if (!docSuppliers || docSuppliers.length === 0) {
    console.log("⚠️  No documents found in database for this supplier");
    console.log("   This explains why Vertex Search returns no results");
    console.log("");
    console.log("💡 Possible solutions:");
    console.log("   1. Upload documents for this supplier");
    console.log("   2. Associate existing documents with this supplier");
    return;
  }

  console.log("");
  console.log("📄 Documents:");
  docSuppliers.forEach((ds: any, index: number) => {
    console.log(`   ${index + 1}. ${ds.documents.filename}`);
    console.log(`      GCS Object: ${ds.documents.gcs_object_name}`);
    console.log(
      `      Full URI: gs://rfps-documents/${ds.documents.gcs_object_name}`
    );
    console.log("");
  });

  // 4. Show what the GCS URI filter would be
  const gcsUris = docSuppliers.map(
    (ds: any) => `gcs_uri:"gs://rfps-documents/${ds.documents.gcs_object_name}"`
  );
  const gcsUriFilter = gcsUris.join(" OR ");

  console.log("📋 Expected Vertex AI Search filter:");
  console.log("   " + gcsUriFilter);
  console.log("");

  // 5. Show fallback filter (all RFP docs)
  const fallbackFilter = `gcs_uri:"gs://rfps-documents/rfps/${rfp.organization_id}/${supplier.rfp_id}/*"`;
  console.log("📋 Fallback filter (all RFP docs):");
  console.log("   " + fallbackFilter);
  console.log("");

  console.log("─".repeat(60));
  console.log("✅ Validation complete");
  console.log(
    "💡 Check if these GCS URIs exist in your Vertex AI Search index"
  );
}

validateDocuments().catch(console.error);
