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
    const category = (await this.productPage.categoryTag.textContent()).trim();
    const brand = (await this.productPage.brandTag.textContent()).trim();
    this.receipts.productPrices = { ...(this.receipts.productPrices ?? {}), [productName]: price };
    this.receipts.productDetails = {
      ...(this.receipts.productDetails ?? {}),
      [productName]: { price, category, brand },
    };
    return { productName, price, category, brand };
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

  async continueShopping() {
    await this.cartPage.continueShopping.click();
    await this.page.waitForURL((url) => url.pathname === '/');
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
  }

  async openContactPage() {
    await this.contactPage.open();
  }

  async openContactFromHome() {
    await this.header.openContact();
  }

  async fillContactForm(details) {
    await this.contactPage.fill(details);
    this.receipts.contact = details;
    return details;
  }

  async submitContactForm() {
    await this.contactPage.submit();
  }

  async fillAndSubmitContact(details) {
    await this.fillContactForm(details);
    await this.submitContactForm();
  }

  async addProductToCompare() {
    await this.productPage.addToCompareButton.click();
  }

  async goToComparisonFromBar() {
    await this.comparisonBar.goToComparison();
  }
}
