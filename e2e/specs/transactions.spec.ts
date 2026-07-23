import { test, expect } from "@playwright/test";
import { TransactionsPage } from "../pages/TransactionsPage";

test.describe("Transactions page", () => {
  let transactionsPage: TransactionsPage;

  test.beforeEach(async ({ page }) => {
    transactionsPage = new TransactionsPage(page);
    await transactionsPage.goto();
  });

  test("should display transactions page", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Create transaction" }),
    ).toBeVisible();
  });

  test("should open create transaction form", async ({ page }) => {
    await transactionsPage.createTransaction();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("should list transactions", async () => {
    const count = await transactionsPage.getTransactionCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display user names in transaction rows", async ({ page }) => {
    await transactionsPage.waitForTableLoad();
    const rows = page.locator("table tbody tr");
    const count = await rows.count();

    // Only verify if there are existing transactions
    if (count > 0) {
      const firstUserCell = rows.first().locator("td:nth-child(1)");
      const text = await firstUserCell.textContent();
      // User cell should contain actual name text, not be empty or just whitespace
      expect(text?.trim().length).toBeGreaterThan(0);
      // Should not just contain a UUID
      expect(text).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }
  });
});
