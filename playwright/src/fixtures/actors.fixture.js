import { test as base } from '@playwright/test';

import { CustomerActions } from '../actions/CustomerActions.js';
import { ACTORS } from '../config/actors.js';
import { clearSession } from '../utils/session.js';

// Default auth flavour: the setup project signs each role in once for the whole run and
// stores its state, so every test starts authenticated in its own isolated context.
// Every actor lands on the home page before the test runs, so a spec never has to
// open the shop itself.
async function useStoredActor(browser, baseURL, identity, use) {
  const context = await browser.newContext({ baseURL, storageState: identity.statePath });
  const page = await context.newPage();
  const actor = new CustomerActions({ page, context, identity });
  await actor.openShop();
  await use(actor);
  await context.close();
}

export const test = base.extend({
  regularUser: async ({ browser, baseURL }, use) => {
    await useStoredActor(browser, baseURL, ACTORS.regularUser, use);
  },

  secondUser: async ({ browser, baseURL }, use) => {
    await useStoredActor(browser, baseURL, ACTORS.secondUser, use);
  },

  guest: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const actor = new CustomerActions({ page, context, identity: ACTORS.guest });
    await actor.openShop();
    await clearSession(context);
    await use(actor);
    await context.close();
  },
});

export { expect } from '@playwright/test';
