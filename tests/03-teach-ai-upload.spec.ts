import { test, expect, type FileChooser } from '@playwright/test';
import path from 'node:path';
import { action, clickFirstVisible, uniqueName, expectLoggedIn } from './helpers';

/**
 * FLOW 3 — Upload a document via the "Teach AI" feature.
 * Creates a fresh project first so the test is self-contained, then opens Teach AI
 * and uploads fixtures/sample.txt.
 * TODO(codegen): align the "Teach AI" nav text and the upload control with reality.
 */
test('Teach AI: upload a document', async ({ page }) => {
  await page.goto('/');
  await expectLoggedIn(page);

  // --- create a project to work inside (self-contained) ---
  const projectName = uniqueName('teachai');
  await clickFirstVisible(
    page,
    [action(page, /create (a )?project|new project|^create$|\+ ?project/i)],
    'create-project entry'
  );
  await page
    .getByRole('textbox', { name: /name|title|project/i })
    .or(page.locator('input[type="text"]'))
    .first()
    .fill(projectName);
  await clickFirstVisible(page, [action(page, /create|save|continue|next|submit/i)], 'confirm create');
  await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 30_000 });

  // --- open Teach AI ---
  await clickFirstVisible(
    page,
    [action(page, /teach ai|teach|train|knowledge|documents?/i)],
    'Teach AI entry'
  );

  // --- upload the document ---
  const filePath = path.resolve('fixtures/sample.txt');

  // Prefer a real <input type=file>; otherwise click an upload button that opens a chooser.
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles(filePath);
  } else {
    const uploadBtn = action(page, /upload|add (a )?(document|file)|browse|attach/i).first();
    const chooserPromise = page.waitForEvent('filechooser');
    await uploadBtn.click();
    const chooser: FileChooser = await chooserPromise;
    await chooser.setInputFiles(filePath);
  }

  // Some UIs need an explicit confirm after selecting the file.
  const confirm = action(page, /upload|save|add|done|submit|teach/i).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click().catch(() => {});
  }

  // --- verify the document is attached (filename appears, or a success state) ---
  await expect(
    page.getByText(/sample\.txt/i)
      .or(page.getByText(/uploaded|added|success|processing|trained/i))
      .first()
  ).toBeVisible({ timeout: 45_000 });
});
