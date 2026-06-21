# Bonus — Issue Report

> Fill the bracketed bits with what you actually observe during the session; the
> structure below is report-ready. Pick the strongest one you can reproduce.

## Candidate issues to check (high signal on a feedback/survey SaaS)

1. **Survey accepts unlimited/automated responses (no rate-limit / no dedup).**
   A published survey can be submitted repeatedly from the same browser with no
   throttle or duplicate detection → results can be skewed by a script. *Impact:*
   data integrity of the core product (feedback) is undermined.
   *Repro:* publish a project, open the survey link, submit N times in a loop.

2. **Survey link authorization** — does the public survey URL leak project/owner
   data, or is it guessable/enumerable (sequential IDs)? If another project's
   survey is reachable by changing an ID → IDOR. *Impact:* cross-tenant exposure.

3. **Teach AI upload validation** — does it accept oversized files, wrong types
   (`.exe`, `.svg` with script), or empty files without error? Unbounded upload =
   storage/cost abuse; SVG render = stored-XSS vector. *Impact:* abuse / XSS.

4. **Project name / survey answer stored-XSS** — submit `<img src=x onerror=...>`
   as a project name or free-text answer; check whether it renders unescaped in the
   owner's dashboard. *Impact:* stored XSS in an authenticated/admin view.

5. **Session not invalidated on logout** — capture `auth.json`, log out, replay the
   saved session. If it still works → broken session lifecycle.

## Selected issue (write up the one you confirmed)

**Title:** [e.g. Published survey accepts unlimited duplicate submissions]

**Severity:** [Medium/High]  ·  **Area:** [Survey response handling]

**Steps to reproduce:**
1.
2.
3.

**Expected:** [e.g. rate-limit or dedup per respondent/session]

**Actual:** [what happened — include the count / response]

**Evidence:** [screenshot / response snippet — redact anything sensitive]

**Impact:** [why it matters to the business — data integrity, abuse, XSS, exposure]
