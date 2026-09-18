import { test, expect } from "@playwright/test";
import { auth, RFP_EMPTY_ID, isMobile } from "./helpers";

test.describe("Parcours 1 — préparer une consultation (Sophie)", () => {
  test.use({ storageState: auth("pilote") });

  test("de la création au plan de préparation", async ({ page, request }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Consultations");
    await expect(page.getByText("Aujourd'hui")).toBeVisible();
    await expect(page.getByRole("tab", { name: /Toutes/ })).toBeVisible();

    // Créer une consultation
    const title = `E2E consultation ${Date.now()}`;
    await page.getByRole("button", { name: "Nouvelle consultation" }).click();
    await page.getByLabel("Titre").fill(title);
    await page.getByLabel("Description").fill("Créée par le test de bout en bout");
    await page.getByRole("button", { name: "Créer la consultation" }).click();

    // On atterrit sur le plan de préparation, qui nomme la prochaine action.
    await expect(page).toHaveURL(/\/preparation$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Préparation/ })).toBeVisible();
    await expect(page.getByText("Prochaine action : importer le cahier des charges")).toBeVisible();
    await expect(page.getByRole("button", { name: "Importer le cahier des charges" }).first()).toBeVisible();

    // Les étapes du plan, dans l'ordre : référentiel, pondérations, fournisseurs, réponses.
    await expect(page.getByRole("heading", { name: "Cahier des charges et référentiel" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pondérations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fournisseurs consultés" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Réponses des fournisseurs" })).toBeVisible();
    const titres = await page.getByRole("heading", { level: 2 }).allInnerTexts();
    expect(titres.indexOf("Pondérations")).toBeLessThan(titres.indexOf("Fournisseurs consultés"));

    // Déclarer un fournisseur depuis le plan.
    await page.getByLabel("Nom du fournisseur").fill("Fournisseur E2E");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Fournisseur E2E")).toBeVisible();

    // Nettoyage : suppression de la consultation créée.
    const rfpId = page.url().match(/rfp\/([0-9a-f-]+)\//)?.[1];
    expect(rfpId).toBeTruthy();
    const del = await request.delete(`/api/rfps/${rfpId}`);
    expect(del.ok()).toBeTruthy();
  });

  test("le sommaire reflète la progression et l'analyse IA est scénarisée", async ({ page }) => {
    await page.goto(`/dashboard/rfp/${RFP_EMPTY_ID}/preparation`);
    await expect(page.getByRole("heading", { name: /Préparation/ })).toBeVisible();

    if (!isMobile(page)) {
      const rail = page.getByRole("navigation", { name: "Sommaire de la consultation" });
      await expect(rail.getByRole("link", { name: /Préparation/ })).toBeVisible();
      await expect(rail.getByRole("link", { name: /Analyse IA/ })).toBeVisible();
      await expect(rail.getByRole("link", { name: /Évaluation/ })).toBeVisible();
    }

    // Chapitre Analyse IA : état, compteur, action de lancement (dialogue seulement, sans lancer).
    await page.goto(`/dashboard/rfp/${RFP_EMPTY_ID}/analyse`);
    await expect(page.getByRole("heading", { name: /Analyse IA/ })).toBeVisible();
    await expect(page.getByText(/réponses notées|Réponses/)).toBeVisible();
    const launch = page.getByRole("button", { name: /Lancer l'analyse IA|Relancer l'analyse/ });
    if (await launch.isVisible()) {
      await launch.click();
      await expect(page.getByRole("dialog")).toContainText("Périmètre");
      await expect(page.getByRole("dialog")).toContainText("Ordre de grandeur");
      await page.getByRole("button", { name: "Annuler" }).click();
    }
  });
});
