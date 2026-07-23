import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class GroupsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigate("/groups");
  }

  async addGroup(name: string) {
    await this.clickButton("Add group");
    await this.page.waitForSelector('[role="dialog"]');
    await this.fillField("Name", name);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async editGroup(rowIndex: number, newName: string) {
    const row = this.page.locator("table tbody tr").nth(rowIndex);
    const buttons = row.getByRole("button");
    await buttons.nth(0).click(); // edit button (first icon button)
    await this.page.waitForSelector('[role="dialog"]');
    await this.fillField("Name", newName);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async deleteGroup(rowIndex: number) {
    const row = this.page.locator("table tbody tr").nth(rowIndex);
    const buttons = row.getByRole("button");
    await buttons.nth(1).click(); // delete button (second icon button)
    await this.page.waitForSelector('[role="alertdialog"]');
    await this.clickButton("Confirm");
    await this.waitForTableLoad();
  }

  async getGroupNames(): Promise<string[]> {
    const cells = this.page.locator("table tbody tr td:nth-child(1)");
    return cells.allTextContents();
  }
}
