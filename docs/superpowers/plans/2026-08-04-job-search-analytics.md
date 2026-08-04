# Job-Search Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the planned Analytics page with a complete local-first analytics workspace and an editable, evidence-safe Skill-Gap Roadmap.

**Architecture:** Pure analytics and keyword modules calculate deterministic aggregates from normalized records. A server orchestration layer loads the active filesystem or Postgres stores, applies filters, synchronizes skill gaps, and exposes aggregate-only APIs. Focused React components render responsive native SVG/CSS charts and editable roadmap controls without introducing a chart dependency.

**Tech Stack:** Next.js 16.3 App Router, React 19, JavaScript modules, Tailwind CSS 4, Drizzle ORM, PostgreSQL/Supabase, PGlite, Node verification scripts.

## Global Constraints

- Never fabricate experience, evidence, outcomes, dates, skills, qualifications, or causation.
- Analytics must work in both filesystem and database storage modes.
- Database records must be scoped by `user_id`; filesystem IDs and filenames must reject path traversal.
- Do not send complete resumes or complete job descriptions to the analytics client.
- Do not add a chart dependency; use semantic HTML and lightweight SVG/CSS.
- Every rate returns numerator and denominator; zero-denominator rates are unavailable, not `0%`.
- Performance groups with fewer than five submissions show the exact warning `Not enough applications to identify a reliable pattern.`
- `Verified in Resume` requires `Strong` evidence and never follows automatically from a learning status.
- Read the relevant Next.js 16.3 guides in `node_modules/next/dist/docs/` before changing route handlers or client components.
- Follow red-green-refactor for calculation, storage, and API behavior.

---

## File map

### Calculation and orchestration

- Create `lib/analytics/core.js`: submitted-stage detection, rates, time series, pipeline, breakdowns, score bands, and resume performance.
- Create `lib/analytics/keywords.js`: description deduplication, taxonomy extraction, evidence classification, and derived gap records.
- Create `lib/analytics/filters.js`: query parsing, normalization, and record filtering.
- Create `lib/analytics.js`: load active stores, normalize full application data, calculate analytics, and synchronize gaps.

### Skill-gap storage

- Create `lib/skillGapsShared.js`: enums, editable fields, ID validation, and patch validation.
- Create `lib/skillGaps.js`: active-driver dispatcher.
- Create `lib/store/skillGaps.fs.js`: local JSON persistence.
- Create `lib/store/skillGaps.db.js`: user-scoped Drizzle persistence.
- Modify `lib/db/schema.js`: add `skillGaps` table.
- Create the next generated `drizzle/*.sql` migration and update Drizzle metadata.

### APIs

- Create `app/api/analytics/route.js`: aggregate-only `GET` endpoint.
- Create `app/api/skill-gaps/[id]/route.js`: validated `PATCH` endpoint.

### UI

- Replace `app/analytics/page.js`.
- Create focused files under `components/analytics/` for filters, summary, charts, performance, keyword trends, roadmap editing, definitions, data-quality notices, loading, and empty states.
- Create `lib/analytics/client.js` for URL query construction, percentage formatting, and optimistic roadmap patch helpers.

### Verification and docs

- Create `scripts/verify-analytics-core.mjs`.
- Create `scripts/verify-analytics-keywords.mjs`.
- Create `scripts/verify-skill-gaps.mjs`.
- Create `scripts/verify-analytics-api.mjs`.
- Modify `scripts/verify-schema.mjs`, `package.json`, `README.md`, and `SETUP.md`.

---

### Task 1: Pure application analytics engine

**Files:**

- Create: `scripts/verify-analytics-core.mjs`
- Create: `lib/analytics/core.js`
- Modify: `package.json`

**Interfaces:**

- Consumes normalized applications shaped as `{ id, company, companySlug, role, roleSlug, location, applicationSource, status, submittedAt, applicationDate, createdAt, matchScore, resumeVariant, baseProfileId, submittedResumeVersion, mode, activity[] }` and normalized reminders.
- Produces `buildApplicationAnalytics({ applications, reminders, now })` and exported helpers `applicationFacts(app)`, `rate(numerator, denominator)`, and `filterApplications(applications, filters)`.

- [ ] **Step 1: Add a failing fixture verifier**

Create `scripts/verify-analytics-core.mjs` with a small assertion harness and fixtures that prove:

```js
const appliedThenRejected = {
  id: "a1",
  company: "Google",
  companySlug: "google",
  role: "Product Designer",
  roleSlug: "product-designer",
  status: "Rejected",
  submittedAt: "2026-07-01T09:00:00.000Z",
  matchScore: 82,
  resumeVariant: "v4",
  baseProfileId: "product-designer",
  activity: [
    { type: "status_changed", to: "Applied", createdAt: "2026-07-01T09:00:00.000Z" },
    { type: "status_changed", to: "Interviewing", createdAt: "2026-07-05T09:00:00.000Z" },
    { type: "status_changed", to: "Rejected", createdAt: "2026-07-10T09:00:00.000Z" },
  ],
};

const facts = applicationFacts(appliedThenRejected);
check("submitted from history", facts.submitted);
check("historical interview retained", facts.interviewed);
check("rejection retained", facts.rejected);
check("response time uses first response", facts.responseHours === 96);
```

Also assert zero-denominator rate shape `{ value: null, numerator: 0, denominator: 0 }`, weekly grouping, current status distribution, pipeline reach, score bands, source fallback to `Unspecified`, role/company breakdowns, five-record minimum warning, follow-up completion, and date/company/role/location/source filtering.

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node --import ./scripts/alias-register.mjs scripts/verify-analytics-core.mjs`

Expected: FAIL because `lib/analytics/core.js` does not exist.

- [ ] **Step 3: Implement the minimum pure engine**

In `lib/analytics/core.js`, define exact status sets and return shapes:

```js
const RESPONSE_STAGES = new Set(["Assessment", "Recruiter Screen", "Interviewing", "Offer", "Rejected"]);
const SCREEN_STAGES = new Set(["Recruiter Screen", "Interviewing", "Offer"]);
const INTERVIEW_STAGES = new Set(["Interviewing", "Offer"]);

export function rate(numerator, denominator) {
  return {
    numerator,
    denominator,
    value: denominator ? Math.round((numerator / denominator) * 100) : null,
  };
}

export function applicationFacts(application) {
  // Combine submittedAt, current status, and status_changed activity.
  // Return submitted, responded, screened, interviewed, offered, rejected,
  // submittedAt, firstResponseAt, responseHours, and stagesReached.
}

export function buildApplicationAnalytics({ applications = [], reminders = [], now = new Date() }) {
  return {
    summary: {},
    applicationsOverTime: [],
    pipeline: [],
    statusDistribution: [],
    breakdowns: { roles: [], companies: [], sources: [] },
    matchScorePatterns: [],
    resumePerformance: { variants: [], profiles: [], versions: [], modes: [] },
    dataQuality: {},
  };
}
```

Keep sorting deterministic: counts descending, then labels ascending. Group calendar weeks by Monday using UTC dates.

- [ ] **Step 4: Run the verifier and confirm GREEN**

Run: `node --import ./scripts/alias-register.mjs scripts/verify-analytics-core.mjs`

Expected: all core assertions pass with zero failures.

- [ ] **Step 5: Add the command and commit**

Add `"analytics:verify-core": "node --import ./scripts/alias-register.mjs scripts/verify-analytics-core.mjs"` to `package.json`.

Run: `npm run analytics:verify-core`

Commit:

```bash
git add lib/analytics/core.js scripts/verify-analytics-core.mjs package.json
git commit -m "Add transparent application analytics engine"
```

---

### Task 2: Keyword trends and evidence classification

**Files:**

- Create: `scripts/verify-analytics-keywords.mjs`
- Create: `lib/analytics/keywords.js`
- Modify: `package.json`

**Interfaces:**

- Consumes jobs shaped as `{ id, applicationId, company, role, jobDescription }`, approved Master Resume entries, and achievements.
- Produces `analyzeKeywordTrends({ jobs, applicationJobs, masterEntries, achievements })` returning `{ trends, gaps, analyzedJobDescriptions, duplicateDescriptions }`.
- Produces stable gap IDs through `skillGapId(term)`.

- [ ] **Step 1: Write the failing keyword verifier**

Use two unique descriptions and one normalized duplicate. Assert:

```js
const result = analyzeKeywordTrends({
  jobs: [
    { id: "j1", company: "A", role: "Product Designer", jobDescription: "Figma, design systems, user research, stakeholder collaboration, B2B SaaS." },
    { id: "j2", company: "B", role: "UX Designer", jobDescription: "Figma, prototyping, user research, product analytics, leadership." },
  ],
  applicationJobs: [
    { id: "a1", company: "A", role: "Product Designer", jobDescription: "  FIGMA design systems user research stakeholder collaboration B2B SaaS " },
  ],
  masterEntries: [
    { status: "Approved", skills: ["Figma"], bullets: ["Conducted user research and built prototypes."], tags: [] },
    { status: "Needs Review", skills: ["Leadership"], bullets: [], tags: [] },
  ],
  achievements: [{ evidence: "Research plan and interview notes", skills: ["User research"], resumeBullet: "Conducted user research." }],
});
```

Check that duplicate descriptions count once, Figma and user research have Strong evidence, Leadership is not Strong because it exists only in Needs Review evidence, product analytics becomes a stable gap, percentages use two analyzed descriptions, and every category is one of `Skills`, `Tools`, `Responsibilities`, `Seniority`, `Soft Skills`, or `Domain Knowledge`.

- [ ] **Step 2: Run and confirm RED**

Run: `node --import ./scripts/alias-register.mjs scripts/verify-analytics-keywords.mjs`

Expected: FAIL because the keyword module is missing.

- [ ] **Step 3: Implement deterministic local analysis**

Create a curated phrase taxonomy inside `lib/analytics/keywords.js`. Normalize Unicode, punctuation, whitespace, and case. Hash normalized description text with Node `crypto.createHash("sha256")` for deduplication. Match longer phrases before shorter phrases.

Export:

```js
export function skillGapId(term) {
  return `skill-gap-${createSlug(term)}`;
}

export function classifyEvidence(term, verifiedCorpus) {
  return { level: "Strong" | "Partial" | "Weak" | "None", explanation: "..." };
}

export function analyzeKeywordTrends(input) {
  return { trends, gaps, analyzedJobDescriptions, duplicateDescriptions };
}
```

Only `Approved` Master Resume entries and achievements with non-empty `evidence` join the verified corpus. Include lightweight related references `{ id, company, role }`; never return description text.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node --import ./scripts/alias-register.mjs scripts/verify-analytics-keywords.mjs`

Expected: all keyword and evidence assertions pass.

- [ ] **Step 5: Register and commit**

Add `"analytics:verify-keywords": "node --import ./scripts/alias-register.mjs scripts/verify-analytics-keywords.mjs"`.

Commit:

```bash
git add lib/analytics/keywords.js scripts/verify-analytics-keywords.mjs package.json
git commit -m "Add local keyword and evidence analytics"
```

---

### Task 3: Persisted Skill-Gap Roadmap in both storage modes

**Files:**

- Create: `lib/skillGapsShared.js`
- Create: `lib/skillGaps.js`
- Create: `lib/store/skillGaps.fs.js`
- Create: `lib/store/skillGaps.db.js`
- Modify: `.gitignore`
- Modify: `lib/db/schema.js`
- Create: next generated `drizzle/*.sql` migration and metadata files
- Create: `scripts/verify-skill-gaps.mjs`
- Modify: `scripts/verify-schema.mjs`
- Modify: `package.json`

**Interfaces:**

- `syncSkillGaps(derivedGaps)` creates or refreshes derived fields while preserving user fields.
- `listSkillGaps()` returns `{ skillGaps, corrupted }`.
- `updateSkillGap(id, patch)` returns the updated record, `null` when missing, and throws an error with `status: 400` for invalid input.
- `validateSkillGapPatch(existing, patch)` accepts only `importance`, `learningStatus`, `notes`, and `portfolioOpportunity`.

- [ ] **Step 1: Write the failing dual-driver verifier**

The script must use a temporary working directory for filesystem mode and PGlite for database mode. Run the same contract against each driver:

```js
await store.syncSkillGaps([{
  id: "skill-gap-product-analytics",
  skill: "Product analytics",
  skillSlug: "product-analytics",
  category: "Tools",
  frequency: 3,
  percentage: 60,
  evidenceLevel: "None",
  evidenceExplanation: "No verified evidence found.",
  relatedJobs: [{ id: "j1", company: "A", role: "Designer" }],
}]);

const edited = await store.updateSkillGap("skill-gap-product-analytics", {
  importance: "High",
  learningStatus: "Learning",
  notes: "Complete a real analytics exercise.",
});
check("user edit persisted", edited.importanceSource === "user" && edited.learningStatus === "Learning");
```

Then sync frequency `4` and assert the edit remains. Assert invalid IDs, unknown fields, invalid enums, notes over 4000 characters, and `Verified in Resume` with non-Strong evidence are rejected. In database mode switch `RESUME_TAILOR_USER_ID` and assert the second user sees no rows.

- [ ] **Step 2: Run and confirm RED**

Run: `node --import ./scripts/alias-register.mjs scripts/verify-skill-gaps.mjs`

Expected: FAIL because the stores and schema do not exist.

- [ ] **Step 3: Add shared validation and filesystem store**

Define exact enums in `lib/skillGapsShared.js`:

```js
export const EVIDENCE_LEVELS = ["Strong", "Partial", "Weak", "None"];
export const GAP_CATEGORIES = ["Skills", "Tools", "Responsibilities", "Seniority", "Soft Skills", "Domain Knowledge"];
export const LEARNING_STATUSES = ["Not Started", "Learning", "Practising", "Used in Project", "Added to Portfolio", "Verified in Resume"];
export const IMPORTANCE_LEVELS = ["High", "Medium", "Low"];
export const SAFE_GAP_ID = /^skill-gap-[a-z0-9]+(?:-[a-z0-9]+)*$/;
```

Filesystem storage uses `path.join(process.cwd(), "data", "skill-gaps", "skill-gaps.json")`, atomic write-to-temp then rename, safe JSON parsing, and deterministic ordering by importance, frequency, and skill. Add `/data/` to `.gitignore` before the first filesystem write so personal roadmap records can never be staged.

- [ ] **Step 4: Add the database table, migration, and DB store**

Add a `skill_gaps` table with `id`, `user_id`, all required roadmap fields, JSONB `related_jobs`, and timestamps. Use a composite primary key on `[userId, id]` so the same deterministic gap ID is valid for multiple users. Add indexes on user/evidence and user/status.

Run: `npm run db:generate`

Inspect the generated SQL and confirm it only creates `skill_gaps` and its indexes. Update `scripts/verify-schema.mjs` to expect 15 tables and test one skill-gap round trip.

- [ ] **Step 5: Implement the dispatcher and make the contract GREEN**

Create `lib/skillGaps.js` using the existing `STORAGE_DRIVER`/`DATABASE_URL` dispatch pattern.

Run:

```bash
node --import ./scripts/alias-register.mjs scripts/verify-skill-gaps.mjs
npm run db:verify
```

Expected: both drivers pass, user scoping passes, and the schema verifier reports 15 tables.

- [ ] **Step 6: Register and commit**

Add `"analytics:verify-gaps": "node --import ./scripts/alias-register.mjs scripts/verify-skill-gaps.mjs"`.

Commit:

```bash
git add .gitignore lib/skillGapsShared.js lib/skillGaps.js lib/store/skillGaps.fs.js lib/store/skillGaps.db.js lib/db/schema.js drizzle scripts/verify-schema.mjs scripts/verify-skill-gaps.mjs package.json
git commit -m "Add persisted skill-gap roadmap storage"
```

---

### Task 4: Analytics orchestration, filtering, and APIs

**Files:**

- Create: `lib/analytics/filters.js`
- Create: `lib/analytics.js`
- Create: `app/api/analytics/route.js`
- Create: `app/api/skill-gaps/[id]/route.js`
- Create: `scripts/verify-analytics-api.mjs`
- Modify: `package.json`

**Interfaces:**

- `parseAnalyticsFilters(searchParams)` returns `{ filters, errors }`.
- `getAnalytics(filters)` returns the approved aggregate response.
- `GET(request)` returns `200` aggregate JSON or `400` invalid-filter JSON.
- `PATCH(request, { params })` returns `200 { ok: true, skillGap }`, `400`, `404`, or `500`.

- [ ] **Step 1: Write failing filter and response-contract tests**

The verifier asserts:

```js
const invalid = parseAnalyticsFilters(new URLSearchParams("from=2026-08-10&to=2026-08-01"));
check("reversed range rejected", invalid.errors.includes("The start date must be on or before the end date."));

const valid = parseAnalyticsFilters(new URLSearchParams("from=2026-08-01&company=google"));
check("filters normalized", valid.filters.company === "google" && valid.filters.from === "2026-08-01");
```

Use dependency injection in `getAnalytics(filters, dependencies)` so the verifier can supply real fixture-returning functions without mocking modules. Assert the response includes definitions, filter options, pipeline, performance, trends, synchronized gaps, and data-quality warnings but does not contain a known full resume sentence or full job-description sentence.

For route validation, call exported route handlers with `Request` objects and dependency-free invalid inputs. Confirm `400` for malformed dates and invalid roadmap patches.

- [ ] **Step 2: Run and confirm RED**

Run: `node --import ./scripts/alias-register.mjs scripts/verify-analytics-api.mjs`

Expected: FAIL because orchestration and routes are missing.

- [ ] **Step 3: Implement filter parsing**

Allow only `from`, `to`, `company`, `role`, `location`, and `source`. Validate dates with `/^\d{4}-\d{2}-\d{2}$/` plus real UTC date round-trip validation. Cap every text filter at 120 characters and normalize slugs without accepting path separators.

- [ ] **Step 4: Implement server orchestration**

Load:

- `listApplications()` and each valid `getApplication(id, { full: true })` plus `getActivity(id)`;
- `listJobs()`;
- `getMaster()`;
- `listAchievements()`;
- `listReminders()`;
- `listSkillGaps()` and `syncSkillGaps()`.

Catch malformed individual application documents, increment `corruptedRecords`, and continue. Deduplicate linked job descriptions before keyword analysis. Merge core and keyword data with an immutable `definitions` object.

- [ ] **Step 5: Implement route handlers and confirm GREEN**

`app/api/analytics/route.js` must export `dynamic = "force-dynamic"` and set `Cache-Control: no-store`.

`app/api/skill-gaps/[id]/route.js` must await Next.js 16.3 `params`, decode only the ID segment, and forward known validation statuses.

Run: `node --import ./scripts/alias-register.mjs scripts/verify-analytics-api.mjs`

Expected: all filter, privacy, response-shape, and patch-validation assertions pass.

- [ ] **Step 6: Register and commit**

Add `"analytics:verify-api": "node --import ./scripts/alias-register.mjs scripts/verify-analytics-api.mjs"`.

Commit:

```bash
git add lib/analytics.js lib/analytics/filters.js app/api/analytics/route.js app/api/skill-gaps/[id]/route.js scripts/verify-analytics-api.mjs package.json
git commit -m "Add private analytics APIs"
```

---

### Task 5: Analytics client state, filters, summary, and accessible charts

**Files:**

- Create: `lib/analytics/client.js`
- Create: `components/analytics/AnalyticsHeader.js`
- Create: `components/analytics/AnalyticsFilters.js`
- Create: `components/analytics/MetricCard.js`
- Create: `components/analytics/AnalyticsSummary.js`
- Create: `components/analytics/ApplicationsTrendChart.js`
- Create: `components/analytics/PipelineConversionChart.js`
- Create: `components/analytics/DistributionChart.js`
- Create: `components/analytics/AnalyticsLoadingState.js`
- Create: `components/analytics/AnalyticsEmptyState.js`
- Create: `scripts/verify-analytics-client.mjs`
- Modify: `package.json`

**Interfaces:**

- `buildAnalyticsQuery(filters)` returns a stable URL query string containing only non-empty approved filters.
- `formatRate(metric)` returns `—` for null and `${value}%` otherwise.
- Components consume only the aggregate API response; chart components accept arrays of `{ label, count, percentage }` or `{ period, count }`.

- [ ] **Step 1: Write the failing client-helper verifier**

Assert stable parameter order, omission of empty values, URL encoding, `—` for null rates, and percentage formatting. Also read each planned chart component path and fail until the file exists with an `aria-label` and a visible data-list/table fallback marker.

- [ ] **Step 2: Run and confirm RED**

Run: `node --import ./scripts/alias-register.mjs scripts/verify-analytics-client.mjs`

Expected: FAIL because helpers and components are missing.

- [ ] **Step 3: Implement client helpers and focused presentational components**

Use native `<svg role="img" aria-label="...">` only for the trend line; use semantic progress bars/lists for pipeline and distribution. Every chart renders a visually readable value list below or beside the visual. Metric cards show numerator/denominator context such as `4 of 12 submitted applications`.

The filter toolbar includes labeled native inputs/selects, a mobile `<details>` wrapper, Apply and Clear buttons, and no hover-only actions.

- [ ] **Step 4: Run and confirm GREEN**

Run:

```bash
node --import ./scripts/alias-register.mjs scripts/verify-analytics-client.mjs
npm run lint -- lib/analytics/client.js components/analytics/AnalyticsHeader.js components/analytics/AnalyticsFilters.js components/analytics/MetricCard.js components/analytics/AnalyticsSummary.js components/analytics/ApplicationsTrendChart.js components/analytics/PipelineConversionChart.js components/analytics/DistributionChart.js components/analytics/AnalyticsLoadingState.js components/analytics/AnalyticsEmptyState.js
```

Expected: helper assertions pass and ESLint reports zero errors.

- [ ] **Step 5: Register and commit**

Add `"analytics:verify-client": "node scripts/verify-analytics-client.mjs"`.

Commit:

```bash
git add lib/analytics/client.js components/analytics scripts/verify-analytics-client.mjs package.json
git commit -m "Add accessible analytics foundations"
```

---

### Task 6: Performance, keyword, and Skill-Gap Roadmap panels

**Files:**

- Create: `components/analytics/MatchScorePatterns.js`
- Create: `components/analytics/ResumePerformance.js`
- Create: `components/analytics/EvidenceBadge.js`
- Create: `components/analytics/KeywordTrends.js`
- Create: `components/analytics/SkillGapRoadmap.js`
- Create: `components/analytics/SkillGapEditor.js`
- Create: `components/analytics/MetricDefinitions.js`
- Create: `components/analytics/DataQualityNotice.js`
- Modify: `scripts/verify-analytics-client.mjs`

**Interfaces:**

- `ResumePerformance` consumes `{ variants, profiles, versions, modes }` and exposes keyboard-operable native buttons for the active grouping.
- `KeywordTrends` consumes trend rows and category/evidence filters.
- `SkillGapRoadmap` consumes records and calls `onUpdate(id, patch)`.
- `SkillGapEditor` permits only the four editable fields from the API contract.

- [ ] **Step 1: Extend the verifier and confirm RED**

Add structural assertions that every component exists, evidence badges include readable labels, performance warnings contain the exact minimum-data sentence, roadmap controls have associated labels, and the editor offers exactly the approved importance and learning-status values.

Run: `npm run analytics:verify-client`

Expected: FAIL on missing panel files.

- [ ] **Step 2: Implement the panels**

Use a compact table on desktop and stacked cards on mobile. Include these exact copy safeguards:

```text
Patterns describe your current records. They do not prove that a resume design, profile, or match score caused an outcome.
```

```text
Learning progress does not count as resume evidence. Add and approve real evidence in Master Resume or Achievements first.
```

Evidence badges must display `Strong evidence`, `Partial evidence`, `Weak evidence`, or `No evidence` in addition to color. `Verified in Resume` is disabled when evidence is not Strong and includes explanatory helper text.

- [ ] **Step 3: Run and confirm GREEN**

Run:

```bash
npm run analytics:verify-client
npm run lint -- components/analytics/MatchScorePatterns.js components/analytics/ResumePerformance.js components/analytics/EvidenceBadge.js components/analytics/KeywordTrends.js components/analytics/SkillGapRoadmap.js components/analytics/SkillGapEditor.js components/analytics/MetricDefinitions.js components/analytics/DataQualityNotice.js
```

Expected: structural assertions pass and ESLint reports zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/analytics scripts/verify-analytics-client.mjs
git commit -m "Add resume and skill-gap analytics panels"
```

---

### Task 7: Complete the Analytics page and optimistic editing flow

**Files:**

- Replace: `app/analytics/page.js`
- Modify: `lib/analytics/client.js`
- Modify: `scripts/verify-analytics-client.mjs`

**Interfaces:**

- The page loads `/api/analytics` using the current filters.
- Roadmap update calls `PATCH /api/skill-gaps/{encodedId}` and rolls back local state on failure.
- Filter Apply starts a new request; Clear restores defaults and reloads.

- [ ] **Step 1: Add failing page-contract assertions**

Extend the verifier to require the page to contain:

- a client directive;
- `/api/analytics` fetch;
- AbortController cleanup;
- `/api/skill-gaps/` PATCH;
- `aria-live` error messaging;
- loading, empty, partial, and populated render branches;
- every approved panel component.

Run: `npm run analytics:verify-client`

Expected: FAIL because the current page is a PlannedPage.

- [ ] **Step 2: Implement the page state machine**

Use states `loading`, `refreshing`, `data`, `error`, and `updateError`. Abort stale fetches. Preserve the last valid dataset during filter refresh. For gap updates:

1. copy the existing gap;
2. apply the patch optimistically;
3. send PATCH;
4. replace with the server result on success;
5. restore the copy and announce the error on failure.

Render keyword analytics when jobs exist even if no applications are submitted. Render pipeline analytics when applications exist even if no descriptions are available.

- [ ] **Step 3: Run and confirm GREEN**

Run:

```bash
npm run analytics:verify-client
npm run lint -- app/analytics/page.js lib/analytics/client.js components/analytics
npm run build
```

Expected: page-contract assertions pass, lint has zero errors, and Next.js builds `/analytics`, `/api/analytics`, and `/api/skill-gaps/[id]`.

- [ ] **Step 4: Commit**

```bash
git add app/analytics/page.js lib/analytics/client.js scripts/verify-analytics-client.mjs
git commit -m "Launch the job-search analytics workspace"
```

---

### Task 8: Integrate verification, documentation, and browser acceptance

**Files:**

- Modify: `package.json`
- Modify: `README.md`
- Modify: `SETUP.md`
- Modify: `.github/workflows/verify.yml` only if the workflow description needs to mention analytics explicitly

**Interfaces:**

- `npm run analytics:verify` runs core, keyword, gap, API, and client verifiers.
- `npm run verify:ci` runs analytics verification before the production build.

- [ ] **Step 1: Add the combined verification command**

Set:

```json
"analytics:verify": "npm run analytics:verify-core && npm run analytics:verify-keywords && npm run analytics:verify-gaps && npm run analytics:verify-api && npm run analytics:verify-client"
```

Insert `npm run analytics:verify` into `verify:ci` before `npm run build`.

- [ ] **Step 2: Document definitions and privacy behavior**

Update README with the live Analytics feature, its non-causation policy, and Skill-Gap Roadmap evidence rule. Update SETUP to state that the new migration must be applied with `npm run db:push` before deploying this phase.

- [ ] **Step 3: Run the full automated gate**

Run:

```bash
npm run analytics:verify
npm run verify:ci
npm run lint -- app/analytics/page.js app/api/analytics/route.js app/api/skill-gaps/[id]/route.js components/analytics lib/analytics lib/analytics.js lib/skillGaps.js lib/skillGapsShared.js lib/store/skillGaps.fs.js lib/store/skillGaps.db.js scripts/verify-analytics-core.mjs scripts/verify-analytics-keywords.mjs scripts/verify-skill-gaps.mjs scripts/verify-analytics-api.mjs scripts/verify-analytics-client.mjs
npm audit --omit=dev
git diff --check
```

Expected: all commands exit `0`, production audit reports zero vulnerabilities, and the build lists both analytics API routes.

- [ ] **Step 4: Run browser acceptance**

Start filesystem mode with `npm run dev`. Verify `/analytics` at desktop and mobile widths with the existing local records:

- filters update every panel;
- metric definitions and denominators are visible;
- charts have readable text alternatives;
- low-data warnings appear;
- keyword evidence labels are textual;
- roadmap edits persist after reload;
- invalid `Verified in Resume` is blocked;
- keyboard focus is visible and logical;
- no horizontal page overflow occurs on mobile.

Then verify an empty fixture workspace and a jobs-only fixture workspace by launching with isolated temporary working directories. Stop every temporary server after verification.

- [ ] **Step 5: Review staged scope and commit**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Commit:

```bash
git add package.json package-lock.json README.md SETUP.md .github/workflows/verify.yml
git commit -m "Complete job-search analytics verification"
```

If `.github/workflows/verify.yml` or `package-lock.json` did not change, omit it from `git add` rather than creating an unrelated diff.

---

## Completion gate

Before presenting integration options:

1. Read and follow `superpowers:verification-before-completion`.
2. Run `npm run verify:ci` from the final tree.
3. Run the changed-file lint command from Task 8.
4. Run `npm audit --omit=dev`.
5. Re-run the populated and mobile browser smoke paths after the final code change.
6. Inspect `git status --short`, `git diff --check`, and the final commit list.
7. Use `superpowers:finishing-a-development-branch` and follow the user's established GitHub integration choice.
