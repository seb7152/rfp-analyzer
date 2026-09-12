import { test, expect } from "@playwright/test";
import { auth, RFP_ID, waitForShell } from "./helpers";

test.describe("Parcours 4 — soutenances (Sophie, puis Claire)", () => {
  test.describe("pilote", () => {
    test.use({ storageState: auth("pilote") });

    test("le chapitre liste la synthèse et une séance par fournisseur retenu", async ({ page }) => {
      await page.goto(`/dashboard/rfp/${RFP_ID}/soutenances`);
      await waitForShell(page);
      await expect(page.getByRole("heading", { name: "Soutenances", level: 1 })).toBeVisible();
      // Le sommaire porte le chapitre entre Évaluation et Décision.
      const rail = page.getByRole("navigation", { name: "Sommaire de la consultation" });
      await expect(rail.getByRole("link", { name: /Soutenances/ })).toBeVisible();

      // Point de synthèse : le tableau des notes par domaine, avec la moyenne des retenus.
      const synthese = page.locator("#synthese");
      await expect(synthese.getByRole("heading", { name: "Point de synthèse" })).toBeVisible();
      await expect(synthese.getByRole("table", { name: "Notes par domaine" })).toBeVisible();
      await expect(synthese.getByText(/Moyenne/)).toBeVisible();

      // Séances : une ligne par fournisseur retenu, la ligne mène à la séance.
      const seances = page.locator("#seances");
      await expect(seances.getByRole("heading", { name: "Séances" })).toBeVisible();
      const first = seances.getByRole("row").nth(1).getByRole("link").first();
      const supplier = (await first.textContent())?.trim() ?? "";
      await first.click();
      await expect(page).toHaveURL(/\/soutenances\/[0-9a-f-]+$/);
      await expect(page.getByRole("heading", { name: supplier, level: 1 })).toBeVisible();
      for (const step of ["Brief", "Transcript", "Compte rendu", "Propositions"]) {
        await expect(page.getByRole("heading", { name: step, level: 2 })).toBeVisible();
      }
      // Les onglets passent d'une séance à l'autre.
      await expect(page.getByRole("navigation", { name: "Séances" }).getByRole("link", { name: supplier })).toHaveAttribute("aria-current", "page");
    });
  });

  test.describe("sponsor", () => {
    test.use({ storageState: auth("sponsor") });

    test("le sponsor lit le chapitre sans pouvoir rien générer", async ({ page }) => {
      await page.goto(`/dashboard/rfp/${RFP_ID}/soutenances`);
      await waitForShell(page);
      await expect(page.getByRole("heading", { name: "Soutenances", level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: /Générer|Régénérer|Planifier/ })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Exporter" })).toBeVisible();
    });
  });
});
