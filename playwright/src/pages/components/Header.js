import { BasePage } from '../BasePage.js';

export class Header extends BasePage {
  constructor(page) {
    super(page);
    this.home = this.dt('nav-home');
    this.signIn = this.dt('nav-sign-in');
    this.cart = this.dt('nav-cart');
    this.cartQuantity = this.dt('cart-quantity');
    // Site brand/logo link, top-left of the nav. No data-test hook; its accessible
    // name comes from the <a title="..."> attribute, observed against staging.
    this.logo = this.page.getByRole('link', { name: 'Practice Software Testing - Toolshop' });
    this.categoriesMenu = this.dt('nav-categories');
  }

  async openCart() {
    await this.cart.click();
  }

  // The nav "Categories" menu is a flyout distinct from the sidebar filter checkboxes
  // (see HomePage) - it navigates to /category/<slug> instead of filtering in place.
  async openCategory(categoryName) {
    await this.categoriesMenu.click();
    await this.page.getByRole('link', { name: categoryName, exact: true }).click();
  }

  async goHome() {
    await this.logo.click();
    await this.page.waitForURL((url) => url.pathname === '/');
  }
}
