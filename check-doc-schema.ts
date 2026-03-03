import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkDocumentSchema() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get one document with all columns
  const { data: docs, error } = await supabase
    .from("rfp_documents")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (docs && docs.length > 0) {
    console.log("Available columns in rfp_documents table:");
    console.log(Object.keys(docs[0]));
  }
}

checkDocumentSchema().catch(console.error);
