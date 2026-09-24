export class BasePage {
  constructor(page) {
    this.page = page;
  }

  dt(name) {
    return this.page.locator(`[data-test="${name}"]`);
  }

  get toast() {
    return this.page.locator('.toast-container');
  }
}
