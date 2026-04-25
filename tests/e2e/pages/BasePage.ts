import { type Page, type Locator } from "@playwright/test";

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string) {
    await this.page.goto(path);
    await this.page.waitForSelector('[data-testid="sidebar"]', {
      timeout: 15_000,
    });
  }

  getTable(): Locator {
    return this.page.locator(".o-table");
  }

  async getTableRowCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    const rows = this.page.locator(".o-table tbody .o-table__tr");
    return rows.count();
  }

  async clickButton(text: string) {
    await this.page.getByRole("button", { name: text }).click();
  }

  async fillField(label: string, value: string) {
    const field = this.page.locator(`.o-field`).filter({ hasText: label });
    await field.locator("input").fill(value);
  }

  async waitForTableLoad() {
    await this.page.waitForTimeout(3000);
  }
}
