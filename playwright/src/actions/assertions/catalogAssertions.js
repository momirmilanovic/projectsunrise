import { expect } from '@playwright/test';

import { exactText } from '../../utils/text.js';

// Element sets observed against staging on 2026-09-11 (see ProductPage/HomePage/Header).
export async function verifyProductPageDisplayed(productPage, productName) {
  await expect(productPage.name).toHaveText(productName);
  await expect(productPage.unitPrice).toBeVisible();
  await expect(productPage.description).toBeVisible();
  await expect(productPage.quantity).toBeVisible();
  await expect(productPage.decreaseQuantity).toBeVisible();
  await expect(productPage.increaseQuantity).toBeVisible();
  await expect(productPage.addToCartButton).toBeVisible();
  await expect(productPage.addToFavoritesButton).toBeVisible();
  await expect(productPage.addToCompareButton).toBeVisible();
}

export async function verifyProductTagsDisplayed(productPage, categoryLabel, brandLabel) {
  await expect(productPage.categoryTag).toHaveText(exactText(categoryLabel));
  await expect(productPage.brandTag).toHaveText(exactText(brandLabel));
}

export async function verifyProductQuantity(productPage, expectedQuantity) {
  await expect(productPage.quantity).toHaveValue(String(expectedQuantity));
}

// Navigating the nav "Categories" menu narrows the sidebar's "By category" tree to just
// that category (and its subcategories) - "By brand" stays present alongside it.
export async function verifyCategoryPageDisplayed(homePage, categoryName) {
  await expect(homePage.page.getByRole('heading', { name: `Category: ${categoryName}` })).toBeVisible();
  await expect(homePage.categoryCheckbox(categoryName)).toBeVisible();
  await expect(homePage.page.getByRole('heading', { name: 'By brand:' })).toBeVisible();
}

export async function verifyHomePageDisplayed(homePage, header) {
  await expect(homePage.page).toHaveURL(/\/$/);
  await expect(header.logo).toBeVisible();
  await expect(homePage.filters).toBeVisible();
  await expect(homePage.sort).toBeVisible();
  await expect(homePage.searchQuery).toBeVisible();
  await expect(homePage.productCards.first()).toBeVisible();
}
