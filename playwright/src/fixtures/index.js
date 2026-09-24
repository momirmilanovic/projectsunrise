import { mergeTests } from '@playwright/test';

import { test as actorsTest } from './actors.fixture.js';
import { test as workerAuthTest } from './workerAuth.fixture.js';

// One import for specs. Ask for `regularUser` / `secondUser` / `guest` to get the
// storageState flavour, or `workerCustomer` for the worker-scoped one; fixtures are
// lazy, so a spec only pays for what it names.
export const test = mergeTests(actorsTest, workerAuthTest);

export { expect } from '@playwright/test';
