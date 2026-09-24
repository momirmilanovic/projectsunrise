export const PAYMENT_METHOD = {
  bankTransfer: 'bank-transfer',
  cashOnDelivery: 'cash-on-delivery',
  creditCard: 'credit-card',
  buyNowPayLater: 'buy-now-pay-later',
  giftCard: 'gift-card',
};

// `fields` keys are data-test attribute names. PaymentStep resolves select vs input at
// runtime, so values stay plain here.
export function buyNowPayLater({ installments = '6' } = {}) {
  return {
    method: PAYMENT_METHOD.buyNowPayLater,
    fields: { monthly_installments: installments },
  };
}

export function bankTransfer(overrides = {}) {
  return {
    method: PAYMENT_METHOD.bankTransfer,
    fields: {
      bank_name: 'Toolshop Test Bank',
      account_name: 'Momir Milanovic',
      account_number: '123456789',
      ...overrides,
    },
  };
}

export function cashOnDelivery() {
  return { method: PAYMENT_METHOD.cashOnDelivery, fields: {} };
}
