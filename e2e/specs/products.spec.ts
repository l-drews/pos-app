import { test, expect } from "@playwright/test";
import { ProductsPage } from "../pages/ProductsPage";

test.describe("Products CRUD", () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
    await productsPage.goto();
  });

  test("should display products page", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Add product" })).toBeVisible();
  });

  test("should create a product", async ({ page }) => {
    const ts = Date.now();
    const name = `E2E Product ${ts}`;
    const barcode = `${ts}`.slice(-13).padStart(13, "0");
    await productsPage.addProduct(name, barcode, "250");
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
  });

  test("should display products in table", async () => {
    const names = await productsPage.getProductNames();
    expect(Array.isArray(names)).toBeTruthy();
  });
});
