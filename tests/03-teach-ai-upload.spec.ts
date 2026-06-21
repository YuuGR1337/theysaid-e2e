import { test, expect, type FileChooser } from '@playwright/test';
import path from 'node:path';

/**
 * FLOW 3 — Upload a document via the "Teach AI" feature.
 * Real flow (confirmed via recon + screenshot): left-nav "Teach AI" →
 * "Contextualize Your AI" page → "Add file" button opens a file chooser →
 * the uploaded filename appears under "Additional information for AI".
 */
test('Teach AI: upload a document', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/');
  await page.waitForTimeout(2500);

  // Navigate to Teach AI via the left nav.
  await page.getByText(/Teach AI/i).first().click({ timeout: 20_000 });
  await expect(page.getByText(/Contextualize Your AI|Add file/i).first())
    .toBeVisible({ timeout: 20_000 });

  const filePath = path.resolve('fixtures/sample.txt');

  // Prefer a real <input type=file>; otherwise the "Add file" button opens a chooser.
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles(filePath);
  } else {
    const addFile = page.getByRole('button', { name: /add file/i }).first();
    const chooserPromise = page.waitForEvent('filechooser');
    await addFile.click();
    const chooser: FileChooser = await chooserPromise;
    await chooser.setInputFiles(filePath);
  }

  // Some UIs need a confirm step after selecting the file.
  const confirm = page.getByRole('button', { name: /^(upload|add|save|done)$/i }).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click().catch(() => {});
  }

  // Verify the document is attached (filename shows, or a success/processing state).
  await expect(
    page.getByText(/sample\.txt/i)
      .or(page.getByText(/uploaded|added|processing|success/i))
      .first()
  ).toBeVisible({ timeout: 45_000 });
});
