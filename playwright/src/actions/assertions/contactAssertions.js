import { expect } from '@playwright/test';

export async function verifyContactPageDisplayed(contactPage) {
  await expect(contactPage.firstName).toBeVisible();
  await expect(contactPage.lastName).toBeVisible();
  await expect(contactPage.email).toBeVisible();
  await expect(contactPage.subject).toBeVisible();
  await expect(contactPage.message).toBeVisible();
  await expect(contactPage.attachment).toBeVisible();
  await expect(contactPage.submitButton).toBeVisible();
}

export async function verifyContactMessageSent(contactPage) {
  await expect(contactPage.successMessage).toHaveText(
    'Thanks for your message! We will contact you shortly.',
  );
}
