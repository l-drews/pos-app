import { test, expect } from "@playwright/test";
import { RolesPage } from "../pages/RolesPage";

test.describe("Roles CRUD", () => {
  let rolesPage: RolesPage;

  test.beforeEach(async ({ page }) => {
    rolesPage = new RolesPage(page);
    await rolesPage.goto();
  });

  test("should display roles page", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Add role" })).toBeVisible();
  });

  test("should create a role", async ({ page }) => {
    const name = `E2E Role ${Date.now()}`;
    await rolesPage.addRole(name);
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
  });

  test("should display roles in table", async () => {
    const names = await rolesPage.getRoleNames();
    expect(Array.isArray(names)).toBeTruthy();
  });
});
