import { BasePage } from './BasePage.js';

export class PaymentStep extends BasePage {
  constructor(page) {
    super(page);
    this.method = this.dt('payment-method');
    this.confirm = this.dt('finish');
  }

  field(name) {
    return this.dt(name);
  }

  async selectMethod(methodValue) {
    await this.method.selectOption(methodValue);
  }

  // Per-method fields are a mix of selects (monthly_installments) and text inputs
  // (bank_name and friends), so the control type is resolved from the DOM.
  async fillFields(fields) {
    for (const [name, value] of Object.entries(fields)) {
      const control = this.field(name);
      const tag = await control.evaluate((element) => element.tagName.toLowerCase());
      if (tag === 'select') {
        await control.selectOption(String(value));
      } else {
        await control.fill(String(value));
      }
    }
  }
}
