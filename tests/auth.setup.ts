import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';

/**
 * AUTH SETUP — runs once before everything, saves the logged-in session to auth.json.
 *
 * Two ways to provide the session (in priority order):
 *
 *  A) BEST / fastest — capture it once with codegen, no code needed:
 *       npx playwright codegen --save-storage=auth.json https://evo.dev.theysaid.io/
 *     ...log in by hand (enter the email OTP once), close the window. auth.json now
 *     holds your session and this setup will detect it and pass instantly.
 *
 *  B) Automated password login — if the app supports email+password (no OTP),
 *     set THEYSAID_EMAIL / THEYSAID_PASSWORD in .env and this file logs in for you.
 *
 * Registration is intentionally NOT automated (requires manual OTP from email),
 * per the assessment instructions.
 */

const AUTH_FILE = 'auth.json';
const EMAIL = process.env.THEYSAID_EMAIL;
const PASSWORD = process.env.THEYSAID_PASSWORD;

setup('authenticate', async ({ page }) => {
  // A) If a codegen-captured session already exists and looks non-empty, trust it.
  if (fs.existsSync(AUTH_FILE)) {
    const raw = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const hasState =
      (raw.cookies && raw.cookies.length) ||
      (raw.origins && raw.origins.length);
    if (hasState) {
      setup.skip(true, 'auth.json already present (captured via codegen) — reusing it.');
      return;
    }
  }

  // B) Automated password login fallback.
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'No auth.json found and THEYSAID_EMAIL/THEYSAID_PASSWORD not set.\n' +
      'Easiest fix: npx playwright codegen --save-storage=auth.json https://evo.dev.theysaid.io/\n' +
      'log in by hand once, then re-run the tests.'
    );
  }

  // NOTE: TheySaid uses AuthKit (WorkOS). Visiting the app redirects to
  // *.authkit.app with an email field ("Your email address") + "Continue",
  // then an EMAIL OTP step. OTP cannot be automated → prefer the codegen path
  // above. This password fallback only works if WorkOS is configured for
  // email+password (it is usually OTP/magic-link/SSO, so this may not apply).
  await page.goto('/');

  // We are redirected to the AuthKit sign-in page. Enter email, click Continue.
  await page.locator('input[type="email"], input[name="email"]')
    .first()
    .fill(EMAIL);

  await page.getByRole('button', { name: /continue|sign ?in|log ?in/i })
    .first()
    .click();

  // If a password field appears (password-enabled tenants), fill it; otherwise
  // an OTP/magic-link screen is shown and this fallback cannot proceed.
  const pw = page.locator('input[type="password"]').first();
  if (await pw.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await pw.fill(PASSWORD);
    await page.getByRole('button', { name: /continue|sign ?in|log ?in|submit/i }).first().click();
  } else {
    throw new Error(
      'AuthKit asked for an email OTP/magic-link (no password field). ' +
      'Automated password login is not possible for this tenant. ' +
      'Run: npm run auth  (log in by hand once; auth.json will be captured).'
    );
  }

  // Success = back on the app (not authkit.app) with authenticated chrome.
  await expect(page).toHaveURL(/evo\.dev\.theysaid\.io/, { timeout: 30_000 });
  await expect(
    page.getByRole('button', { name: /create|new project|logout|account/i })
      .or(page.getByText(/projects?/i))
      .first()
  ).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
