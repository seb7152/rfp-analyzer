import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Captures d'écran de revue (desktop, mobile, sombre). `npx playwright test -c playwright.captures.config.ts` */
export default defineConfig({
  ...base,
  testDir: "./e2e/captures",
  testIgnore: undefined,
  reporter: [["list"]],
});
