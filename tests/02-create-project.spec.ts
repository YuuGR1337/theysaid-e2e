import { test, expect } from '@playwright/test';
import { action, clickFirstVisible, uniqueName, expectLoggedIn } from './helpers';

/**
 * FLOW 2 — Create a project.
 * TODO(codegen): replace the candidate selectors with the exact ones codegen
 * produced for the "create project" button, the name field, and the submit button.
 */
test('create a project', async ({ page }) => {
  await page.goto('/');
  await expectLoggedIn(page);

  const projectName = uniqueName('project');

  // 1) Open the create-project dialog/page.
  await clickFirstVisible(
    page,
    [
      action(page, /create (a )?project|new project|^create$|\+ ?project/i),
      page.getByRole('button', { name: /^create$|^new$|\+/i }),
    ],
    'create-project entry'
  );

  // 2) Fill the project name.
  const nameField = page
    .getByRole('textbox', { name: /name|title|project/i })
    .or(page.locator('input[name*="name" i], input[placeholder*="name" i], input[type="text"]'))
    .first();
  await nameField.fill(projectName);

  // 3) Submit / confirm creation.
  await clickFirstVisible(
    page,
    [action(page, /create|save|continue|next|submit/i)],
    'confirm create-project'
  );

  // 4) Verify the new project exists (its name is shown somewhere).
  await expect(page.getByText(projectName, { exact: false }).first())
    .toBeVisible({ timeout: 30_000 });

  // Stash the name for any chained run/debugging.
  test.info().annotations.push({ type: 'projectName', description: projectName });
});
