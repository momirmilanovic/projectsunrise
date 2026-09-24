import { waitForCartDelete } from '../utils/network.js';
import { exactText } from '../utils/text.js';
import { BasePage } from './BasePage.js';

export class CartPage extends BasePage {
  constructor(page) {
    super(page);
    this.total = this.dt('cart-total');
    this.proceedToCheckout = this.dt('proceed-1');
     this.proceedToCheckout2 = this.dt('proceed-2');
    this.continueShopping = this.dt('continue-shopping');
  }

  async open() {
    await this.page.goto('/checkout');
    await this.total.waitFor();
  }

  row(productName) {
    return this.page.locator('tr').filter({
      has: this.page.locator('[data-test="product-title"]', { hasText: exactText(productName) }),
    });
  }

  lineTotal(productName) {
    return this.row(productName).locator('[data-test="line-price"]');
  }

  unitPrice(productName) {
    return this.row(productName).locator('[data-test="product-price"]');
  }

  quantityInput(productName) {
    return this.row(productName).locator('[data-test="product-quantity"]');
  }

  // The remove control has no data-test hook: it is an anchor styled as a danger
  // button, holding only an fa-xmark icon.
  removeButton(productName) {
    return this.row(productName).locator('a.btn-danger');
  }

  async removeLine(productName) {
    const deleted = waitForCartDelete(this.page);
    await this.removeButton(productName).click();
    await deleted;
    await this.row(productName).waitFor({ state: 'detached' });
  }
}
