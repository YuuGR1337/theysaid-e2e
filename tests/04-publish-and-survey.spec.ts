import { test, expect } from '@playwright/test';

/**
 * FLOW 4 — Publish a project, then take its survey.
 * Real flow (confirmed via recon): create the AI survey (as in flow 2),
 * locate Publish (editor or Settings tab), derive the public survey URL
 *   https://evo.dev.theysaid.io/survey/project/<uuid>
 * then answer it in a fresh, unauthenticated context (a real respondent).
 */
test('publish a project and take its survey', async ({ page, context }) => {
  test.setTimeout(220_000);

  // Capture the project UUID from network traffic as we create it.
  let projectId: string | null = null;
  page.on('response', (r) => {
    const m = r.url().match(/\/projects\/([0-9a-f-]{36})/i);
    if (m) projectId = m[1];
  });

  // --- create the AI survey (same as flow 2) ---
  await page.goto('/projects');
  await page.getByRole('button', { name: /add project/i }).click({ timeout: 20_000 });
  await page.waitForTimeout(4000);
  await page
    .locator("textarea[placeholder*='additional information' i], textarea")
    .first()
    .fill('Publish + survey e2e: mobile checkout beta feedback.');
  await page.getByRole('button', { name: /^continue$/i }).first().click();
  await page.getByRole('button', { name: /AI Survey/i }).click({ timeout: 40_000 });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /create ai/i }).click();
  await page.waitForTimeout(30_000);

  // Skip the draft "learning goal" dialog if present.
  const skip = page.getByRole('button', { name: /^skip$/i }).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Capture id from the editor URL too.
  const um = page.url().match(/\/projects\/([0-9a-f-]{36})/i);
  if (um) projectId = um[1];

  // --- publish ---
  const publishBtn = page.getByRole('button', { name: /^publish$/i }).first();
  if (await publishBtn.isVisible().catch(() => false)) {
    await publishBtn.click();
    await page.waitForTimeout(4000);
    // confirm dialog, if any
    const confirmPublish = page.getByRole('button', { name: /publish|confirm|share|done/i }).first();
    if (await confirmPublish.isVisible().catch(() => false)) {
      await confirmPublish.click().catch(() => {});
    }
  } else {
    // Publish may live under a Settings tab.
    const settings = page.getByRole('button', { name: /settings/i })
      .or(page.getByRole('tab', { name: /settings/i }));
    if (await settings.first().isVisible().catch(() => false)) {
      await settings.first().click();
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: /^publish$/i }).first().click().catch(() => {});
      await page.waitForTimeout(3000);
    }
  }

  expect(projectId, 'could not determine project UUID').toBeTruthy();
  const surveyUrl = `https://evo.dev.theysaid.io/survey/project/${projectId}`;

  // --- take the survey as an unauthenticated respondent ---
  const respondent = await context.browser()!.newContext({ storageState: undefined });
  const sp = await respondent.newPage();
  await sp.goto(surveyUrl, { waitUntil: 'domcontentloaded' });
  await sp.waitForTimeout(6000);

  // Start if there is an intro/start button.
  const start = sp.getByRole('button', { name: /start|begin|take (the )?survey|continue/i }).first();
  if (await start.isVisible().catch(() => false)) await start.click().catch(() => {});

  // Answer a few questions generically: pick an option or type text, then advance.
  for (let i = 0; i < 8; i++) {
    const option = sp.getByRole('radio')
      .or(sp.locator('[role="option"], button[data-option], .option'))
      .first();
    const textbox = sp.getByRole('textbox').first();

    if (await option.isVisible().catch(() => false)) {
      await option.click().catch(() => {});
    } else if (await textbox.isVisible().catch(() => false)) {
      await textbox.fill('Automated e2e survey response.').catch(() => {});
    }

    const next = sp.getByRole('button', { name: /next|continue|submit|finish|done|send/i }).first();
    if (await next.isVisible().catch(() => false)) {
      await next.click().catch(() => {});
      await sp.waitForTimeout(800);
    } else {
      break;
    }
  }

  // Verify completion.
  await expect(
    sp.getByText(/thank you|thanks|completed|submitted|response recorded|done/i).first()
  ).toBeVisible({ timeout: 30_000 });

  await respondent.close();
});
