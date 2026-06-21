# Bonus Issue — Third-party ad/remarketing trackers fire on the survey page before consent

**Severity:** Medium (privacy / compliance)
**Area:** Public respondent survey — `https://evo.dev.theysaid.io/survey/project/<id>`
**Type:** Privacy / data-protection (GDPR / ePrivacy consent), no auth required to observe

## Summary
The public survey page — the screen that explicitly tells a respondent *"We'll need
to record your screen and your voice to capture your experience"* — loads and fires
**third-party advertising / remarketing trackers immediately on page load, before the
respondent consents to anything**. On a voice-and-screen feedback tool, shipping a
DoubleClick **remarketing** pixel onto the respondent flow is a meaningful privacy /
GDPR-ePrivacy problem (non-essential tracking requires prior consent in the EU/UK).

## Evidence (captured, no auth)
Loading `/survey/project/de8a7841-d582-43c0-8f89-8babf732a09d` and clicking
**Continue** issues these POSTs (network capture):

```
POST https://ad.doubleclick.net/ccm/s/collect?...                 # Google Ads conversion
POST https://www.google.com/rmkt/collect/16645073876/?...&en=gtag.config   # REMARKETING tag
POST https://www.google.com/ccm/collect?...&en=page_view&dl=.../survey/project/<id>
POST https://events.theysaid.io/flags/?v=2&...                    # feature-flag beacon
```

- The page URL (containing the survey/project id) is sent to Google in `dl=`.
- These fire **before** the respondent grants screen/voice permission
  ("Waiting for permissions...") — i.e. before any meaningful consent step.
- No cookie-consent / tracking-consent gate is presented first.

## Why it matters (business impact)
- **Compliance exposure:** EU/UK ePrivacy + GDPR require prior, informed consent for
  non-essential (advertising/remarketing) trackers. Firing them on a research page
  that records voice + screen raises the risk profile sharply.
- **Respondent trust:** participants in a "user test" don't expect to be added to an
  ad-remarketing audience; the survey/project id leaks to Google in the page URL.
- **Easy to miss:** it's invisible in normal QA (no functional break), which is why
  it fits "an issue we couldn't think of."

## Reproduction
1. Open `https://evo.dev.theysaid.io/survey/project/de8a7841-d582-43c0-8f89-8babf732a09d`
   in a fresh browser (no auth), with the Network tab open.
2. Observe `doubleclick.net/ccm/s/collect`, `google.com/rmkt/collect/...`, and
   `google.com/ccm/collect?...page_view` requests on load / after **Continue** —
   before any consent prompt.
3. Note the survey/project id is included in the `dl=` (document location) parameter.

## Recommendation
- Gate all non-essential (ads/remarketing/analytics) tags behind an explicit consent
  step shown *before* they load, especially on the respondent survey surface.
- Strip the survey/project id from URLs sent to third-party ad endpoints.
- Consider a Consent Mode / CMP for EU/UK traffic.

---
### Secondary hardening notes (lower severity, same surface)
- **Security response headers absent** on the survey page: `X-Frame-Options`,
  `Content-Security-Policy`, `X-Content-Type-Options` are all missing → the survey
  is framable (clickjacking/UI-redress exposure).
- **Survey-existence oracle:** a valid id renders "Welcome to the User Test!" while a
  non-existent id renders "This Survey Link Has Expired" (HTTP 200 both) — lets an
  unauthenticated visitor distinguish real vs fake survey ids. Low impact; note only.
- Verified NON-issues (checked, not reportable): `/.env` returns the SPA shell (not a
  real env leak — identical to any 404 path); `/api/*` endpoints correctly return 401;
  survey ids are UUIDv4 (not enumerable by increment); no IDOR (invalid id leaks no data).
