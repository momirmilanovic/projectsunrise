import {
  verifyCartContains,
  verifyCartQuantity,
} from '../../src/actions/assertions/cartAssertions.js';
import {
  verifyCategoryPageDisplayed,
  verifyProductPageDisplayed,
  verifyProductQuantity,
} from '../../src/actions/assertions/catalogAssertions.js';
import {
  verifyOrderConfirmed,
  verifyPaymentDetails,
  verifyPaymentSuccessful,
} from '../../src/actions/assertions/checkoutAssertions.js';
import { billingAddress } from '../../src/data/billing.js';
import { cashOnDelivery } from '../../src/data/payments.js';
import { test } from '../../src/fixtures/index.js';

const CATEGORY = 'Power Tools';
const PRODUCT = 'Belt Sander';
const QUANTITY = 3;

test.only('KAN-T20 From Categories dropdown select multiple pieces of same item', async ({
  regularUser,
}) => {
  test.slow();

  await test.step(`Select '${CATEGORY}' from the Categories dropdown`, async () => {
    await regularUser.browseCategoryFromNav(CATEGORY);
    await verifyCategoryPageDisplayed(regularUser.homePage, CATEGORY);
  });

  await test.step(`Select '${PRODUCT}'`, async () => {
    await regularUser.viewProductFromHome(PRODUCT);
    await verifyProductPageDisplayed(regularUser.productPage, PRODUCT);
  });

  await test.step(`Click twice on '+' to reach quantity ${QUANTITY}`, async () => {
    await regularUser.increaseProductQuantity(2);
    await verifyProductQuantity(regularUser.productPage, QUANTITY);
  });

  await test.step('Add to cart', async () => {
    await regularUser.addCurrentProductToCart(PRODUCT);
  });

  await test.step('Open the cart', async () => {
    await regularUser.openCart();
    await verifyCartContains(regularUser.cartPage, [PRODUCT]);
    await verifyCartQuantity(regularUser.cartPage, PRODUCT, QUANTITY);
  });

  await test.step('Proceed to checkout', async () => {
    await regularUser.proceedToCheckout();
  });

  await test.step('Proceed to checkout from sign in', async () => {
    await regularUser.proceedToCheckoutFromSignIn();
  });

  await test.step('Fill the billing address', async () => {
    await regularUser.fillBillingForm(billingAddress());
  });

  await test.step('Proceed to checkout', async () => {
    await regularUser.proceedToPaymentStep();
  });

  await test.step('Pay with Cash on Delivery', async () => {
    const payment = await regularUser.fillPaymentForm(cashOnDelivery());
    await verifyPaymentDetails(regularUser.checkoutPage, payment);
    await regularUser.confirmPayment();
    await verifyPaymentSuccessful(regularUser.checkoutPage);
  });

  await test.step('Confirm the order', async () => {
    await regularUser.confirmOrder();
    await verifyOrderConfirmed(regularUser.checkoutPage);
  });
});
