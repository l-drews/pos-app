import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class RolesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigate("/roles");
  }

  async addRole(name: string) {
    await this.clickButton("Add role");
    await this.page.waitForSelector(".o-modal__content");
    await this.fillField("Name", name);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async editRole(rowIndex: number, newName: string) {
    const row = this.page.locator(".o-table tbody .o-table__tr").nth(rowIndex);
    await row.locator(".mdi-pencil").click();
    await this.page.waitForSelector(".o-modal__content");
    await this.fillField("Name", newName);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async deleteRole(rowIndex: number) {
    const row = this.page.locator(".o-table tbody .o-table__tr").nth(rowIndex);
    await row.locator(".mdi-delete").click();
    await this.page.waitForSelector(".o-modal__content");
    await this.clickButton("Confirm");
    await this.waitForTableLoad();
  }

  async getRoleNames(): Promise<string[]> {
    const cells = this.page.locator(
      ".o-table tbody .o-table__tr .o-table__td:nth-child(1)",
    );
    return cells.allTextContents();
  }
}
