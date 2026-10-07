import { exactText } from '../utils/text.js';
import { BasePage } from './BasePage.js';

export class ComparisonPage extends BasePage {
  constructor(page) {
    super(page);
    this.title = this.dt('comparison-title');
    this.showDifferencesOnly = this.dt('show-differences');
    this.clearAll = this.dt('clear-comparison');
    this.table = this.dt('comparison-table');
    this.productNameLinks = this.dt('product-name');
  }

  async open() {
    await this.page.goto('/comparison');
    await this.table.waitFor();
  }

  async productNames() {
    return (await this.productNameLinks.allTextContents()).map((name) => name.trim());
  }

  // Products are columns here, not rows, so a value is only findable once you know
  // which column a product landed in - column order isn't guaranteed to match
  // selection order.
  async columnIndex(productName) {
    const names = await this.productNames();
    const index = names.indexOf(productName);
    if (index === -1) {
      throw new Error(`"${productName}" is not in the comparison table`);
    }
    return index;
  }

  // One row per attribute label (Price, Brand, Category, ... and every dynamic
  // "Specifications" row) - all share the same shape, a <th scope="row"> label
  // followed by one <td> per product column.
  row(attributeLabel) {
    return this.table.locator('tr').filter({
      has: this.page.locator('th', { hasText: exactText(attributeLabel) }),
    });
  }

  async cell(attributeLabel, productName) {
    const index = await this.columnIndex(productName);
    return this.row(attributeLabel).locator('td').nth(index);
  }

  removeButton(productName) {
    return this.page.getByRole('button', { name: `Remove ${productName} from comparison` });
  }

  async removeProduct(productName) {
    await this.removeButton(productName).click();
  }

  async toggleShowDifferencesOnly() {
    await this.showDifferencesOnly.click();
  }

  async clearComparison() {
    await this.clearAll.click();
  }
}
