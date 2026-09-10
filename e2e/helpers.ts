import type { Page } from "@playwright/test";

export const RFP_ID = process.env.E2E_RFP_ID!;
export const RFP_EMPTY_ID = process.env.E2E_RFP_EMPTY_ID!;

export const auth = (persona: "pilote" | "expert" | "sponsor") =>
  `e2e/.auth/${persona}.json`;

/** Waits until the consultation shell has loaded its chapters. */
export async function waitForShell(page: Page) {
  await page.getByRole("navigation", { name: "Sommaire de la consultation" }).waitFor({ state: "attached" });
}

export function isMobile(page: Page) {
  const size = page.viewportSize();
  return !!size && size.width < 768;
}
