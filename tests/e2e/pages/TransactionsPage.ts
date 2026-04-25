import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class TransactionsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigate("/transactions");
  }

  async createTransaction() {
    await this.clickButton("Create transaction");
    await this.page.waitForSelector(".o-modal__content");
  }

  async getTransactionCount(): Promise<number> {
    return this.getTableRowCount();
  }
}
