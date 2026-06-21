import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for TheySaid (evo.dev.theysaid.io).
 * Auth is reused via storageState (auth.json) so each test starts logged in
 * and we never re-enter the email OTP.
 */
export default defineConfig({
  testDir: './tests',
  // up to 4 parallel threads, as the assessment allows
  workers: 4,
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'https://evo.dev.theysaid.io',
    storageState: 'auth.json',          // produced by the `setup` project below
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    // 1) auth setup runs first, saves the logged-in session to auth.json
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // 2) the real tests depend on setup and reuse its session
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
