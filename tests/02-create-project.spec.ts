import { test, expect } from '@playwright/test';
import { ensureLoggedIn } from './helpers';

/**
 * FLOW 2 — Create a project.
 *
 * Confirmed flow against the live app:
 *   /projects → "Add project" → a "Create" dialog opens → pick a project type
 *   ("AI Survey") → "Create AI Survey" → the AI generates a draft and the editor
 *   loads at /projects/<uuid>?tab=form (header now shows Preview + Publish).
 *
 * A first-run-only context dialog (an "additional information" textarea + a
 * "Continue" button) is sometimes shown before the type chooser; we handle it
 * if present and skip it otherwise.
 *
 * AI generation is slow (20–35s), so the timeout here is generous.
 */
test('create an AI survey project', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('/projects');
  await page.waitForTimeout(3000);
  await ensureLoggedIn(page, '/projects'); // refresh session if it expired mid-run
  await page.getByRole('button', { name: 'Add project' }).click({ timeout: 20_000 });
  await page.waitForTimeout(4000);

  // Optional first-time context dialog (textarea + Continue) before the chooser.
  // Target the dialog textarea by placeholder so we don't match the hidden
  // "Ask AI" chat box (which has placeholder "Ask me something ...").
  const contextTextarea = page.locator("textarea[placeholder*='additional information' i]");
  if (await contextTextarea.isVisible().catch(() => false)) {
    await contextTextarea.fill('Beta feedback on our new mobile checkout. Focus on ease of use and trust.');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(20_000); // AI proposes the project types
  }

  // Type chooser ("Create" dialog): pick "AI Survey", then create it.
  // The type cards are <button>s whose text combines a title + description,
  // so match the button that contains the text "AI Survey".
  const surveyCard = page.locator('button', { hasText: 'AI Survey' }).first();
  await expect(surveyCard).toBeVisible({ timeout: 40_000 });
  await surveyCard.click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /create ai/i }).click();

  // The editor loads after AI generation. The definitive proof of creation is
  // the navigation to the project editor URL (the "Form" survey editor), which
  // happens regardless of the optional "Draft project" modal that overlays it.
  await page.waitForURL(/\/projects\/(new|[0-9a-f-]{36}).*tab=form/i, { timeout: 120_000 });
  expect(page.url()).toMatch(/\/projects\/(new|[0-9a-f-]{36})/i);

  // The editor tabs are rendered (Questions / Settings / Analytics).
  await expect(page.getByText('Questions', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  // Best-effort: dismiss the "Draft project" learning-goal dialog if present.
  const skip = page.getByRole('button', { name: 'Skip', exact: true });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => {});
  }
});
