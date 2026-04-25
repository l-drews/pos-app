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
    await this.page.waitForSelector(".o-modal__content");
    await this.fillField("Name", name);
    await this.fillField("Barcode", barcode);
    // Price field uses CurrencyInput — type into it
    const priceField = this.page
      .locator(".o-modal__content .o-field")
      .filter({ hasText: "Price" });
    const priceInput = priceField.locator("input");
    await priceInput.fill(price);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async editProduct(rowIndex: number, newName: string) {
    const row = this.page.locator(".o-table tbody .o-table__tr").nth(rowIndex);
    await row.locator(".mdi-pencil").click();
    await this.page.waitForSelector(".o-modal__content");
    await this.fillField("Name", newName);
    await this.clickButton("Save");
    await this.waitForTableLoad();
  }

  async deleteProduct(rowIndex: number) {
    const row = this.page.locator(".o-table tbody .o-table__tr").nth(rowIndex);
    await row.locator(".mdi-delete").click();
    await this.page.waitForSelector(".o-modal__content");
    await this.clickButton("Confirm");
    await this.waitForTableLoad();
  }

  async getProductNames(): Promise<string[]> {
    const cells = this.page.locator(
      ".o-table tbody .o-table__tr .o-table__td:nth-child(1)",
    );
    return cells.allTextContents();
  }
}
