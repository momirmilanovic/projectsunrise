import { defineConfig, devices } from '@playwright/test';

import { ENV } from './src/config/env.js';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // retries: isCI ? 2 : 0,
 // workers: isCI ? 2 : undefined,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: ENV.baseURL,
    trace: 'only-on-failure',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testDir: './setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      grepInvert: /@guest/,
    },
    // Specs tagged @guest browse anonymously and never read an actor's password, so
    // they run here without the setup project's storageState dependency.
    {
      name: 'chromium-guest',
      use: { ...devices['Desktop Chrome'] },
      grep: /@guest/,
    },
  ],
});
