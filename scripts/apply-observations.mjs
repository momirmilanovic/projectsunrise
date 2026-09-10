#!/usr/bin/env node
/**
 * One-shot: fold the exploration findings into testcases/checkout.json.
 *
 * Every value below was observed against the running app on 2026-09-01 via
 * scripts/explore/*.mjs, not inferred. Artefacts and screenshots are under
 * artifacts/. Anything still unobserved keeps its ⚠ VERIFY marker.
 *
 * Run once:  node scripts/apply-observations.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'testcases/checkout.json';
const doc = JSON.parse(readFileSync(PATH, 'utf8'));
const byId = (id) => doc.testCases.find((t) => t.id === id);

const base = { status: 'Draft', coverage: 'KAN-18' };

// ---------------------------------------------------------------- corrections

// CHK-TC-07: both VERIFY markers resolved, and both differ from what was assumed.
const t07 = byId('CHK-TC-07');
t07.steps[1].expected =
  'The number input clamps client-side: the app sends {"quantity":1}, PUT /carts/{cartId}/product/quantity returns 200, and the toast reads "Product quantity updated." The field shows 1 and the order total is unchanged at T. No rejection message is displayed. Record as a defect candidate - a success toast for a silently coerced value.';
t07.steps[3].expected =
  'Identical handling to the quantity 0 case: the value is clamped to 1, the toast reads "Product quantity updated.", and the order total stays T.';
t07.steps[6].expected =
  'The request is rejected with HTTP 404 and body {"message":"Resource not found"}. Quantities 0, -1 and 1.5 all behave the same way, and the cart retains its last valid quantity. Record as a defect candidate - a validation failure returning 404 rather than 422.';
t07.covers_rules = ['BR-5'];

// ---------------------------------------------------------------- new cases

const NEW = [
  {
    ...base,
    id: 'CHK-TC-02',
    name: 'Checkout cannot be started with an empty cart',
    objective:
      'Verify that with an empty cart the checkout view exposes no way to progress, and that the block is the absence of the control rather than a validation message.',
    precondition:
      '1. Database freshly seeded.\n2. The browser session holds an empty cart - no cart quantity badge in the header.\n3. U-customer is signed in.',
    priority: 'Normal',
    type: 'negative',
    severity: 'Major',
    labels: ['toolshop', 'checkout', 'empty-state'],
    covers_rules: ['BR-1'],
    steps: [
      { step: 'Confirm the cart is empty by inspecting the header.', data: 'empty cart', expected: 'No cart quantity badge is rendered in the header.' },
      { step: 'Navigate directly to /checkout.', data: '', expected: 'The four-step stepper is rendered - CART, SIGN IN, BILLING ADDRESS, PAYMENT - but the cart step body is empty: no line item table, no order total, and no "Proceed to checkout" control.' },
      { step: 'Query the page for the cart step controls.', data: '', expected: 'No cart line, total or proceed control is present. Progression is impossible because the control is absent, not because a validation message is shown.' },
      { step: 'Reload the page.', data: '', expected: 'The empty state is unchanged - it is driven by cart state, not by a one-time render.' },
    ],
  },
  {
    ...base,
    id: 'CHK-TC-04',
    name: 'Cart contents survive signing in during checkout',
    objective:
      'Verify that a cart built as an unauthenticated visitor is preserved intact across the sign-in step, with no line lost, duplicated or re-priced.',
    precondition:
      '1. Database freshly seeded.\n2. Browser session has no authentication cookie and empty localStorage.\n3. No cart exists at the start.',
    priority: 'High',
    type: 'positive',
    severity: 'Critical',
    labels: ['toolshop', 'checkout', 'session', 'guest'],
    covers_rules: ['BR-3'],
    steps: [
      { step: 'As an unauthenticated visitor, open an in-stock product and add it to the cart at quantity 1.', data: 'U-guest', expected: 'The toast reads "Product added to shopping cart." and the header cart badge shows 1.' },
      { step: 'Open /checkout and record the product name, quantity, unit price and order total.', data: '', expected: 'One line is shown with quantity 1 and an order total equal to the unit price.' },
      { step: 'Click "Proceed to checkout" on the cart step.', data: '', expected: 'The SIGN IN step is shown, offering both a Login form and a "Continue as Guest" option.' },
      { step: 'Sign in as U-customer through the login form on this step.', data: 'U-customer / welcome01', expected: 'The step confirms the signed-in identity - "Hello {display name}, you are already logged in. You can proceed to checkout." - and a proceed control is offered.' },
      { step: 'Inspect the header badge and re-open the cart step.', data: '', expected: 'The cart badge still shows 1. The same product, quantity, unit price and order total recorded in step 2 are present. No line was lost, duplicated or re-priced.' },
      { step: 'Reload the page.', data: '', expected: 'The cart is unchanged - it was persisted server-side against the authenticated identity, not held only in the browser.' },
    ],
  },
  {
    ...base,
    id: 'CHK-TC-06',
    name: 'Changing quantity in checkout recalculates the total',
    objective:
      'Verify that a quantity change recalculates the line total and order total exactly, and that the recalculation is driven by a server round trip rather than a client-side guess.',
    precondition:
      '1. Database freshly seeded.\n2. U-customer is signed in.\n3. Cart CART-1 contains one in-stock product at quantity 1.\n4. The unit price is recorded as P.',
    priority: 'High',
    type: 'positive',
    severity: 'Critical',
    labels: ['toolshop', 'checkout', 'calculation', 'async'],
    covers_rules: ['BR-4'],
    steps: [
      { step: 'Open /checkout and record the unit price P and the order total.', data: 'CART-1', expected: 'One line at quantity 1; the order total equals P.' },
      { step: 'Set the line quantity to 3 and blur the field.', data: 'quantity = 3', expected: 'The app issues PUT /carts/{cartId}/product/quantity followed by GET /carts/{cartId}; both return 200. The toast reads "Product quantity updated."' },
      { step: 'Compare the line total and order total against 3 x P.', data: '', expected: 'Both equal 3 x P to the cent, with no rounding drift.' },
      { step: 'Repeat the change while asserting immediately, without waiting for the PUT response.', data: 'quantity = 2', expected: 'The recalculated total is not yet present at the moment the field is blurred. The assertion must wait on the PUT response - a fixed delay is not a substitute (CLAUDE.md §6).' },
      { step: 'Reload the page.', data: '', expected: 'The changed quantity and the recalculated total persist - the change was applied server-side.' },
    ],
  },
  {
    ...base,
    id: 'CHK-TC-08',
    name: 'Removing the last cart line returns the flow to the empty state',
    objective:
      'Verify that removing the only cart line clears the cart server-side and leaves the checkout view in the same empty state as a cart that was never populated.',
    precondition:
      '1. Database freshly seeded.\n2. U-customer is signed in.\n3. Cart CART-1 contains exactly one line at quantity 1.',
    priority: 'Normal',
    type: 'positive',
    severity: 'Major',
    labels: ['toolshop', 'checkout', 'empty-state'],
    covers_rules: ['BR-6'],
    steps: [
      { step: 'Open /checkout and record the line and order total.', data: 'CART-1', expected: 'One line is shown; the order total equals the line total.' },
      { step: 'Activate the remove control on the line. Note: it is an <a class="btn btn-danger"> carrying an fa-xmark icon and it has NO data-test attribute, unlike the rest of the cart step.', data: '', expected: 'DELETE /carts/{cartId}/product/{productId} returns 204, followed by GET /carts/{cartId} returning 200.' },
      { step: 'Inspect the checkout view.', data: '', expected: 'The cart step body is empty: no line table, no order total and no "Proceed to checkout" control - identical to the never-populated empty state asserted in CHK-TC-02.' },
      { step: 'Inspect the header.', data: '', expected: 'The cart quantity badge is no longer rendered.' },
      { step: 'Reload the page.', data: '', expected: 'The cart is still empty - the removal was applied server-side.' },
    ],
  },
  {
    ...base,
    id: 'CHK-TC-09',
    name: 'Payment step unreachable with an incomplete billing address',
    objective:
      'Verify which billing fields are actually mandatory before the payment step becomes reachable, and that the gate is implemented by disabling the proceed control.',
    precondition:
      '1. Database freshly seeded.\n2. U-customer is signed in.\n3. Cart CART-1 contains one line.\n4. The flow has advanced to the BILLING ADDRESS step.',
    priority: 'High',
    type: 'negative',
    severity: 'Critical',
    labels: ['toolshop', 'checkout', 'validation'],
    covers_rules: ['BR-7'],
    steps: [
      { step: 'Inspect the billing address form as first rendered.', data: 'U-customer', expected: 'Fields are country (select, with placeholder "Your country *"), postal_code, house_number, street, city and state. street and city are prefilled from the profile; country, postal_code, house_number and state are empty.' },
      { step: 'Clear every field and blur each one, then deselect the country.', data: 'all fields empty', expected: 'The "Proceed to checkout" control is rendered but disabled. No per-field validation message is displayed - the step gates by disabling the control, not by surfacing copy.' },
      { step: 'Force a click on the disabled proceed control.', data: '', expected: 'Nothing happens: no navigation, no request, and still no validation message.' },
      { step: 'Populate country, then postal_code, then house_number, blurring after each.', data: 'NL / 1000AA / 1', expected: 'The proceed control remains disabled after each of the three.' },
      { step: 'Populate street.', data: 'Teststraat', expected: 'The proceed control becomes enabled while city and state are still empty - those two are NOT mandatory in the UI.' },
      { step: 'Compare the UI mandatory set against the API contract.', data: '', expected: 'Record as a defect candidate: POST /invoices requires billing_city and billing_state, but the UI permits both to be empty. The UI mandatory set is narrower than the API contract.' },
      { step: 'Click the proceed control.', data: '', expected: 'The PAYMENT step is shown.' },
    ],
  },
  {
    ...base,
    id: 'CHK-TC-10',
    name: 'Order cannot be confirmed with no payment method selected',
    objective:
      'Verify that the confirm action is unavailable until exactly one payment method is chosen, and that forcing it creates no invoice.',
    precondition:
      '1. Database freshly seeded.\n2. U-customer is signed in.\n3. Cart CART-1 contains one line.\n4. A valid billing address has been submitted and the PAYMENT step is displayed.\n5. The invoice count for U-customer is recorded as N.',
    priority: 'High',
    type: 'negative',
    severity: 'Critical',
    labels: ['toolshop', 'checkout', 'validation', 'payment'],
    covers_rules: ['BR-8'],
    steps: [
      { step: 'Inspect the payment step as first rendered.', data: '', expected: 'A payment method select is shown with the placeholder "Choose your payment method" selected, alongside a Confirm control.' },
      { step: 'Without choosing a method, inspect the Confirm control.', data: '', expected: 'Confirm is rendered but disabled. No validation message is displayed.' },
      { step: 'Force a click on the disabled Confirm control.', data: '', expected: 'No request is issued, no navigation occurs, no validation message appears, and Confirm remains disabled.' },
      { step: 'Select any method, then attempt to restore the placeholder selection.', data: 'credit-card', expected: 'The placeholder option is disabled once a real method has been chosen - the empty selection cannot be restored through the UI.' },
      { step: 'Call GET /invoices with U-customer\'s bearer token.', data: '', expected: 'The invoice count is still N. Nothing was created by the forced confirm.' },
    ],
  },
  {
    ...base,
    id: 'CHK-TC-11',
    name: 'Each payment method shows and validates its own fields',
    objective:
      'Verify that the payment step offers exactly the five supported methods, that each reveals its own field set, and that the displayed labels correspond to the API enum values.',
    precondition:
      '1. Database freshly seeded.\n2. U-customer is signed in.\n3. Cart CART-1 contains one line.\n4. A valid billing address has been submitted and the PAYMENT step is displayed.',
    priority: 'High',
    type: 'positive',
    severity: 'Major',
    labels: ['toolshop', 'checkout', 'payment'],
    covers_rules: ['BR-9'],
    steps: [
      { step: 'Enumerate the options in the payment method select.', data: '', expected: 'Exactly five selectable methods, displayed as "Bank Transfer", "Cash on Delivery", "Credit Card", "Buy Now Pay Later" and "Gift Card", plus the placeholder "Choose your payment method".' },
      { step: 'Select "Bank Transfer".', data: 'bank-transfer', expected: 'Three fields are revealed: Bank Name, Account Name, Account Number.' },
      { step: 'Select "Cash on Delivery".', data: 'cash-on-delivery', expected: 'No additional fields are revealed.' },
      { step: 'Select "Credit Card".', data: 'credit-card', expected: 'Four fields are revealed: Credit Card Number, Expiration Date, CVV, Card Holder Name.' },
      { step: 'Select "Buy Now Pay Later".', data: 'buy-now-pay-later', expected: 'One field is revealed: Monthly Installments.' },
      { step: 'Select "Gift Card".', data: 'gift-card', expected: 'Two fields are revealed: Gift Card Number, Validation Code.' },
      { step: 'Compare the displayed labels against the API enum for payment_method.', data: '', expected: 'The five options map to bank-transfer, cash-on-delivery, credit-card, buy-now-pay-later and gift-card, matching the POST /invoices enum exactly.' },
      { step: 'Submit each method with an invalid value in one of its own fields.', data: '', expected: '⚠ VERIFY - BR-9 also requires that each method\'s fields are validated before confirmation. Observing that requires submitting the payment step, which creates an order, so it was not captured. Do not assert on per-field payment validation until this is observed.' },
    ],
  },
];

// Insert in numeric id order so the file reads in sequence.
doc.testCases.push(...NEW);
doc.testCases.sort((a, b) => Number(a.id.split('-')[2]) - Number(b.id.split('-')[2]));

writeFileSync(PATH, JSON.stringify(doc, null, 2) + '\n');

// ---------------------------------------------------------------- report
const covered = new Set(doc.testCases.flatMap((t) => t.covers_rules));
const allRules = Array.from({ length: 12 }, (_, i) => `BR-${i + 1}`);

console.log(`  ${doc.testCases.length} cases, ${doc.testCases.reduce((n, t) => n + t.steps.length, 0)} steps\n`);
for (const t of doc.testCases) {
  const v = t.steps.filter((s) => JSON.stringify(s).includes('VERIFY')).length;
  console.log(`  ${t.id}  ${String(t.steps.length).padStart(2)} steps  ${t.priority.padEnd(6)} ${(t.covers_rules.join(',') || '-').padEnd(30)}${v ? `  ${v} VERIFY` : ''}`);
}
console.log(`\n  rules covered    : ${allRules.filter((r) => covered.has(r)).join(', ')}`);
console.log(`  rules NOT covered: ${allRules.filter((r) => !covered.has(r)).join(', ') || 'none'}`);
