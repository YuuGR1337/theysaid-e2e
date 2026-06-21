import { test, expect } from '@playwright/test';

/**
 * FLOW 2 — Create a project.
 * Real flow (confirmed via recon): /projects → "Add project" →
 * fill the "additional information" textarea → "Continue" (AI generates) →
 * "AI Survey" → "Create AI" → a draft/editor loads.
 *
 * AI generation is slow (20–35s), so timeouts here are generous.
 */
test('create an AI survey project', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('/projects');
  await page.getByRole('button', { name: /add project/i }).click({ timeout: 20_000 });
  await page.waitForTimeout(4000);

  // Describe the project (drives AI generation).
  await page
    .locator("textarea[placeholder*='additional information' i], textarea")
    .first()
    .fill('Beta feedback on our new mobile checkout. Focus on ease of use and trust.');

  await page.getByRole('button', { name: /^continue$/i }).first().click();
  // AI proposes survey types — wait for the choice to appear.
  await page.getByRole('button', { name: /AI Survey/i }).click({ timeout: 40_000 });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /create ai/i }).click();

  // The editor/draft loads after generation.
  await expect(
    page.getByRole('button', { name: /publish|settings|preview|skip/i }).first()
  ).toBeVisible({ timeout: 90_000 });

  // We should now be on a project/editor URL.
  expect(page.url()).toMatch(/projects|editor|survey/i);
});
