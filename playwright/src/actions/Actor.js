import { CartPage } from '../pages/CartPage.js';
import { CheckoutPage } from '../pages/CheckoutPage.js';
import { ComparisonPage } from '../pages/ComparisonPage.js';
import { ContactPage } from '../pages/ContactPage.js';
import { ComparisonBar } from '../pages/components/ComparisonBar.js';
import { Header } from '../pages/components/Header.js';
import { HomePage } from '../pages/HomePage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { ProductPage } from '../pages/ProductPage.js';

export class Actor {
  constructor({ page, context, identity }) {
    this.page = page;
    this.context = context;
    this.identity = identity;
    this.header = new Header(page);
    this.comparisonBar = new ComparisonBar(page);
    this.homePage = new HomePage(page);
    this.productPage = new ProductPage(page);
    this.cartPage = new CartPage(page);
    this.checkoutPage = new CheckoutPage(page);
    this.comparisonPage = new ComparisonPage(page);
    this.contactPage = new ContactPage(page);
    this.loginPage = new LoginPage(page);
    // What this actor actually submitted, so assertions can verify the page against
    // it instead of the spec restating the same literals.
    this.receipts = {};
  }
}
