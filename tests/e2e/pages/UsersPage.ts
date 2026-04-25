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
    await this.page.waitForSelector(".o-modal__content");
    const modal = this.page.locator(".o-modal__content");
    const nameFields = modal.locator('.o-field').filter({ hasText: 'Name' }).locator('input');
    await nameFields.nth(0).fill(firstName);
    await nameFields.nth(1).fill(lastName);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async deleteUser(rowIndex: number) {
    const row = this.page.locator(".o-table tbody .o-table__tr").nth(rowIndex);
    await row.locator(".mdi-delete").click();
    await this.page.waitForSelector(".o-modal__content");
    await this.clickButton("Confirm");
    await this.waitForTableLoad();
  }

  async getUserCount(): Promise<number> {
    return this.getTableRowCount();
  }
}
