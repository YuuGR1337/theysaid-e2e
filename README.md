# TheySaid — E2E Test Suite

Automated end-to-end tests for **https://evo.dev.theysaid.io/** built with
[Playwright](https://playwright.dev) (TypeScript). Covers four core flows:

1. **Login** — email + password via WorkOS AuthKit; session saved and reused
2. **Create a project** — AI Survey, created from the project-type chooser
3. **Teach AI** — upload a document
4. **Publish a project + take its survey** (the survey is taken as a public respondent)

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
**Recording:** https://drive.google.com/file/d/1jifgCzrFojM51FjUkD6Hfrs0BNeg318W/view?usp=sharing

## Architecture

| Piece | Purpose |
|---|---|
| `tests/auth.setup.ts` | Logs in once, saves the session to `auth.json` (a Playwright *setup project*). |
| `playwright.config.ts` | Reuses `auth.json` via `storageState`; 1 worker by default, `WORKERS=4` to parallelize (see note below). |
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
npm test                 # headless, 1 worker (steady on a single account)
WORKERS=4 npm test       # 4 parallel workers (best with 4 separate accounts)
npm run test:headed      # watch it run
npm run report           # open the HTML report
```

All selectors were derived from the live DOM (AuthKit sign-in, the project-type
chooser, the Teach AI hidden file input, the public survey), so the suite runs
against the real app without hand-tuning. To explore interactively with a
logged-in session: `npm run codegen`.

## Notes / assumptions
- `auth.json`, `.env`, reports, and `test-results/` are gitignored.
- The app auto-generates project titles (`AI Survey <timestamp>`), so reruns
  don't collide; the publish/survey spec resolves the project UUID from the
  project list when the editor stays on `/projects/new`.
- The survey is taken in a fresh, unauthenticated browser context (a real respondent).
- WorkOS uses a single active session per account; running `npm test` with many
  parallel workers on **one** account can churn the session. The suite re-auths
  inline (`ensureLoggedIn`), but for the steadiest run use `--workers=1` or give
  each worker its own account.

## Bonus issue
See [`ISSUE.md`](./ISSUE.md).
