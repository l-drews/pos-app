import { test, expect } from "@playwright/test";
import { GroupsPage } from "../pages/GroupsPage";

test.describe("Groups CRUD", () => {
  let groupsPage: GroupsPage;

  test.beforeEach(async ({ page }) => {
    groupsPage = new GroupsPage(page);
    await groupsPage.goto();
  });

  test("should display groups page", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Add group" })).toBeVisible();
  });

  test("should create a group", async ({ page }) => {
    const name = `E2E Group ${Date.now()}`;
    await groupsPage.addGroup(name);
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
  });

  test("should display groups in table", async () => {
    const names = await groupsPage.getGroupNames();
    expect(Array.isArray(names)).toBeTruthy();
  });
});
