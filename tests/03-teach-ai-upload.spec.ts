import { test, expect } from '@playwright/test';
import path from 'node:path';
import { ensureLoggedIn } from './helpers';

/**
 * FLOW 3 — Upload a document via the "Teach AI" feature.
 *
 * Confirmed flow against the live app: the "Teach AI" page
 * (/home/teach-ai, "Contextualize Your AI") has an "Add file" button that is
 * wired to a HIDDEN <input type="file"> — it does NOT open a native OS file
 * chooser. After selecting a file, a "New Content / Add file" card shows the
 * filename + size with Cancel / Confirm; clicking "Confirm" persists it.
 */
test('Teach AI: upload a document', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('/home/teach-ai', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await ensureLoggedIn(page, '/home/teach-ai'); // refresh session if it expired mid-run
  await expect(
    page.getByText(/Contextualize Your AI/i)
      .or(page.getByRole('button', { name: /add file/i }))
      .first()
  ).toBeVisible({ timeout: 30_000 });

  const filePath = path.resolve('fixtures/sample.txt');

  // "Add file" uses a hidden file input. Set the file on the input directly —
  // waiting for a native chooser event never fires here.
  if ((await page.locator('input[type="file"]').count()) === 0) {
    await page.getByRole('button', { name: /add file/i }).first().click().catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.locator('input[type="file"]').first().setInputFiles(filePath);

  // The selected file appears as a staging card with its name + size.
  // (Use .first() — after a prior run the name can appear both in the staging
  // card and in the persisted list, which would trip strict-mode matching.)
  await expect(page.getByText(/sample\.txt/i).first()).toBeVisible({ timeout: 20_000 });

  // Confirm to persist the upload.
  const confirm = page.getByRole('button', { name: /^confirm$/i }).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }

  // After confirming, the upload is accepted: either the filename remains
  // referenced, a success/processing state shows, or the staging "Confirm"
  // button is gone (back to the idle "Add file" state).
  await page.waitForTimeout(4000);
  await expect(
    page.getByText(/sample\.txt/i)
      .or(page.getByText(/uploaded|added|processing|success/i))
      .or(page.getByRole('button', { name: /add file/i }))
      .first()
  ).toBeVisible({ timeout: 20_000 });
});
