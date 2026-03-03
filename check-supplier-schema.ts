import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkSupplierSchema() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const rfpId = "4fef2cbb-30df-45af-a1ce-f9fa11ec2d54";
  
  console.log("🔍 Checking supplier schema and versions");
  console.log("─".repeat(60));

  // Check all suppliers for this RFP
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("rfp_id", rfpId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${suppliers?.length || 0} suppliers (including all versions/deleted):\n`);
  
  suppliers?.forEach((s: any) => {
    console.log(`Supplier: ${s.name}`);
    console.log(`  ID: ${s.id}`);
    console.log(`  Version: ${s.version || "N/A"}`);
    console.log(`  Is Current: ${s.is_current_version ?? "N/A"}`);
    console.log(`  Deleted At: ${s.deleted_at || "Not deleted"}`);
    console.log(`  Created: ${s.created_at}`);
    console.log("");
  });

  // Check what a proper query should look like
  console.log("─".repeat(60));
  console.log("✅ Query for current, non-deleted suppliers:");
  console.log("");
  
  const { data: currentSuppliers } = await supabase
    .from("suppliers")
    .select("id, name, version, is_current_version")
    .eq("rfp_id", rfpId)
    .eq("is_current_version", true)
    .is("deleted_at", null);

  console.log(`Found ${currentSuppliers?.length || 0} current, non-deleted suppliers:\n`);
  currentSuppliers?.forEach((s: any) => {
    console.log(`  - ${s.name} (ID: ${s.id}, Version: ${s.version})`);
  });
}

checkSupplierSchema().catch(console.error);
