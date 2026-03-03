import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkSupplierColumns() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const rfpId = "4fef2cbb-30df-45af-a1ce-f9fa11ec2d54";
  
  console.log("🔍 Checking actual column values in suppliers table");
  console.log("─".repeat(60));

  // Get all columns to see actual values
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("id, name, version, is_current_version, deleted_at")
    .eq("rfp_id", rfpId);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Raw data from database:\n");
  console.log(JSON.stringify(suppliers, null, 2));
  
  console.log("\n" + "─".repeat(60));
  console.log("Summary:");
  suppliers?.forEach((s: any) => {
    console.log(`${s.name}:`);
    console.log(`  is_current_version = ${JSON.stringify(s.is_current_version)} (type: ${typeof s.is_current_version})`);
    console.log(`  version = ${JSON.stringify(s.version)} (type: ${typeof s.version})`);
    console.log(`  deleted_at = ${JSON.stringify(s.deleted_at)}`);
  });
}

checkSupplierColumns().catch(console.error);
