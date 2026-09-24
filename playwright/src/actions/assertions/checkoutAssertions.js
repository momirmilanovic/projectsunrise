import { expect } from '@playwright/test';

import { INVOICE_PATTERN, extractInvoiceNumber } from '../../utils/invoice.js';

export async function verifyPaymentDetails(checkoutPage, expectedPayment) {
  await expect(checkoutPage.payment.method).toHaveValue(expectedPayment.method);
  for (const [name, value] of Object.entries(expectedPayment.fields)) {
    await expect(
      checkoutPage.payment.field(name),
      `payment field "${name}" should hold what was submitted`,
    ).toHaveValue(String(value));
  }
}

export async function verifyPerMethodFieldsVisible(checkoutPage, fieldNames) {
  for (const name of fieldNames) {
    await expect(
      checkoutPage.payment.field(name),
      `"${name}" should be shown for the selected payment method`,
    ).toBeVisible();
  }
}

// Both checkout gates work by disabling the control - the app renders no validation copy.
export async function verifyConfirmDisabled(checkoutPage) {
  await expect(checkoutPage.payment.confirm).toBeDisabled();
}

export async function verifyConfirmEnabled(checkoutPage) {
  await expect(checkoutPage.payment.confirm).toBeEnabled();
}

export async function verifyPaymentSuccessful(checkoutPage) {
  await expect(checkoutPage.paymentSuccessMessage).toBeVisible();
}

export async function verifyAlreadySignedIn(checkoutPage) {
  await expect(checkoutPage.alreadySignedInMessage).toBeVisible();
}

// "Choose your payment method" is the documented placeholder option (see CLAUDE.md
// observed values), present regardless of which method ends up selected.
export async function verifyPaymentStepDisplayed(checkoutPage) {
  await expect(checkoutPage.payment.method).toBeVisible();
  await expect(checkoutPage.payment.method).toContainText('Choose your payment method');
}

// The invoice number is generated per order, so the literal in the Zephyr case is one
// past run. Assert the copy and the format, and hand the captured number back.
export async function verifyOrderConfirmed(checkoutPage) {
  await expect(checkoutPage.confirmation).toBeVisible();
  await expect(checkoutPage.confirmation).toContainText('Thanks for your order!');
  const invoiceNumber = await extractInvoiceNumber(checkoutPage.confirmation);
  expect(invoiceNumber, 'confirmation should quote an INV-<digits> invoice number').toMatch(
    INVOICE_PATTERN,
  );
  return invoiceNumber;
}
