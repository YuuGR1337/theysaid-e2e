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
  // We get redirected to the AuthKit hosted sign-in. Wait for the email field.
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 30_000 });

  // Email step. Note: AuthKit appends a "Last used" badge to the button, so its
  // accessible name can be "Continue Last used" — match on substring, not anchored.
  await page.locator('input[name="email"], input[type="email"]').first().fill(EMAIL);
  await page.getByRole('button', { name: /continue/i }).first().click();

  // Password step
  await page.waitForSelector('input[type="password"]', { timeout: 15_000 });
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign ?in/i }).first().click();

  // Sign-in redirects back to the app. Wait until we have actually left the
  // AuthKit host (the redirect chain can briefly keep us on authkit.app).
  await page.waitForURL(/evo\.dev\.theysaid\.io/, { timeout: 30_000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(6000); // allow the session cookie + app boot to settle

  // First-run onboarding may appear (e.g. /home/onboarding/company-info, which
  // has a REQUIRED field and no Skip; the second sub-step has a "Skip" button).
  const skip = page.getByRole('button', { name: 'Skip', exact: true });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Navigate to /projects and confirm we're authenticated. The OAuth redirect
  // chain can momentarily race the session cookie, briefly bouncing /projects
  // back to AuthKit — so retry a few times before giving up.
  const addProject = page.getByRole('button', { name: 'Add project' });
  let authed = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    if (page.url().includes('authkit.app')) {
      // bounced — session not ready yet, wait and retry
      await page.waitForTimeout(3000);
      continue;
    }
    if (await addProject.isVisible().catch(() => false)) {
      authed = true;
      break;
    }
  }
  expect(authed, 'login did not reach the authenticated AI Projects view').toBe(true);

  await page.context().storageState({ path: AUTH_FILE });
});
