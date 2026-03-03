import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkAllColumns() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const rfpId = "4fef2cbb-30df-45af-a1ce-f9fa11ec2d54";
  
  // Get one supplier with all columns
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("rfp_id", rfpId)
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (suppliers && suppliers.length > 0) {
    console.log("Available columns in suppliers table:");
    console.log(Object.keys(suppliers[0]));
    console.log("\nFull record:");
    console.log(JSON.stringify(suppliers[0], null, 2));
  }
}

checkAllColumns().catch(console.error);
