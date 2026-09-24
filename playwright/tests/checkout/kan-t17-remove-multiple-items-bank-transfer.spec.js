import {
  verifyCartContains,
  verifyCartCount,
  verifyCartLineRemoved,
  verifyCartTotalMatchesLines,
  verifyCartUnitPriceMatches,
} from '../../src/actions/assertions/cartAssertions.js';
import {
  verifyHomePageDisplayed,
  verifyProductPageDisplayed,
} from '../../src/actions/assertions/catalogAssertions.js';
import {
  verifyConfirmDisabled,
  verifyOrderConfirmed,
  verifyPaymentDetails,
  verifyPerMethodFieldsVisible,
  verifyPaymentSuccessful,
} from '../../src/actions/assertions/checkoutAssertions.js';
import { billingAddress } from '../../src/data/billing.js';
import { bankTransfer } from '../../src/data/payments.js';
import { test } from '../../src/fixtures/index.js';

const ITEM_1 = 'Slip Joint Pliers';
const ITEM_2 = 'Bolt Cutters';
const ITEM_3 = 'Hammer';
const REMOVED = ITEM_2;

test('KAN-T17 Select and remove multiple items with checkout (Bank transfer payment)', async ({
  secondUser,
}) => {
  test.slow(); 

  await test.step(`Select item '${ITEM_1}'`, async () => {
    await secondUser.viewProductFromHome(ITEM_1);
    await verifyProductPageDisplayed(secondUser.productPage, ITEM_1);
  });

  await test.step('Add to cart', async () => {
    await secondUser.addCurrentProductToCart(ITEM_1);
    await verifyCartCount(secondUser.header, 1);
  });

  await test.step(`Go to home by click on 'Toolshop Demo'`, async () => {
    await secondUser.goHome();
    await verifyHomePageDisplayed(secondUser.homePage, secondUser.header);
  });

  await test.step(`Select another item '${ITEM_2}'`, async () => {
    await secondUser.viewProductFromHome(ITEM_2);
    await verifyProductPageDisplayed(secondUser.productPage, ITEM_2);
  });

  await test.step('Add to cart', async () => {
    await secondUser.addCurrentProductToCart(ITEM_2);
    await verifyCartCount(secondUser.header, 2);
  });

  await test.step(`Go to home by click on 'Toolshop Demo'`, async () => {
    await secondUser.goHome();
    await verifyHomePageDisplayed(secondUser.homePage, secondUser.header);
  });

  await test.step(`Select item '${ITEM_3}'`, async () => {
    await secondUser.viewProductFromHome(ITEM_3);
    await verifyProductPageDisplayed(secondUser.productPage, ITEM_3);
  });

  await test.step('Add to cart', async () => {
    await secondUser.addCurrentProductToCart(ITEM_3);
  });

  await test.step('Go to cart', async () => {
    await secondUser.openCart();
    await verifyCartContains(secondUser.cartPage, [ITEM_1, ITEM_2, ITEM_3]);
    for (const item of [ITEM_1, ITEM_2, ITEM_3]) {
      await verifyCartUnitPriceMatches(secondUser.cartPage, item, secondUser.receipts.productPrices[item]);
    }
    await verifyCartTotalMatchesLines(secondUser.cartPage, [ITEM_1, ITEM_2, ITEM_3]);
  });

  await test.step(`Remove '${REMOVED}' item from the cart`, async () => {
    await secondUser.removeItemFromCart(REMOVED);
    await verifyCartLineRemoved(secondUser.cartPage, REMOVED);
    await verifyCartContains(secondUser.cartPage, secondUser.receipts.cartItems);
    await verifyCartTotalMatchesLines(secondUser.cartPage, secondUser.receipts.cartItems);
  });

  await test.step('Proceed to checkout with Bank transfer payment', async () => {
    await secondUser.proceedToCheckout();
    await secondUser.proceedToCheckoutFromSignIn();
    await secondUser.fillBillingForm(billingAddress());
    await secondUser.proceedToPaymentStep();

    await secondUser.checkoutPage.payment.selectMethod('bank-transfer');
    await verifyPerMethodFieldsVisible(secondUser.checkoutPage, [
      'bank_name',
      'account_name',
      'account_number',
    ]);
    await verifyConfirmDisabled(secondUser.checkoutPage);

    const payment = await secondUser.fillPaymentForm(
      bankTransfer({
        bank_name: 'Tiac RT Bank',
        account_name: 'John Doe',
        account_number: '34133534534524',
      }),
    );
    await verifyPaymentDetails(secondUser.checkoutPage, payment);
  });

  await test.step('Confirm the payment', async () => {
    await secondUser.confirmPayment();
    await verifyPaymentSuccessful(secondUser.checkoutPage);
  });

  await test.step('Confirm the order', async () => {
    await secondUser.confirmOrder();
    await verifyOrderConfirmed(secondUser.checkoutPage);
  });
});


  

