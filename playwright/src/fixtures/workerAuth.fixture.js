import { test as base } from '@playwright/test';

import { CustomerActions } from '../actions/CustomerActions.js';
import { ACTORS, passwordFor } from '../config/actors.js';
import { ENV } from '../config/env.js';
import { LoginPage } from '../pages/LoginPage.js';

// Alternative auth flavour: one UI sign-in per worker, reused by every test that worker
// runs. Simpler than the setup project, but tests share a context and so share state.
// It calls the same LoginPage.signIn as auth.setup.js - login is implemented once.
export const test = base.extend({
  workerCustomer: [
    async ({ browser }, use) => {
      const identity = ACTORS.regularUser;
      const context = await browser.newContext({ baseURL: ENV.baseURL });
      const page = await context.newPage();

      const login = new LoginPage(page);
      await login.open();
      await login.signIn(identity.email, passwordFor(identity));

      const actor = new CustomerActions({ page, context, identity });
      await actor.openShop();
      await use(actor);
      await context.close();
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
