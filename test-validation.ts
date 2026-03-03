import { validateToken } from "./lib/pat/token";
async function run() {
  const t = await validateToken("rfpa_4I8xeQglaR3vkt1MZ1BdHoaz7B3Qx-1lx03nu89lnm0");
  console.log("Valid?", t);
}
run();
