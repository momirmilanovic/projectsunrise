import { extractInvoiceNumber } from '../utils/invoice.js';
import { Actor } from './Actor.js';

export class CustomerActions extends Actor {
  async openShop() {
    await this.homePage.open();
  }

  async goHome() {
    await this.header.goHome();
  }

  async viewProductFromHome(productName) {
    await this.homePage.openProductByName(productName);
    const price = (await this.productPage.unitPrice.textContent()).trim();
    this.receipts.productPrices = { ...(this.receipts.productPrices ?? {}), [productName]: price };
    return { productName, price };
  }

  async increaseProductQuantity(times) {
    await this.productPage.increaseQuantityBy(times);
  }

  async addCurrentProductToCart(productName) {
    await this.productPage.addToCart();
    this.receipts.cartItems = [...(this.receipts.cartItems ?? []), productName];
    return productName;
  }

  async filterByCategory(category) {
    await this.homePage.checkCategory(category);
    this.receipts.filters = { ...this.receipts.filters, category };
    return category;
  }

  async filterByBrand(brand) {
    await this.homePage.checkBrand(brand);
    this.receipts.filters = { ...this.receipts.filters, brand };
    return brand;
  }

  async browseCategoryFromNav(categoryName) {
    await this.header.openCategory(categoryName);
    return categoryName;
  }

  async unfilterByCategory(category) {
    await this.homePage.uncheckCategory(category);
    return category;
  }

  async unfilterByBrand(brand) {
    await this.homePage.uncheckBrand(brand);
    return brand;
  }

  async searchFor(term) {
    await this.homePage.search(term);
    return term;
  }

  async addItemToCartFromHome(productName) {
    await this.homePage.open();
    await this.viewProductFromHome(productName);
    return this.addCurrentProductToCart(productName);
  }

  async openCart() {
    await this.cartPage.open();
  }

  async proceedToCheckout() {
    await this.cartPage.proceedToCheckout.click();
  }

  async proceedToCheckoutFromSignIn() {
    await this.cartPage.proceedToCheckout2.click();
  }

  async removeItemFromCart(productName) {
    await this.cartPage.removeLine(productName);
    this.receipts.cartItems = (this.receipts.cartItems ?? []).filter(
      (name) => name !== productName,
    );
    return productName;
  }

  async proceedToBillingStep() {
    await this.checkoutPage.proceedThroughSignIn();
  }

  async fillBillingForm(address) {
    await this.checkoutPage.billing.fill(address);
    this.receipts.billing = address;
    return address;
  }

  async proceedToPaymentStep() {
    await this.checkoutPage.billing.proceedToPayment();
  }

  async fillPaymentForm(payment) {
    await this.checkoutPage.payment.selectMethod(payment.method);
    await this.checkoutPage.payment.fillFields(payment.fields);
    this.receipts.payment = payment;
    return payment;
  }

  async confirmPayment() {
    await this.checkoutPage.payment.confirm.click();
  }

  async confirmOrder() {
    await this.checkoutPage.payment.confirm.click();
    // await this.checkoutPage.confirmation.waitFor();
    // const invoiceNumber = await extractInvoiceNumber(this.checkoutPage.confirmation);
    // this.receipts.invoiceNumber = invoiceNumber;
    // return invoiceNumber;
  }
}
