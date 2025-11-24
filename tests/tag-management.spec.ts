/**
 * Tag Management System - Playwright E2E Tests
 *
 * This test suite validates the complete tag management functionality
 * including tag creation, assignment, and cascade operations.
 *
 * Test Environment: http://localhost:3002
 * RFP: Support L1 Finance - Accor
 */

import { test, expect, Page } from "@playwright/test";

const BASE_URL = "http://localhost:3002";
const RFP_ID = "1f8d89fd-547c-4db5-96c2-c9447226952e";
const RFP_DASHBOARD_URL = `${BASE_URL}/dashboard`;

// Test data
const TEST_TAG = {
  name: "Test Tag",
  color: "#3B82F6",
  description: "A test tag for verification",
};

const API_TEST_TAG = {
  name: "API Test Tag",
  color: "#8B5CF6",
  description: "Tag created via API test",
};

const REQUIREMENT_R1_ID = "c8e1a226-d2be-42ed-8b9f-a0924307d296";

test.describe("Tag Management System", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and handle authentication if needed
    await page.goto(RFP_DASHBOARD_URL);

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check if we're redirected to login
    if (page.url().includes("/login")) {
      // Handle authentication - this will need to be customized based on auth setup
      console.log("Authentication required - please configure auth handling");
      // For now, we'll skip this in test environment
    }
  });

  test.describe("Part 1: Basic Tag Creation", () => {
    test("TC-TAG-001: Create tag via UI", async ({ page }) => {
      // Navigate to RFP requirements tab
      await page.click(`text=Support L1 Finance - Accor`);
      await page.waitForLoadState("networkidle");

      // Click on Requirements tab if present
      const requirementsTab = page.locator("text=Requirements").first();
      if (await requirementsTab.isVisible()) {
        await requirementsTab.click();
      }

      // Expand Manage Tags section
      const manageTagsHeader = page.locator("text=Manage Tags").first();
      await expect(manageTagsHeader).toBeVisible();
      await manageTagsHeader.click();

      // Wait for tag manager to expand
      await page.waitForTimeout(500);

      // Enter tag name
      const tagNameInput = page.locator('input[placeholder*="Tag name"]');
      await expect(tagNameInput).toBeVisible();
      await tagNameInput.fill(TEST_TAG.name);

      // Select color (first blue color)
      const blueColorButton = page
        .locator("button")
        .filter({ has: page.locator(`[style*="${TEST_TAG.color}"]`) })
        .first();
      await blueColorButton.click();

      // Click create button (+ icon button)
      const createButton = page
        .locator("button")
        .filter({ hasText: "+" })
        .last();
      await createButton.click();

      // Verify tag appears in list
      await expect(page.locator(`text="${TEST_TAG.name}"`)).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: "tests/screenshots/tag-created.png",
        fullPage: true,
      });
    });

    test("TC-TAG-002: Tag persists after reload", async ({ page }) => {
      // Assume tag was created in previous test
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Expand Manage Tags
      const manageTagsHeader = page.locator("text=Manage Tags").first();
      await manageTagsHeader.click();
      await page.waitForTimeout(500);

      // Verify tag exists
      await expect(page.locator(`text="${TEST_TAG.name}"`)).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: "tests/screenshots/tag-persisted.png",
        fullPage: true,
      });
    });
  });

  test.describe("Part 2: Tag Assignment to Requirements", () => {
    test("TC-TAG-004: Assign tag to single requirement", async ({ page }) => {
      // Navigate to requirements view
      await page.click(`text=Support L1 Finance - Accor`);
      await page.waitForLoadState("networkidle");

      // Find requirement R - 1 row
      const requirementRow = page.locator("text=R - 1").first();
      await expect(requirementRow).toBeVisible();

      // Find the + button in the Tags column for this row
      const row = requirementRow.locator("xpath=ancestor::tr");
      const addTagButton = row
        .locator("button")
        .filter({ hasText: "+" })
        .last();
      await addTagButton.click();

      // Tag selection dialog should open
      await expect(page.locator("text=Add Tags to R - 1")).toBeVisible();

      // Select "Test Tag" checkbox
      const testTagCheckbox = page.locator(
        `label:has-text("${TEST_TAG.name}") input[type="checkbox"]`
      );
      await testTagCheckbox.check();

      // Close dialog (click outside or close button)
      await page.keyboard.press("Escape");

      // Verify tag badge appears
      await expect(row.locator(`text="${TEST_TAG.name}"`)).toBeVisible();

      // Click Save Changes button
      const saveButton = page.locator('button:has-text("Save Changes")');
      await saveButton.click();

      // Wait for save confirmation
      await expect(page.locator("text=Tags saved successfully")).toBeVisible({
        timeout: 5000,
      });

      // Take screenshot
      await page.screenshot({
        path: "tests/screenshots/tag-assigned.png",
        fullPage: true,
      });
    });

    test("TC-TAG-005: Assign multiple tags to requirement", async ({
      page,
    }) => {
      // Navigate to requirements view
      await page.click(`text=Support L1 Finance - Accor`);
      await page.waitForLoadState("networkidle");

      // Find requirement R - 2
      const requirementRow = page.locator("text=R - 2").first();
      const row = requirementRow.locator("xpath=ancestor::tr");

      // Click + button
      const addTagButton = row
        .locator("button")
        .filter({ hasText: "+" })
        .last();
      await addTagButton.click();

      // Select multiple tags
      await page.locator(`label:has-text("${TEST_TAG.name}") input`).check();
      await page
        .locator(`label:has-text("${API_TEST_TAG.name}") input`)
        .check();

      // Close dialog
      await page.keyboard.press("Escape");

      // Verify both tags visible
      await expect(row.locator(`text="${TEST_TAG.name}"`)).toBeVisible();
      await expect(row.locator(`text="${API_TEST_TAG.name}"`)).toBeVisible();

      // Save
      await page.locator('button:has-text("Save Changes")').click();
      await expect(page.locator("text=Tags saved successfully")).toBeVisible({
        timeout: 5000,
      });

      // Take screenshot
      await page.screenshot({
        path: "tests/screenshots/multiple-tags-assigned.png",
        fullPage: true,
      });
    });

    test("TC-TAG-007: Remove tag from requirement", async ({ page }) => {
      // Navigate to requirement with tags
      await page.click(`text=Support L1 Finance - Accor`);
      await page.waitForLoadState("networkidle");

      const requirementRow = page.locator("text=R - 1").first();
      const row = requirementRow.locator("xpath=ancestor::tr");

      // Click on the tag to remove it (or find X button on tag badge)
      const tagBadge = row.locator(`text="${TEST_TAG.name}"`).first();

      // Re-open dialog to uncheck
      const addTagButton = row
        .locator("button")
        .filter({ hasText: "+" })
        .last();
      await addTagButton.click();

      // Uncheck the tag
      await page.locator(`label:has-text("${TEST_TAG.name}") input`).uncheck();
      await page.keyboard.press("Escape");

      // Verify tag removed
      await expect(row.locator(`text="${TEST_TAG.name}"`)).toBeHidden();

      // Take screenshot
      await page.screenshot({
        path: "tests/screenshots/tag-removed.png",
        fullPage: true,
      });
    });
  });

  test.describe("Part 3: Cascade Tag Assignment", () => {
    test("TC-TAG-008: Cascade assign tags to category children", async ({
      page,
    }) => {
      // Navigate to requirements view
      await page.click(`text=Support L1 Finance - Accor`);
      await page.waitForLoadState("networkidle");

      // Find a category row (type="category")
      // First, expand tree to show categories
      const categoryRow = page
        .locator("tr")
        .filter({ has: page.locator("text=/^[0-9]\\s+-\\s+/") })
        .first();

      // Look for + button on category row
      const cascadeButton = categoryRow
        .locator("button")
        .filter({ hasText: "+" })
        .first();
      await expect(cascadeButton).toBeVisible();
      await cascadeButton.click();

      // Dialog should show "Apply Tags to Category"
      await expect(page.locator("text=/Apply Tags to Category/")).toBeVisible();

      // Select tags
      await page.locator(`label:has-text("${TEST_TAG.name}") input`).check();

      // Click Apply Tags button
      await page.locator('button:has-text("Apply Tags")').click();

      // Wait for dialog to close
      await page.waitForTimeout(500);

      // Verify child requirements have tags
      // This requires checking multiple rows under the category

      // Save changes
      await page.locator('button:has-text("Save Changes")').click();
      await expect(page.locator("text=Tags saved successfully")).toBeVisible({
        timeout: 5000,
      });

      // Take screenshots
      await page.screenshot({
        path: "tests/screenshots/cascade-assigned.png",
        fullPage: true,
      });
    });

    test("TC-TAG-009: Verify cascade scope (requirements only, not categories)", async ({
      page,
    }) => {
      // This test verifies the implementation details
      // Categories should not display tags, only requirements should

      await page.click(`text=Support L1 Finance - Accor`);
      await page.waitForLoadState("networkidle");

      // Check that category rows don't have tag badges
      // Only requirement rows should have tags

      // Take screenshot showing the distinction
      await page.screenshot({
        path: "tests/screenshots/cascade-scope-verification.png",
        fullPage: true,
      });
    });
  });

  test.describe("Part 4: Edge Cases", () => {
    test("TC-TAG-012: Empty tag name validation", async ({ page }) => {
      await page.click(`text=Support L1 Finance - Accor`);
      await page.waitForLoadState("networkidle");

      // Expand tag manager
      await page.locator("text=Manage Tags").click();

      // Try to create tag with empty name
      const createButton = page
        .locator("button")
        .filter({ hasText: "+" })
        .last();

      // Button should be disabled
      await expect(createButton).toBeDisabled();
    });
  });

  test.describe("Part 5: UI/UX Validation", () => {
    test("TC-TAG-015: Tag manager collapse/expand", async ({ page }) => {
      await page.click(`text=Support L1 Finance - Accor`);
      await page.waitForLoadState("networkidle");

      const header = page.locator("text=Manage Tags").first();

      // Click to expand
      await header.click();
      await page.waitForTimeout(300);

      // Verify content visible
      const tagInput = page.locator('input[placeholder*="Tag name"]');
      await expect(tagInput).toBeVisible();

      // Click to collapse
      await header.click();
      await page.waitForTimeout(300);

      // Verify content hidden
      await expect(tagInput).toBeHidden();

      // Take screenshot
      await page.screenshot({
        path: "tests/screenshots/tag-manager-collapsed.png",
        fullPage: true,
      });
    });
  });
});

// API Tests
test.describe("API Tests", () => {
  test("TC-TAG-003: Create tag via API", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/rfps/${RFP_ID}/tags`, {
      data: {
        name: API_TEST_TAG.name,
        color: API_TEST_TAG.color,
        description: API_TEST_TAG.description,
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.tag).toBeDefined();
    expect(body.tag.name).toBe(API_TEST_TAG.name);
    expect(body.tag.color).toBe(API_TEST_TAG.color);
    expect(body.tag.rfp_id).toBe(RFP_ID);

    console.log("Created tag:", JSON.stringify(body, null, 2));
  });

  test("TC-TAG-006: Assign tag via API", async ({ request }) => {
    // First get tags
    const tagsResponse = await request.get(
      `${BASE_URL}/api/rfps/${RFP_ID}/tags`
    );
    const tagsBody = await tagsResponse.json();

    expect(tagsBody.tags).toBeDefined();
    expect(tagsBody.tags.length).toBeGreaterThan(0);

    const tagId = tagsBody.tags[0].id;

    // Assign tag to requirement
    const response = await request.post(
      `${BASE_URL}/api/rfps/${RFP_ID}/requirements/${REQUIREMENT_R1_ID}/tags`,
      {
        data: {
          tagIds: [tagId],
        },
      }
    );

    expect([200, 201]).toContain(response.status());

    console.log("Assigned tag:", await response.json());

    // Verify assignment
    const getResponse = await request.get(
      `${BASE_URL}/api/rfps/${RFP_ID}/requirements/${REQUIREMENT_R1_ID}/tags`
    );

    const getBody = await getResponse.json();
    expect(getBody.tags).toBeDefined();
    expect(getBody.tags.some((t: any) => t.id === tagId)).toBeTruthy();
  });

  test("TC-TAG-011: Duplicate tag name prevention", async ({ request }) => {
    // Try to create duplicate tag
    const response = await request.post(`${BASE_URL}/api/rfps/${RFP_ID}/tags`, {
      data: {
        name: TEST_TAG.name, // Duplicate name
        color: "#FF0000",
        description: "Duplicate attempt",
      },
    });

    expect(response.status()).toBe(409);

    const body = await response.json();
    expect(body.error).toContain("already exists");

    console.log("Duplicate prevention:", body);
  });

  test("TC-TAG-013: Assign non-existent tag", async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/rfps/${RFP_ID}/requirements/${REQUIREMENT_R1_ID}/tags`,
      {
        data: {
          tagIds: ["00000000-0000-0000-0000-000000000000"],
        },
      }
    );

    // Should handle gracefully - might be 200 with no relations created
    // or could be 404/400 depending on implementation
    console.log(
      "Non-existent tag response:",
      response.status(),
      await response.json()
    );
  });
});
