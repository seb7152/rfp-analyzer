import { test, expect } from "@playwright/test";
import { auth, RFP_ID, isMobile } from "./helpers";

test.describe("Parcours 3 — décider et restituer (Claire)", () => {
  test.use({ storageState: auth("sponsor") });

  test("le sponsor atterrit sur la décision et descend jusqu'à la réponse", async ({ page }) => {
    // Entrée par le lien de la consultation : le lecteur atterrit sur la décision.
    await page.goto(`/dashboard/rfp/${RFP_ID}`);
    await expect(page).toHaveURL(/\/decision$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Décision/ })).toBeVisible();
    await expect(page.getByText(/Mieux-disant technique/)).toBeVisible();

    // Aucune action d'édition dans l'espace du sponsor.
    await expect(page.getByRole("button", { name: /Valider|Statuer|Note \d sur 5/ })).toHaveCount(0);

    // Classement et heatmap par domaine.
    const ranking = page.locator("#classement");
    await expect(ranking.getByRole("row")).not.toHaveCount(0);
    const heatmap = page.locator("#domaines");
    const cell = heatmap.getByRole("button", { name: /sur 5/ }).first();
    await cell.click();

    // Drill-down : domaine › exigence › réponse.
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("navigation", { name: "Renvois" })).toBeVisible();
    await sheet.getByRole("row").nth(1).click();
    await expect(sheet.getByText(/Réponse du fournisseur|Aucune réponse de/)).toBeVisible();
    await expect(sheet.getByText("Preuve dans le document")).toBeVisible();
    await page.keyboard.press("Escape");

    // Technique et financier, puis restitution.
    await expect(page.locator("#financier")).toContainText(/Technique et financier/);
    // Le sponsor est en lecture ("viewer") : pas de CTA d'export actionnable, seulement l'état.
    await expect(page.getByText("Export non configuré")).toBeVisible();

    if (!isMobile(page)) {
      await expect(page.getByRole("button", { name: "Présenter" })).toBeVisible();
    }
  });
});
