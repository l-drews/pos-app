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
});
