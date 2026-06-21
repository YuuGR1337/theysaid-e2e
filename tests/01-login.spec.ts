import { test, expect } from '@playwright/test';
import { expectLoggedIn } from './helpers';

/**
 * FLOW 1 — Login.
 * Auth itself is performed in auth.setup.ts (once). This test asserts that the
 * saved session is valid: loading the app lands us in an authenticated state,
 * not on the login screen.
 */
test('login: saved session lands authenticated', async ({ page }) => {
  await page.goto('/');

  // We should NOT be looking at a login prompt.
  const loginPrompt = page
    .getByRole('button', { name: /^log ?in$|^sign ?in$/i })
    .or(page.getByRole('link', { name: /^log ?in$|^sign ?in$/i }));
  await expect(loginPrompt.first()).toBeHidden({ timeout: 15_000 }).catch(() => {});

  // And we SHOULD see authenticated app chrome.
  await expectLoggedIn(page);
});
