# TheySaid — E2E Test Suite

Automated end-to-end tests for **https://evo.dev.theysaid.io/** built with
[Playwright](https://playwright.dev) (TypeScript). Covers four core flows:

1. **Login** — session reuse (no OTP re-entry)
2. **Create a project**
3. **Teach AI** — upload a document
4. **Publish a project + take its survey**

Registration is intentionally **not** automated (it requires manually entering an
email OTP), per the assessment instructions.

> **Auth note:** TheySaid signs in via **AuthKit (WorkOS)** — visiting the app
> redirects to `*.authkit.app` (email → *Continue* → **email OTP**, or Google /
> LinkedIn SSO). Because login requires a one-time code from email, the suite
> captures the session **once** via `npm run auth` (Playwright codegen with
> `--save-storage`) and every test reuses it through `storageState`. No OTP is
> ever entered by the tests.

## 🎥 Session recording
<!-- paste your Google Drive link (set to "Anyone with the link") -->
**Recording:** `https://drive.google.com/...`  ← *replace with your viewable link*

## Architecture

| Piece | Purpose |
|---|---|
| `tests/auth.setup.ts` | Logs in once, saves the session to `auth.json` (a Playwright *setup project*). |
| `playwright.config.ts` | Reuses `auth.json` via `storageState`; runs up to **4 parallel workers**. |
| `tests/01..04` | One spec per flow; each is self-contained. |
| `tests/helpers.ts` | Resilient role/text selector helpers. |
| `fixtures/sample.txt` | Document uploaded by the Teach AI test. |

## Setup

```bash
npm install
npx playwright install --with-deps
```

### Authenticate once (gives every test a logged-in session)

Easiest — capture your real session with codegen (do the email OTP by hand once):

```bash
npm run auth
# = playwright codegen --save-storage=auth.json https://evo.dev.theysaid.io/
# log in in the window that opens, then close it. auth.json is created.
```

*Or* automate password login (only if the app supports email+password): copy
`.env.example` → `.env`, set `THEYSAID_EMAIL` / `THEYSAID_PASSWORD`, and the
setup project logs in for you.

## Run

```bash
npm test            # headless, 4 workers
npm run test:headed # watch it run
npm run report      # open the HTML report
```

## Refining selectors (important)

The selectors are deliberately resilient (role/text/placeholder with fallbacks) so
the suite runs without hand-tuning. Where the live DOM differs, record the exact
locators and drop them in — search the specs for `TODO(codegen)`:

```bash
npm run codegen   # opens the app already logged in; click a flow, copy the locators
```

## Notes / assumptions
- `auth.json`, `.env`, reports, and `test-results/` are gitignored.
- Tests create uniquely-named projects (`*-<timestamp>`) so reruns don't collide.
- The survey is taken in a fresh, unauthenticated browser context (as a real respondent).

## Bonus issue
See [`ISSUE.md`](./ISSUE.md).
