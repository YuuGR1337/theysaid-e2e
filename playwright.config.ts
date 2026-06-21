import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config'; // load THEYSAID_EMAIL / THEYSAID_PASSWORD from .env

/**
 * E2E config for TheySaid (evo.dev.theysaid.io).
 * The `setup` project logs in once (email + password via WorkOS AuthKit) and
 * saves the session to auth.json; every test reuses it via storageState, so we
 * sign in only once per run.
 */
export default defineConfig({
  testDir: './tests',
  // WorkOS enforces a single active session per account, so parallel workers
  // sharing ONE test account churn each other's session and cause flakes.
  // Default to 1 worker for a steady run on a single account; set WORKERS=4
  // (with 4 separate accounts, ideally) to use the full parallelism the
  // assessment allows. Defaults: 1 worker, parallel disabled.
  workers: Number(process.env.WORKERS) || 1,
  fullyParallel: !!process.env.WORKERS,
  // Flows wait on server-side AI generation (20–35s) and AuthKit redirects,
  // so per-test timeouts are generous. Individual specs raise their own via
  // test.setTimeout where needed.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'https://evo.dev.theysaid.io',
    storageState: 'auth.json',          // produced by the `setup` project below
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 25_000,
    navigationTimeout: 60_000,
    // Use the system-installed Google Chrome so the suite runs without
    // downloading a Playwright-pinned Chromium build. Override with
    // PWTEST_CHANNEL='' to fall back to the bundled browser.
    channel: process.env.PWTEST_CHANNEL ?? 'chrome',
    launchOptions: { args: ['--no-sandbox'] },
  },

  projects: [
    // 1) auth setup runs first, saves the logged-in session to auth.json.
    //    It must start WITHOUT storageState (auth.json doesn't exist yet).
    //    Skipped automatically when REUSE_AUTH=1 (an auth.json already exists).
    ...(process.env.REUSE_AUTH
      ? []
      : [{
          name: 'setup',
          testMatch: /auth\.setup\.ts/,
          use: {
            ...devices['Desktop Chrome'],
            channel: process.env.PWTEST_CHANNEL ?? 'chrome',
            storageState: undefined,
          },
        }]),

    // 2) the real tests reuse the saved session.
    {
      name: 'chromium',
      dependencies: process.env.REUSE_AUTH ? [] : ['setup'],
      use: { ...devices['Desktop Chrome'], channel: process.env.PWTEST_CHANNEL ?? 'chrome' },
    },
  ],
});
