import { waitForCartWrite } from '../utils/network.js';
import { BasePage } from './BasePage.js';

export class ProductPage extends BasePage {
  constructor(page) {
    super(page);
    this.name = this.dt('product-name');
    this.unitPrice = this.dt('unit-price');
    this.description = this.dt('product-description');
    this.quantity = this.dt('quantity');
    this.increaseQuantity = this.dt('increase-quantity');
    this.decreaseQuantity = this.dt('decrease-quantity');
    this.addToCartButton = this.dt('add-to-cart');
    this.addToFavoritesButton = this.dt('add-to-favorites');
    this.addToCompareButton = this.dt('add-to-compare');
    // No data-test hook; the category/brand tags below the title are the only
    // elements carrying these accessible names, observed against staging.
    this.categoryTag = page.locator('[aria-label="category"]');
    this.brandTag = page.locator('[aria-label="brand"]');
  }

  async setQuantity(value) {
    await this.quantity.fill(String(value));
  }

  async increaseQuantityBy(times) {
    for (let i = 0; i < times; i += 1) {
      await this.increaseQuantity.click();
    }
  }

  async addToCart() {
    const write = waitForCartWrite(this.page);
    await this.addToCartButton.click();
    await write;
  }
}
