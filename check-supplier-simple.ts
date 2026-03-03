import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkSuppliers() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const rfpId = "4fef2cbb-30df-45af-a1ce-f9fa11ec2d54";
  
  // Get all suppliers - just basic columns
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("id, name, deleted_at")
    .eq("rfp_id", rfpId);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Current suppliers (non-deleted):");
  const nonDeleted = suppliers?.filter(s => !s.deleted_at) || [];
  nonDeleted.forEach(s => {
    console.log(`  - ${s.name} (${s.id})`);
  });
  
  console.log("\nDeleted suppliers:");
  const deleted = suppliers?.filter(s => s.deleted_at) || [];
  if (deleted.length === 0) {
    console.log("  (none)");
  } else {
    deleted.forEach(s => {
      console.log(`  - ${s.name} (${s.id}) - deleted at ${s.deleted_at}`);
    });
  }
}

checkSuppliers().catch(console.error);
