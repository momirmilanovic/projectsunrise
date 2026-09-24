import { mkdirSync } from 'node:fs';

import { test as setup } from '@playwright/test';

import { AUTHENTICATED_ACTORS, passwordFor } from '../src/config/actors.js';
import { AUTH_DIR } from '../src/config/env.js';
import { LoginPage } from '../src/pages/LoginPage.js';

for (const identity of AUTHENTICATED_ACTORS) {
  setup(`authenticate ${identity.id}`, async ({ page }) => {
    mkdirSync(AUTH_DIR, { recursive: true });

    const login = new LoginPage(page);
    await login.open();
    await login.signIn(identity.email, passwordFor(identity));

    await page.context().storageState({ path: identity.statePath });
  });
}
