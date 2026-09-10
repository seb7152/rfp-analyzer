import { test as setup, expect } from "@playwright/test";

const password = process.env.E2E_PASSWORD!;

const personas = [
  { name: "pilote", email: process.env.E2E_PILOTE_EMAIL! },
  { name: "expert", email: process.env.E2E_EXPERT_EMAIL! },
  { name: "sponsor", email: process.env.E2E_SPONSOR_EMAIL! },
];

for (const persona of personas) {
  setup(`connexion ${persona.name}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("nom@exemple.com").fill(persona.email);
    await page.getByPlaceholder("Votre mot de passe").fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await page.context().storageState({ path: `e2e/.auth/${persona.name}.json` });
  });
}
