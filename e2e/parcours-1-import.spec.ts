import { test, expect } from "@playwright/test";
import { auth } from "./helpers";

const DOMAINES = JSON.stringify([
  { id: "EXP", code: "E2E-EXP", title: "Exploitation E2E", short_name: "Exploit", level: 1 },
  { id: "EXP-SUP", code: "E2E-EXP.1", title: "Supervision E2E", short_name: "Superv", level: 2, parent_id: "EXP" },
  { id: "BAD", code: "E2E-BAD", title: "Sans niveau", short_name: "Bad", level: 9 },
]);

const EXIGENCES = JSON.stringify([
  {
    code: "E2E-R-1",
    title: "Supervision temps réel",
    description: "La solution supervise les équipements.",
    category_name: "E2E-EXP.1",
    is_mandatory: true,
  },
  {
    code: "E2E-R-2",
    title: "Astreinte",
    description: "Astreinte 24/7.",
    category_name: "Domaine inconnu",
  },
]);

const FOURNISSEURS = JSON.stringify([
  { id: "E2E-SUP", name: "Fournisseur E2E", contact_email: "contact@e2e.test" },
  { id: "E2E-BAD" },
]);

test.describe("Parcours 1 — importer des jeux de données (Sophie)", () => {
  test.use({ storageState: auth("pilote") });

  test("la lecture précède l'écriture, ligne à ligne", async ({ page, request }) => {
    // Une consultation jetable, supprimée en fin de test.
    const title = `E2E import ${Date.now()}`;
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Nouvelle consultation" }).click();
    await page.getByLabel("Titre").fill(title);
    await page.getByRole("button", { name: "Créer la consultation" }).click();
    await expect(page).toHaveURL(/\/preparation$/, { timeout: 30_000 });
    const rfpId = page.url().match(/rfp\/([0-9a-f-]+)\//)?.[1];
    expect(rfpId).toBeTruthy();

    try {
      await page.goto(`/dashboard/rfp/${rfpId}/import`);
      await expect(page.getByRole("heading", { name: "Importer des données" })).toBeVisible();

      // Domaines : deux lignes lisibles, une refusée, et le compte est annoncé.
      await page.getByRole("button", { name: "Coller du JSON" }).click();
      await page.getByLabel("JSON à importer").fill(DOMAINES);
      await expect(page.getByText("le domaine parent", { exact: false })).toHaveCount(0);
      await expect(page.getByText("level doit être un entier de 1 à 4")).toBeVisible();
      const importer = page.getByRole("button", { name: /^Importer 2 lignes$/ });
      await expect(importer).toBeEnabled();
      await importer.click();
      await expect(page.getByText(/2 domaines créés/).first()).toBeVisible({ timeout: 20_000 });

      // Le format attendu se copie comme prompt.
      await page.getByRole("button", { name: "Format attendu" }).click();
      await expect(page.getByRole("dialog")).toContainText("Tu convertis un tableau en JSON d'import");
      await expect(page.getByRole("button", { name: "Copier le prompt" })).toBeVisible();
      await page.getByRole("tab", { name: "Prompt · agent" }).click();
      await expect(page.getByRole("dialog")).toContainText("connecteur MCP");
      await expect(page.getByRole("dialog")).toContainText("import_structure");
      await page.keyboard.press("Escape");

      // Exigences : le domaine importé est reconnu, l'inconnu est refusé.
      await page.getByRole("button", { name: "Exigences" }).click();
      await page.getByRole("button", { name: "Coller du JSON" }).click();
      await page.getByLabel("JSON à importer").fill(EXIGENCES);
      await expect(page.getByText("nouvelle exigence")).toBeVisible();
      await expect(page.getByText(/le domaine « Domaine inconnu » n'existe pas/)).toBeVisible();
      await page.getByRole("button", { name: /^Importer 1 ligne$/ }).click();
      await expect(page.getByText(/1 exigence créée/).first()).toBeVisible({ timeout: 20_000 });

      // L'état du jeu de données suit l'import.
      await expect(page.getByRole("button", { name: /Exigences/ })).toContainText("1 importée");

      // Fournisseurs : le même travail par fichier déposé.
      await page.getByRole("button", { name: "Fournisseurs" }).click();
      await page.locator('input[type="file"]').setInputFiles({
        name: "fournisseurs.json",
        mimeType: "application/json",
        buffer: Buffer.from(FOURNISSEURS, "utf8"),
      });
      await expect(page.getByText("fournisseurs.json")).toBeVisible();
      await expect(page.getByText("2 lignes lues")).toBeVisible();
      await expect(page.getByText("name manquant")).toBeVisible();
      await page.getByRole("button", { name: /^Importer 1 ligne$/ }).click();
      await expect(page.getByText(/1 fournisseur créé/).first()).toBeVisible({ timeout: 20_000 });
    } finally {
      const del = await request.delete(`/api/rfps/${rfpId}`);
      expect(del.ok()).toBeTruthy();
    }
  });
});
