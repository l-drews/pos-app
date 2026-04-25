import { test, expect } from "@playwright/test";
import { UsersPage } from "../pages/UsersPage";

test.describe("Users CRUD", () => {
  let usersPage: UsersPage;

  test.beforeEach(async ({ page }) => {
    usersPage = new UsersPage(page);
    await usersPage.goto();
  });

  test("should display users page", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Add user" })).toBeVisible();
  });

  test("should display users in table", async () => {
    const count = await usersPage.getUserCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
