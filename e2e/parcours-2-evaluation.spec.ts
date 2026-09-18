import { test, expect, type Page } from "@playwright/test";
import { auth, RFP_ID, isMobile } from "./helpers";

interface Snapshot {
  id: string;
  manual_score: number | null;
  status: string;
  is_checked: boolean;
}

/** Reads the first supplier answer of the selected requirement, to restore it after the test. */
async function snapshotFirstResponse(page: Page): Promise<Snapshot> {
  const requirementId = new URL(page.url()).searchParams.get("requirementId");
  const res = await page.request.get(`/api/rfps/${RFP_ID}/responses?requirementId=${requirementId}`);
  const body = await res.json();
  const first = body.responses[0];
  return { id: first.id, manual_score: first.manual_score, status: first.status, is_checked: first.is_checked };
}

async function restore(page: Page, snap: Snapshot) {
  const versionParam = new URL(page.url()).searchParams.get("versionId");
  const res = await page.request.put(`/api/responses/${snap.id}${versionParam ? `?versionId=${versionParam}` : ""}`, {
    data: { manual_score: snap.manual_score, status: snap.status, is_checked: snap.is_checked },
  });
  if (!res.ok()) throw new Error(`restore failed: ${res.status()}`);
}

async function openFirstRequirement(page: Page) {
  await page.goto(`/dashboard/rfp/${RFP_ID}/evaluate`);
  const queue = page.getByRole("listbox", { name: "Exigences" });
  await expect(queue).toBeVisible();
  await page.getByRole("tab", { name: /Toutes/ }).click();
  const first = queue.getByRole("option").first();
  await first.click();
  await expect(page).toHaveURL(/requirementId=/);
  // The answers are loaded when a score rail is enabled.
  await expect(page.getByRole("article").first().getByRole("button", { name: "Note 3 sur 5" })).toBeEnabled();
  await page.waitForLoadState("networkidle");
}

test.describe("Parcours 2 — évaluer les réponses (Marc)", () => {
  test.use({ storageState: auth("expert") });

  test("filtrer, noter en un geste, passer à la suivante", async ({ page }) => {
    await openFirstRequirement(page);
    const snap = await snapshotFirstResponse(page);

    const column = page.getByRole("article").first();
    await expect(column).toBeVisible();

    try {
      // Un clic sur la note : une seule requête d'écriture, statut dérivé, réponse évaluée.
      const put = page.waitForResponse((r) => r.url().includes(`/api/responses/${snap.id}`) && r.request().method() === "PUT");
      await column.getByRole("button", { name: "Note 2 sur 5" }).click();
      const response = await put;
      expect(response.ok()).toBeTruthy();
      expect(response.request().postDataJSON()).toMatchObject({ manual_score: 2, status: "partial", is_checked: true });
      await expect(column.locator("header")).toContainText("Partiel");
      await expect(column.getByText("Évaluée")).toBeVisible();
      await expect(column.getByRole("button", { name: "Note 2 sur 5" })).toHaveAttribute("aria-pressed", "true");

      // Le retour à la note IA est un geste aussi.
      await column.getByRole("button", { name: /^IA |^Effacer$/ }).click();
      await page.waitForResponse((r) => r.url().includes(`/api/responses/${snap.id}`) && r.request().method() === "PUT");
      await column.getByTitle("Remettre à évaluer").click();
      await page.waitForResponse((r) => r.url().includes(`/api/responses/${snap.id}`) && r.request().method() === "PUT");
      await expect(column.getByText("Évaluée")).toHaveCount(0);
    } finally {
      await restore(page, snap);
    }

    // Suivante : clavier sur desktop, bouton sur mobile.
    const before = page.url();
    if (isMobile(page)) {
      await page.getByRole("button", { name: /Suivante/ }).click();
    } else {
      await page.keyboard.press("ArrowRight");
    }
    await expect.poll(() => page.url()).not.toBe(before);
  });

  test("la file de travail filtre par statut et par recherche", async ({ page }) => {
    await page.goto(`/dashboard/rfp/${RFP_ID}/evaluate`);
    const queue = page.getByRole("listbox", { name: "Exigences" });
    await expect(queue).toBeVisible();
    await page.getByRole("tab", { name: /Toutes/ }).click();
    const all = await queue.getByRole("option").count();
    expect(all).toBeGreaterThan(0);

    await page.getByLabel("Rechercher une exigence").fill("zzzz-introuvable");
    await expect(page.getByText("Aucune exigence ne correspond.")).toBeVisible();
    await page.getByLabel("Rechercher une exigence").fill("");

    await page.getByRole("button", { name: "Filtres" }).click();
    await page.getByRole("button", { name: "Non conforme", exact: true }).click();
    await page.keyboard.press("Escape");
    const filtered = await queue.getByRole("option").count();
    expect(filtered).toBeLessThanOrEqual(all);
    await page.getByRole("button", { name: "Filtres" }).click();
    await page.getByText("Réinitialiser").click();
    await page.keyboard.press("Escape");
  });

  test("hors ligne, la saisie est mise en file puis rejouée", async ({ page, context }) => {
    await openFirstRequirement(page);
    const snap = await snapshotFirstResponse(page);
    const column = page.getByRole("article").first();
    await expect(column).toBeVisible();

    try {
      await context.setOffline(true);
      await column.getByRole("button", { name: "Note 3 sur 5" }).click();
      await expect(page.getByRole("status").filter({ hasText: /Hors ligne/ }).first()).toContainText("1 en attente");
      await expect(column.getByRole("button", { name: "Note 3 sur 5" })).toHaveAttribute("aria-pressed", "true");

      const replay = page.waitForResponse((r) => r.url().includes(`/api/responses/${snap.id}`) && r.request().method() === "PUT", { timeout: 30_000 });
      await context.setOffline(false);
      expect((await replay).ok()).toBeTruthy();
      await expect(page.getByRole("status").filter({ hasText: /Hors ligne/ })).toHaveCount(0);
    } finally {
      await context.setOffline(false);
      await restore(page, snap);
    }
  });
});
