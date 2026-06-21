import { test, expect } from '@playwright/test';

/**
 * FLOW 1 — Login.
 * Auth runs in auth.setup.ts (once). This verifies the saved session is valid:
 * loading the app lands in the authenticated dashboard, not the AuthKit sign-in.
 */
test('login: saved session lands in the authenticated app', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Not bounced to the AuthKit sign-in host.
  expect(page.url()).not.toContain('authkit.app');

  // Authenticated left-nav is visible.
  await expect(
    page.getByText(/AI Projects/i).first()
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Teach AI/i).first()).toBeVisible();
});
