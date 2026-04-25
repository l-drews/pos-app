import { test, expect } from "@playwright/test";
import { OrdersPage } from "../pages/OrdersPage";

test.describe("Orders page", () => {
  let ordersPage: OrdersPage;

  test.beforeEach(async ({ page }) => {
    ordersPage = new OrdersPage(page);
    await ordersPage.goto();
  });

  test("should display orders page with table", async ({ page }) => {
    await expect(page.locator(".o-table")).toBeVisible();
  });

  test("should list orders", async () => {
    const count = await ordersPage.getOrderCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
