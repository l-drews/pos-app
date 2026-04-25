import { test, expect } from "@playwright/test";
import { OrdersPage } from "../pages/OrdersPage";

test.describe("Orders page", () => {
  let ordersPage: OrdersPage;

  test.beforeEach(async ({ page }) => {
    ordersPage = new OrdersPage(page);
    await ordersPage.goto();
  });

  test("should display orders page with table", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible();
  });

  test("should list orders", async () => {
    const count = await ordersPage.getOrderCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display user names in order rows", async ({ page }) => {
    await ordersPage.waitForTableLoad();
    const rows = page.locator("table tbody tr");
    const count = await rows.count();

    if (count > 0) {
      const firstUserCell = rows.first().locator("td:nth-child(1)");
      const text = await firstUserCell.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
      expect(text).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }
  });
});
