import { Page, expect, Locator } from '@playwright/test';

/**
 * Resilient helpers. These use role/text/placeholder lookups with fallbacks so the
 * tests survive minor UI changes. After you run codegen against the real site,
 * tighten any selector that didn't match — search for "TODO(codegen)".
 */

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
