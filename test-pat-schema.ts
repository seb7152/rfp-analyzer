import { createServiceClient } from "./lib/supabase/service";
const supabase = createServiceClient();
async function run() {
  const { data, error } = await supabase.from("personal_access_tokens").select("*").limit(1);
  console.log(error ? error : Object.keys(data[0] || {}));
}
run();
