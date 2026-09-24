import {
  verifyOnlyProductsFrom,
  verifyProductAbsent,
} from '../../src/actions/assertions/searchAssertions.js';
import {
  BRAND,
  CATEGORY,
  HAMMER_FORGEFLEX_PRODUCTS,
  HAMMER_PRODUCTS,
  MIGHTYCRAFT_HAMMER,
} from '../../src/data/catalogue.js';
import { test } from '../../src/fixtures/index.js';

test('KAN-T15 Search by category and brand', async ({ regularUser }) => {
  await test.step('Select the Hammer category', async () => {
    await regularUser.filterByCategory(CATEGORY.hammer);
    await verifyOnlyProductsFrom(regularUser.homePage, HAMMER_PRODUCTS);
  });

  await test.step('Add the ForgeFlex Tools brand', async () => {
    await regularUser.filterByBrand(BRAND.forgeFlex);
    await verifyOnlyProductsFrom(regularUser.homePage, HAMMER_FORGEFLEX_PRODUCTS);
    await verifyProductAbsent(regularUser.homePage, MIGHTYCRAFT_HAMMER);
  });
});
