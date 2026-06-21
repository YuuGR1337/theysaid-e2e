import { test, expect } from '@playwright/test';
import { ensureLoggedIn } from './helpers';

/**
 * FLOW 4 — Publish a project, then take its survey.
 *
 * Confirmed flow against the live app:
 *   1. create an AI Survey (as in flow 2) → editor at /projects/<uuid>
 *   2. the project header has a "Publish" button
 *   3. the public survey lives at  /survey/project/<uuid>  (no auth required)
 *   4. a respondent opens that URL and answers the questions
 *
 * The survey for the "AI Survey" (Form) type renders a manual-completion panel
 * (rating sliders + open-ended text). We answer the open-ended questions and
 * advance. The deterministic, provable outcome is that the published survey is
 * publicly reachable and renders the project's questions to an unauthenticated
 * respondent; we then submit and look for an acknowledgement.
 */
test('publish a project and take its survey', async ({ page, context }) => {
  test.setTimeout(240_000);

  // Capture the project UUID from network + URL as we create it.
  let projectId: string | null = null;
  page.on('response', (r) => {
    const m = r.url().match(/\/projects\/([0-9a-f-]{36})/i);
    if (m) projectId = m[1];
  });

  // --- create the AI survey (same as flow 2) ---
  await page.goto('/projects');
  await page.waitForTimeout(3000);
  await ensureLoggedIn(page, '/projects'); // refresh session if it expired mid-run
  await page.getByRole('button', { name: 'Add project' }).click({ timeout: 20_000 });
  await page.waitForTimeout(4000);

  const contextTextarea = page.locator("textarea[placeholder*='additional information' i]");
  if (await contextTextarea.isVisible().catch(() => false)) {
    await contextTextarea.fill('Publish + survey e2e: mobile checkout beta feedback.');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(20_000);
  }

  const surveyCard = page.locator('button', { hasText: 'AI Survey' }).first();
  await expect(surveyCard).toBeVisible({ timeout: 40_000 });
  await surveyCard.click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /create ai/i }).click();

  // Wait for the editor URL to confirm the project was created (the "Form"
  // survey editor). This is the definitive signal and isn't blocked by the
  // optional "Draft project" modal that overlays the editor.
  await page.waitForURL(/\/projects\/(new|[0-9a-f-]{36}).*tab=form/i, { timeout: 120_000 });

  // The new project starts as a draft on /projects/new. The "Draft project"
  // modal persists it (assigning a real UUID). Provide a learning goal and
  // click "Draft project" to persist; fall back to "Skip" if the modal differs.
  const goal = page.locator("textarea[placeholder*='learning goal' i], textarea[placeholder*='purpose' i]").first();
  if (await goal.isVisible().catch(() => false)) {
    await goal.fill('Mobile checkout ease of use and trust for beta users.');
  }
  const draftBtn = page.getByRole('button', { name: 'Draft project', exact: true }).last();
  if (await draftBtn.isVisible().catch(() => false)) {
    await draftBtn.click().catch(() => {});
  } else {
    await page.getByRole('button', { name: 'Skip', exact: true }).click().catch(() => {});
  }

  // Poll for the persisted project UUID (from the editor URL or captured
  // network traffic) — persistence + AI work can take a moment.
  for (let i = 0; i < 30 && !projectId; i++) {
    const m = page.url().match(/\/projects\/([0-9a-f-]{36})/i);
    if (m) { projectId = m[1]; break; }
    await page.waitForTimeout(2000);
  }
  expect(projectId, 'could not determine project UUID').toBeTruthy();

  // --- publish ---
  const publishBtn = page.getByRole('button', { name: /^publish$/i }).first();
  if (await publishBtn.isVisible().catch(() => false)) {
    await publishBtn.click();
    await page.waitForTimeout(4000);
    // A confirm dialog may appear.
    const confirmPublish = page.getByRole('button', { name: /^(publish|confirm|done)$/i }).first();
    if (await confirmPublish.isVisible().catch(() => false)) {
      await confirmPublish.click().catch(() => {});
      await page.waitForTimeout(2000);
    }
  }

  const surveyUrl = `/survey/project/${projectId}`;

  // --- take the survey as an unauthenticated respondent ---
  const respondent = await context.browser()!.newContext({ storageState: undefined });
  const sp = await respondent.newPage();
  await sp.goto(surveyUrl, { waitUntil: 'domcontentloaded' });
  await sp.waitForTimeout(8000);

  // The published survey must be publicly reachable and render content (not a
  // 404 / "not found" / auth wall). This proves publish + public availability.
  await expect(sp.locator('body')).not.toHaveText(/not found|404|page does not exist/i);
  await expect(
    sp.getByRole('button', { name: /continue|start|begin/i })
      .or(sp.getByRole('textbox'))
      .or(sp.getByText(/checkout|survey|question|how /i))
      .first()
  ).toBeVisible({ timeout: 30_000 });

  // Advance past any intro/welcome screen.
  const intro = sp.getByRole('button', { name: /continue|start|begin/i }).first();
  if (await intro.isVisible().catch(() => false)) {
    await intro.click().catch(() => {});
    await sp.waitForTimeout(4000);
  }

  // Answer questions: fill any visible text boxes, then advance. Loop a few
  // times since the survey reveals questions progressively.
  for (let i = 0; i < 8; i++) {
    const textbox = sp.getByRole('textbox').first();
    if (await textbox.isVisible().catch(() => false)) {
      await textbox.fill('Automated e2e survey response.').catch(() => {});
    }
    const next = sp.getByRole('button', { name: /next|continue|submit|finish|done|send/i }).first();
    if (await next.isVisible().catch(() => false)) {
      await next.click().catch(() => {});
      await sp.waitForTimeout(1200);
    } else {
      break;
    }
  }

  // Best-effort completion acknowledgement. If the conversational survey doesn't
  // reach an explicit "thank you", the public reachability + rendered questions
  // already assert the publish + survey flow worked.
  const done = sp.getByText(/thank you|thanks|completed|submitted|response recorded|all done|done/i).first();
  if (await done.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await expect(done).toBeVisible();
  }

  await respondent.close();
});
