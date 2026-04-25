import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class UsersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigate("/users");
  }

  async addUser(firstName: string, lastName: string) {
    await this.clickButton("Add user");
    await this.page.waitForSelector('[role="dialog"]');
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.getByLabel("First Name").fill(firstName);
    await dialog.getByLabel("Last Name").fill(lastName);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async deleteUser(rowIndex: number) {
    const row = this.page.locator("table tbody tr").nth(rowIndex);
    const buttons = row.getByRole("button");
    await buttons.nth(1).click(); // delete button
    await this.page.waitForSelector('[role="alertdialog"]');
    await this.clickButton("Confirm");
    await this.waitForTableLoad();
  }

  async getUserCount(): Promise<number> {
    return this.getTableRowCount();
  }
}
