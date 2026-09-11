import { test, type Page } from "@playwright/test";
import { auth, RFP_ID, RFP_EMPTY_ID } from "../helpers";

const out = ".impeccable/review";

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(800);
}

async function shot(page: Page, name: string, opts: { full?: boolean; dark?: boolean } = {}) {
  if (opts.dark) {
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    });
    await page.waitForTimeout(200);
  }
  const project = test.info().project.name;
  await page.screenshot({ path: `${out}/${name}-${project}${opts.dark ? "-dark" : ""}.png`, fullPage: opts.full ?? true });
  if (opts.dark) {
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    });
  }
}

test.describe("captures pilote", () => {
  test.use({ storageState: auth("pilote") });
  test("accueil, préparation, analyse, suivi, paramètres", async ({ page }) => {
    await page.goto("/dashboard");
    await settle(page);
    await shot(page, "home");
    await shot(page, "home", { dark: true });

    await page.goto(`/dashboard/rfp/${RFP_EMPTY_ID}/preparation`);
    await settle(page);
    await shot(page, "preparation");
    await shot(page, "preparation", { dark: true });

    await page.goto(`/dashboard/rfp/${RFP_EMPTY_ID}/import?dataset=exigences`);
    await settle(page);
    await page.getByRole("button", { name: "Coller du JSON" }).click();
    await page.getByLabel("JSON à importer").fill(
      JSON.stringify([
        { code: "R-900", title: "Supervision des équipements", description: "Supervision en temps réel.", category_name: "DOM1.1", is_mandatory: true },
        { code: "R-901", title: "Astreinte 24/7", description: "Astreinte permanente.", category_name: "Astreinte" },
      ])
    );
    await settle(page);
    await shot(page, "import");
    await shot(page, "import", { dark: true });

    await page.goto(`/dashboard/rfp/${RFP_ID}/analyse`);
    await settle(page);
    await shot(page, "analyse");

    await page.goto(`/dashboard/rfp/${RFP_ID}/suivi`);
    await settle(page);
    await shot(page, "suivi");

    await page.goto(`/dashboard/rfp/${RFP_ID}/parametres`);
    await settle(page);
    await shot(page, "parametres");
  });
});

test.describe("captures expert", () => {
  test.use({ storageState: auth("expert") });
  test("évaluation", async ({ page }) => {
    await page.goto(`/dashboard/rfp/${RFP_ID}/evaluate`);
    await settle(page);
    const isMobile = (page.viewportSize()?.width ?? 1440) < 768;
    if (isMobile) {
      await shot(page, "evaluate-queue", { full: false });
      await page.getByRole("listbox", { name: "Exigences" }).getByRole("option").first().click();
      await settle(page);
    }
    await shot(page, "evaluate", { full: false });
    await shot(page, "evaluate", { full: false, dark: true });
  });
});

test.describe("captures sponsor", () => {
  test.use({ storageState: auth("sponsor") });
  test("décision", async ({ page }) => {
    await page.goto(`/dashboard/rfp/${RFP_ID}/decision`);
    await settle(page);
    await shot(page, "decision");
    await shot(page, "decision", { dark: true });
    await page.locator("#domaines").getByRole("button", { name: /sur 5/ }).first().click();
    await page.waitForTimeout(800);
    await shot(page, "decision-drilldown", { full: false });
    await page.getByRole("dialog").getByRole("row").nth(1).click();
    await settle(page);
    await shot(page, "decision-drilldown-response", { full: false });
  });
});
