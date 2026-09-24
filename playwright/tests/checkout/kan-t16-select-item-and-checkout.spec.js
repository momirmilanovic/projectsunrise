import { verifyCartContains } from '../../src/actions/assertions/cartAssertions.js';
import { verifyProductPageDisplayed } from '../../src/actions/assertions/catalogAssertions.js';
import {
  verifyAlreadySignedIn,
  verifyOrderConfirmed,
  verifyPaymentDetails,
  verifyPaymentStepDisplayed,
  verifyPaymentSuccessful,
} from '../../src/actions/assertions/checkoutAssertions.js';
import { billingAddress } from '../../src/data/billing.js';
import { buyNowPayLater } from '../../src/data/payments.js';
import { test } from '../../src/fixtures/index.js';

const PRODUCT = 'Pliers';

test('KAN-T16 Select item and checkout', async ({ regularUser }) => {
  test.slow();

  await test.step('Select item from home page and add it to the cart', async () => {
    await regularUser.addItemToCartFromHome(PRODUCT);
    await verifyProductPageDisplayed(regularUser.productPage, PRODUCT);
  });

  await test.step('Open the cart', async () => {
    await regularUser.openCart();
    await verifyCartContains(regularUser.cartPage, [PRODUCT]);
  });

  await test.step('Proceed to checkout', async () => {
    await regularUser.proceedToCheckout();
  });

  await test.step('Proceed to the billing step', async () => {
    await verifyAlreadySignedIn(regularUser.checkoutPage);
    await regularUser.proceedToBillingStep();
  });

  await test.step('Fill the billing address', async () => {
    await regularUser.fillBillingForm(billingAddress({ street: 'JK 22' }));
    await regularUser.proceedToPaymentStep();
    await verifyPaymentStepDisplayed(regularUser.checkoutPage);
  });

  await test.step('Pay with Buy Now Pay Later over 6 monthly installments', async () => {
    const payment = await regularUser.fillPaymentForm(buyNowPayLater({ installments: '6' }));
    await verifyPaymentDetails(regularUser.checkoutPage, payment);
    await regularUser.confirmPayment();
    await verifyPaymentSuccessful(regularUser.checkoutPage);
  });

  await test.step('Confirm the order', async () => {
    await regularUser.confirmOrder();
    await verifyOrderConfirmed(regularUser.checkoutPage);
  });
});
