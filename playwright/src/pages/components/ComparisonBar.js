import { BasePage } from '../BasePage.js';

// Floating widget shown on any page (home, product) once 2+ products are selected
// for comparison - it does not render on the /comparison page itself, so its
// "clear-comparison" hook never collides with ComparisonPage's own button.
export class ComparisonBar extends BasePage {
  constructor(page) {
    super(page);
    this.bar = this.dt('comparison-bar');
    this.compareLink = this.dt('compare-link');
    this.clearAll = this.dt('clear-comparison');
  }

  async goToComparison() {
    await this.compareLink.click();
  }

  async clear() {
    await this.clearAll.click();
  }
}
