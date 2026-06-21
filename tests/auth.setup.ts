import { test as setup, expect } from '@playwright/test';

/**
 * AUTH SETUP — logs in once via WorkOS AuthKit (email + password) and saves the
 * session to auth.json. Every other test reuses it through `storageState`.
 *
 * Real flow (confirmed against the live app):
 *   app → redirect to *.authkit.app
 *   input[name=email] → button "Continue"
 *   input[type=password] → button "Sign in"
 *   → back on evo.dev.theysaid.io (onboarding "Skip" if shown)
 *
 * Credentials come from env (.env): THEYSAID_EMAIL / THEYSAID_PASSWORD.
 * Registration is NOT automated (would need a manual email OTP), per the brief.
 */

const AUTH_FILE = 'auth.json';
const EMAIL = process.env.THEYSAID_EMAIL;
const PASSWORD = process.env.THEYSAID_PASSWORD;

setup('authenticate', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Set THEYSAID_EMAIL and THEYSAID_PASSWORD in .env (copy .env.example).');
  }

  await page.goto('/');
  await page.waitForTimeout(4000); // let the AuthKit redirect settle

  // Email step
  await page.locator('input[name="email"], input[type="email"]').first().fill(EMAIL);
  await page.getByRole('button', { name: /^continue$/i }).first().click();

  // Password step
  await page.waitForSelector('input[type="password"]', { timeout: 15_000 });
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /^sign ?in$/i }).first().click();

  // Back on the app
  await page.waitForURL(/evo\.dev\.theysaid\.io/, { timeout: 30_000 });
  await page.waitForTimeout(4000);

  // Skip onboarding if it appears
  const skip = page.getByText('Skip', { exact: true });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Sanity: left-nav of the authed app is present
  await expect(
    page.getByText(/AI Projects|Teach AI|Templates/i).first()
  ).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
