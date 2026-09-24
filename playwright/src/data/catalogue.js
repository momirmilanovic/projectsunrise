// Observed against staging on 2026-09-10. Staging reseeds periodically: every product
// ULID changes, but names and prices are regenerated identically from the seeder. That
// is why the suite locates and asserts by name and never by id.
export const HAMMER_PRODUCTS = [
  'Claw Hammer with Shock Reduction Grip',
  'Hammer',
  'Claw Hammer',
  'Thor Hammer',
  'Sledgehammer',
  'Claw Hammer with Fiberglass Handle',
  'Court Hammer',
];

// The only hammer carrying the MightyCraft Hardware brand, so it is what disappears
// when the ForgeFlex Tools brand filter is applied on top of the Hammer category.
export const MIGHTYCRAFT_HAMMER = 'Claw Hammer';

export const HAMMER_FORGEFLEX_PRODUCTS = HAMMER_PRODUCTS.filter(
  (name) => name !== MIGHTYCRAFT_HAMMER,
);

export const CATEGORY = { hammer: 'Hammer' };
export const BRAND = { forgeFlex: 'ForgeFlex Tools', mightyCraft: 'MightyCraft Hardware' };
