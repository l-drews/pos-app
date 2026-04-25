import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class OrdersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigate("/orders");
  }

  async getOrderCount(): Promise<number> {
    return this.getTableRowCount();
  }
}
