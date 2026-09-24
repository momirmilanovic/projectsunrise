import { waitForProductQuery } from '../utils/network.js';
import { exactText } from '../utils/text.js';
import { BasePage } from './BasePage.js';

export class HomePage extends BasePage {
  constructor(page) {
    super(page);
    // The mobile filter-toggle button carries the same data-test as the filters
    // panel itself; scope to the div so the locator stays single-element.
    this.filters = page.locator('div[data-test="filters"]');
    this.sort = this.dt('sort');
    this.searchQuery = this.dt('search-query');
    this.searchSubmit = this.dt('search-submit');
    this.searchReset = this.dt('search-reset');
    this.productCards = page.locator('[data-test^="product-01"]');
    this.productNameLabels = this.dt('product-name');
    this.noResultsMessage = this.dt('no-results');
    this.searchResultCount = this.dt('search-result-count');
  }

  async open() {
    await this.page.goto('/');
    await this.productCards.first().waitFor();
  }

  // Filter checkboxes carry seed-generated ULIDs in their data-test attribute, so they
  // are matched on the accessible name from their label and narrowed by form field name.
  categoryCheckbox(label) {
    return this.filters
      .locator('input[name="category_id"]')
      .and(this.page.getByRole('checkbox', { name: label, exact: true }));
  }

  brandCheckbox(label) {
    return this.filters
      .locator('input[name="brand_id"]')
      .and(this.page.getByRole('checkbox', { name: label, exact: true }));
  }

  async checkCategory(label) {
    const query = waitForProductQuery(this.page);
    await this.categoryCheckbox(label).check();
    await query;
  }

  async checkBrand(label) {
    const query = waitForProductQuery(this.page);
    await this.brandCheckbox(label).check();
    await query;
  }

  async uncheckCategory(label) {
    const query = waitForProductQuery(this.page);
    await this.categoryCheckbox(label).uncheck();
    await query;
  }

  async uncheckBrand(label) {
    const query = waitForProductQuery(this.page);
    await this.brandCheckbox(label).uncheck();
    await query;
  }

  async search(term) {
    const query = waitForProductQuery(this.page);
    await this.searchQuery.fill(term);
    await this.searchSubmit.click();
    await query;
  }

  async productNames() {
    return (await this.productNameLabels.allTextContents()).map((name) => name.trim());
  }

  productCardByName(name) {
    return this.productCards.filter({
      has: this.page.locator('[data-test="product-name"]', { hasText: exactText(name) }),
    });
  }

  async openProductByName(name) {
    await this.productCardByName(name).click();
    await this.page.waitForURL(/\/product\//);
  }
}
