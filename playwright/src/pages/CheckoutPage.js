import { BasePage } from './BasePage.js';
import { BillingStep } from './BillingStep.js';
import { PaymentStep } from './PaymentStep.js';

export class CheckoutPage extends BasePage {
  constructor(page) {
    super(page);
    this.billing = new BillingStep(page);
    this.payment = new PaymentStep(page);

    this.proceedFromSignIn = this.dt('proceed-2');
    this.proceedAsGuest = this.dt('proceed-2-guest');

    this.guestTab = page.getByRole('tab', { name: 'Continue as Guest' });
    this.guestEmail = this.dt('guest-email');
    this.guestFirstName = this.dt('guest-first-name');
    this.guestLastName = this.dt('guest-last-name');
    this.guestSubmit = this.dt('guest-submit');
  }

  async open() {
    await this.page.goto('/checkout');
  }

  get paymentSuccessMessage() {
    return this.page.getByText(/Payment was successful/i);
  }

  // Shown on the sign-in step in place of a login form once the user is already
  // authenticated. Matched loosely - KAN-T16 itself notes the name/surname portion varies.
  get alreadySignedInMessage() {
    return this.page.getByText(/you are already logged in/i);
  }

  // The confirmation container has no data-test hook that has been observed, so it is
  // located by the copy the case documents rather than by an invented attribute.
  get confirmation() {
    return this.page.getByText(/Thanks for your order/i);
  }

  async proceedThroughSignIn() {
    await this.proceedFromSignIn.click();
  }
}
