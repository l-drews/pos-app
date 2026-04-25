import { test, expect } from "@playwright/test";
import { ShopPage } from "../pages/ShopPage";

test.describe("Shop page", () => {
  let shopPage: ShopPage;

  test.beforeEach(async ({ page }) => {
    shopPage = new ShopPage(page);
    await shopPage.goto();
  });

  test("should display shop page with pay button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Pay" })).toBeVisible();
  });

  test("should have pay button disabled when no user selected", async () => {
    const disabled = await shopPage.isPayButtonDisabled();
    expect(disabled).toBeTruthy();
  });

  test("should display cart table", async ({ page }) => {
    await expect(page.locator(".o-table")).toBeVisible();
  });
});
