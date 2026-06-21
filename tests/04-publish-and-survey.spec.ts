import { test, expect } from '@playwright/test';
import { action, clickFirstVisible, uniqueName, expectLoggedIn } from './helpers';

/**
 * FLOW 4 — Publish a project, then take its survey.
 * Self-contained: creates a project, publishes it, opens the public/share survey
 * link, and answers it.
 * TODO(codegen): align "publish", the share-link surface, and the survey
 * question/answer/submit controls with the real DOM.
 */
test('publish a project and take its survey', async ({ page, context }) => {
  await page.goto('/');
  await expectLoggedIn(page);

  // --- create a project ---
  const projectName = uniqueName('publish');
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

  // --- publish ---
  await clickFirstVisible(
    page,
    [action(page, /publish|go live|share/i)],
    'publish button'
  );

  // Confirm publish if a dialog appears.
  const confirmPublish = action(page, /publish|confirm|share|done/i).first();
  if (await confirmPublish.isVisible().catch(() => false)) {
    await confirmPublish.click().catch(() => {});
  }
  await expect(
    page.getByText(/published|live|copy link|share link/i).first()
  ).toBeVisible({ timeout: 30_000 });

  // --- obtain the survey/share URL ---
  // Try to read a link from an input or an anchor; fall back to current page.
  let surveyUrl = page.url();
  const linkInput = page.locator('input[readonly], input[value*="http"]').first();
  if (await linkInput.count()) {
    const v = await linkInput.inputValue().catch(() => '');
    if (v.startsWith('http')) surveyUrl = v;
  } else {
    const anchor = page.locator('a[href*="http"]').filter({ hasText: /survey|share|public|view/i }).first();
    if (await anchor.count()) {
      surveyUrl = (await anchor.getAttribute('href')) || surveyUrl;
    }
  }

  // --- take the survey in a fresh (respondent) context, no auth ---
  const respondent = await context.browser()!.newContext({ storageState: undefined });
  const sp = await respondent.newPage();
  await sp.goto(surveyUrl);

  // Start the survey if there's an intro/start button.
  const start = action(sp, /start|begin|take (the )?survey|continue/i).first();
  if (await start.isVisible().catch(() => false)) await start.click().catch(() => {});

  // Answer up to a few questions generically: pick first option, or type text, then advance.
  for (let i = 0; i < 6; i++) {
    const option = sp.getByRole('radio').or(sp.locator('[role="option"], .option, button[data-option]')).first();
    const textbox = sp.getByRole('textbox').first();

    if (await option.isVisible().catch(() => false)) {
      await option.click().catch(() => {});
    } else if (await textbox.isVisible().catch(() => false)) {
      await textbox.fill('Automated e2e survey answer.').catch(() => {});
    }

    const next = action(sp, /next|continue|submit|finish|done|send/i).first();
    if (await next.isVisible().catch(() => false)) {
      await next.click().catch(() => {});
    } else {
      break;
    }
    await sp.waitForTimeout(500);
  }

  // --- verify completion ---
  await expect(
    sp.getByText(/thank you|thanks|completed|submitted|response recorded|done/i).first()
  ).toBeVisible({ timeout: 30_000 });

  await respondent.close();
});
