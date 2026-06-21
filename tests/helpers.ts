import { Page, expect, Locator } from '@playwright/test';

/**
 * Resilient helpers. These use role/text/placeholder lookups with fallbacks so the
 * tests survive minor UI changes.
 */

/**
 * WorkOS access tokens are short-lived, so during a long sequential run a stored
 * session (auth.json) can expire mid-suite and a navigation bounces to the
 * AuthKit hosted sign-in. `ensureLoggedIn` detects that and re-authenticates
 * inline using the same env credentials as auth.setup.ts, then returns to the
 * app. Call it right after navigating to an authenticated route.
 */
export async function ensureLoggedIn(page: Page, returnTo = '/projects') {
  if (!/authkit\.app/.test(page.url())) return;

  const email = process.env.THEYSAID_EMAIL;
  const password = process.env.THEYSAID_PASSWORD;
  if (!email || !password) {
    throw new Error('THEYSAID_EMAIL / THEYSAID_PASSWORD must be set to re-authenticate.');
  }

  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 20_000 });
  await page.locator('input[name="email"], input[type="email"]').first().fill(email);
  await page.getByRole('button', { name: /continue/i }).first().click();
  await page.waitForSelector('input[type="password"]', { timeout: 15_000 });
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /sign ?in/i }).first().click();
  await page.waitForURL(/evo\.dev\.theysaid\.io/, { timeout: 30_000 });
  await page.waitForTimeout(4000);
  await page.goto(returnTo, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  // Persist the refreshed session for subsequent tests in the run.
  await page.context().storageState({ path: 'auth.json' }).catch(() => {});
}

export function uniqueName(prefix = 'e2e') {
  // time-based unique label so reruns don't collide
  return `${prefix}-${Date.now()}`;
}

/** Click the first visible match among several candidate locators. */
export async function clickFirstVisible(page: Page, candidates: Locator[], what: string) {
  for (const c of candidates) {
    const el = c.first();
    if (await el.isVisible().catch(() => false)) {
      await el.click();
      return;
    }
  }
  throw new Error(`Could not find a clickable element for: ${what}`);
}

/** A button/link by accessible name with a text fallback. */
export function action(page: Page, name: RegExp): Locator {
  return page
    .getByRole('button', { name })
    .or(page.getByRole('link', { name }))
    .or(page.getByText(name));
}

/** Assert we appear to be logged in (dashboard-ish chrome present). */
export async function expectLoggedIn(page: Page) {
  await expect(
    action(page, /create|new project|projects?|logout|account|dashboard/i).first()
  ).toBeVisible({ timeout: 30_000 });
}
