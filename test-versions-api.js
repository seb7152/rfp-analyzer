// Test script to debug the versions API
const { createClient } = require("@supabase/supabase-js");

// Read connection values from the environment. Set these before running:
//   SUPABASE_URL=https://<project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<service_role key>  (keep this out of version control)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testVersionsAPI() {
  const rfpId = "1f8d89fd-547c-4db5-96c2-c9447226952e";

  console.log("Testing versions API for RFP:", rfpId);

  // Get versions
  const { data: versions, error: versionsError } = await supabase
    .from("evaluation_versions")
    .select("*")
    .eq("rfp_id", rfpId)
    .order("version_number", { ascending: true });

  if (versionsError) {
    console.error("Versions error:", versionsError);
    return;
  }

  console.log("Found versions:", versions?.length);

  for (const version of versions) {
    console.log(`\nVersion ${version.version_number}: ${version.version_name}`);

    // Test the exact query from the API
    const { count: activeCount, error: activeError } = await supabase
      .from("version_supplier_status")
      .select("id", { count: "exact", head: true })
      .eq("version_id", version.id)
      .in("shortlist_status", ["active", "shortlisted"]);

    if (activeError) {
      console.error("Active count error:", activeError);
    } else {
      console.log(`Active suppliers count: ${activeCount}`);
    }

    // Also test raw data
    const { data: statusData, error: statusError } = await supabase
      .from("version_supplier_status")
      .select("supplier_id, shortlist_status")
      .eq("version_id", version.id);

    if (statusError) {
      console.error("Status data error:", statusError);
    } else {
      console.log("Raw status data:", statusData);
      const activeCount =
        statusData?.filter((s) => s.shortlist_status === "active").length || 0;
      console.log(`Manual active count: ${activeCount}`);
    }
  }
}

testVersionsAPI().catch(console.error);
