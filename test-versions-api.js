// Test script to debug the versions API
const { createClient } = require("@supabase/supabase-js");

// Use the hardcoded values from the project
const supabase = createClient(
  "https://ixxmjmxfzipxmlwmqods.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eG1qbXhmaXB4bWx3bXFvZHMiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzMzNTQ0MjQ2LCJleHAiOjIwNDkxMjAyNDZ9.5Xu4W-7Kz2XJhMjKL9jz3t9J2M4S6RqT7JY3mF8D0k"
);

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
