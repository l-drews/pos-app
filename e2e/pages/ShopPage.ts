import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ShopPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigate("/shop");
  }

  async getCartItemCount(): Promise<number> {
    return this.getTableRowCount();
  }

  async isPayButtonDisabled(): Promise<boolean> {
    const btn = this.page.getByRole("button", { name: "Pay" });
    return btn.isDisabled();
  }
}
