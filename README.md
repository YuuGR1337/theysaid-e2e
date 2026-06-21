# TheySaid — E2E Test Suite

Automated end-to-end tests for **https://evo.dev.theysaid.io/** built with
[Playwright](https://playwright.dev) (TypeScript). Covers four core flows:

1. **Login** — session reuse (no OTP re-entry)
2. **Create a project**
3. **Teach AI** — upload a document
4. **Publish a project + take its survey**

Account **sign-up** is intentionally **not** automated (it requires a one-time code
emailed by WorkOS), per the assessment instructions. Signing **in** is email +
password and is fully automated by `tests/auth.setup.ts`.

> **Auth note:** TheySaid signs in via **AuthKit (WorkOS)** — visiting the app
> redirects to `*.authkit.app`. The sign-in flow is **email → _Continue_ →
> password → _Sign in_** (Google / LinkedIn SSO are also offered). The suite logs
> in **once** in `tests/auth.setup.ts` using `THEYSAID_EMAIL` / `THEYSAID_PASSWORD`
> from `.env`, saves the session to `auth.json`, and every other test reuses it via
> `storageState`. WorkOS access tokens are short-lived, so each flow spec also calls
> `ensureLoggedIn()` to transparently re-authenticate if the session expires
> mid-run. Account sign-up (the email code) is never automated.

## 🎥 Session recording
<!-- REPLACE the link below with your Google Drive URL, shared as "Anyone with the link". -->
**Recording:** _TODO — paste Google Drive link here (set sharing to "Anyone with the link")_

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

> **Browser:** the config uses your system **Google Chrome** (`channel: 'chrome'`),
> so `npx playwright install` is optional. To use Playwright's bundled Chromium
> instead, run `PWTEST_CHANNEL='' npx playwright install chromium` and unset the
> channel.

### Authenticate (gives every test a logged-in session)

Copy `.env.example` → `.env` and set your credentials:

```bash
THEYSAID_EMAIL=you@example.com
THEYSAID_PASSWORD="your-password"   # quote it — passwords with '#' break dotenv otherwise
```

`tests/auth.setup.ts` then logs in for you (email + password) and saves the session
to `auth.json`. Every other spec reuses it. No manual step is needed.

> Already have a valid `auth.json`? Run with `REUSE_AUTH=1 npm test` to skip the
> login setup and reuse the saved session.

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
