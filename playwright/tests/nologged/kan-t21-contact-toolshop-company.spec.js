import {
  verifyContactMessageSent,
  verifyContactPageDisplayed,
} from '../../src/actions/assertions/contactAssertions.js';
import { test } from '../../src/fixtures/index.js';

const CONTACT_DETAILS = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@mail.com',
  subject: 'webmaster',
  message: 'Automated Test Case Text Message: This is a sample text with nice chars!!',
};

// This case only browses and submits the contact form anonymously, so it is tagged
// @guest and run as an unauthenticated guest - no storageState, no setup-project
// dependency (see the chromium-guest project in playwright.config.js).
test('KAN-T21 Contact Toolshop company', { tag: '@guest' }, async ({ guest }) => {
  await test.step('Open Contact from home page', async () => {
    await guest.openContactFromHome();
    await verifyContactPageDisplayed(guest.contactPage);
  });

  await test.step('Fill user data', async () => {
    await guest.fillContactForm(CONTACT_DETAILS);
  });

  await test.step('Click [Send]', async () => {
    await guest.submitContactForm();
    await verifyContactMessageSent(guest.contactPage);
  });
});
