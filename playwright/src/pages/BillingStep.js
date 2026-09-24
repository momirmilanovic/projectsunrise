import { BasePage } from './BasePage.js';

export class BillingStep extends BasePage {
  constructor(page) {
    super(page);
    this.country = this.dt('country');
    this.postalCode = this.dt('postal_code');
    this.houseNumber = this.dt('house_number');
    this.street = this.dt('street');
    this.city = this.dt('city');
    this.state = this.dt('state');
    this.proceed = this.dt('proceed-3');
  }

  async fill(address) {
    await this.country.selectOption(address.country);
    await this.postalCode.fill(address.postalCode);
    await this.houseNumber.fill(address.houseNumber);
    await this.street.fill(address.street);
    await this.city.fill(address.city);
    await this.state.fill(address.state);
  }

  async proceedToPayment() {
    await this.proceed.click();
  }
}
