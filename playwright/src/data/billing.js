// The country control is a <select> whose option values are ISO 3166-1 alpha-2 codes
// ("RS" renders as "Serbia"), so address data carries the code, not the label.
export function billingAddress(overrides = {}) {
  return {
    country: 'RS',
    postalCode: '11000',
    houseNumber: '22',
    street: 'JK 22',
    city: 'Belgrade',
    state: 'Belgrade',
    ...overrides,
  };
}
