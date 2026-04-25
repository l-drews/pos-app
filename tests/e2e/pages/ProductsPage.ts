import { type Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ProductsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigate("/products");
  }

  async addProduct(name: string, barcode: string, price: string) {
    await this.clickButton("Add product");
    await this.page.waitForSelector('[role="dialog"]');
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByLabel("Barcode").fill(barcode);
    const priceInput = dialog.locator('label:has-text("Price") + *').locator("input").first();
    if (await priceInput.count() === 0) {
      // fallback: find input after Price label
      const allInputs = dialog.locator("input");
      await allInputs.nth(2).fill(price);
    } else {
      await priceInput.fill(price);
    }
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async editProduct(rowIndex: number, newName: string) {
    const row = this.page.locator("table tbody tr").nth(rowIndex);
    const buttons = row.getByRole("button");
    await buttons.nth(0).click();
    await this.page.waitForSelector('[role="dialog"]');
    await this.page.locator('[role="dialog"]').getByLabel("Name").fill(newName);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async deleteProduct(rowIndex: number) {
    const row = this.page.locator("table tbody tr").nth(rowIndex);
    const buttons = row.getByRole("button");
    await buttons.nth(1).click();
    await this.page.waitForSelector('[role="alertdialog"]');
    await this.clickButton("Confirm");
    await this.waitForTableLoad();
  }

  async getProductNames(): Promise<string[]> {
    const cells = this.page.locator("table tbody tr td:nth-child(1)");
    return cells.allTextContents();
  }
}
