# Final backend fix report — Job-Search Analytics

Date: 2026-08-05
Scope: Final whole-branch review backend Important issues 1, 2, 6, 7, 8 and Minor issues 1, 2, 3, 7
Base after UI coordination: `a905f77`
Commit message: `Fix analytics correctness and storage parity`

The literal backend commit SHA is reported in the task handoff after the commit is created; a commit cannot embed its own final SHA without changing that SHA.

## Implemented fixes

1. Job Library `dateSaved` values now normalize valid timestamps to an inclusive UTC `YYYY-MM-DD` key. Production-shaped filesystem and imported database fixtures cover `00:00:00.000Z` and `23:59:59.999Z` boundaries.
2. Keyword analysis excludes an application's description when any Job Library row links to that application through `job.applicationId`, before normalized text-hash deduplication. A linked pair with intentionally edited text proves the application-only keyword does not appear.
3. Application storage now round-trips `submittedResumeVersion`, `submittedCoverLetterVersion`, `submittedAt`, `applicationSource`, and analytics `baseProfileId` metadata through filesystem create/update, database mapping/create/update, and filesystem-to-database import. End-to-end imported database analytics retain profile and submitted-version performance groups.
4. Database `Verified in Resume` updates include `evidence_level = 'Strong'` in the update predicate. A deterministic validation-read → concurrent evidence downgrade → conditional-write interleaving returns the exact 400 validation error and cannot restore the invalid status.
5. Both application drivers expose `loadAnalyticsApplications()`:
   - filesystem mode walks application metadata once and loads only job descriptions plus activity with eight-application concurrency;
   - database mode loads user-scoped application metadata, job descriptions, and activity in three bounded queries;
   - neither projection loads original/tailored resumes or other full documents;
   - `getAnalytics()` prefers the projection while retaining the legacy injected `list/get/activity` contract for existing dependency-injection tests.
6. Malformed filesystem skill-gap state is not rewritten by a no-op sync. A real write first preserves the exact raw file in a unique `skill-gaps.corrupt-*.json` quarantine.
7. A positive, trimmed `portfolioOpportunity` is preserved through both store drivers, a real PATCH handler path, and later derived synchronization.
8. Skill-gap route params are validated exactly as resolved by Next.js 16.3, without a second URI decode. A real Next dev-server verifier rejects single- and double-encoded traversal with 400.
9. Analytics success, validation failure, and unexpected failure responses all send `Cache-Control: no-store`.
10. The filesystem projection rejects metadata filename traversal and reads only the canonical `job-description.txt`. Turbopack tracing warnings from the new runtime data access were removed.

Aggregate-only privacy remains enforced: the analytics response tests reject raw resume/job-description fields and known full-document text in filesystem, database, and import flows.

## RED evidence

- `verify-analytics-keywords`: 1 failed / 14 passed. The linked edited pair produced two analyzed descriptions, doubled Figma/Product analytics counts, and exposed the application-only Leadership term.
- `verify-analytics-api`: 4 failed / 39 passed. ISO boundary jobs produced `totalJobsSaved: 0`; the projection was never called (`projectionCalls=0`, `legacyListCalls=1`); 400 and 500 responses lacked `no-store`.
- `verify-store`: 2 failed / 52 passed. Database create omitted submitted/profile metadata, and update stored submitted fields in JSON metadata instead of their schema columns.
- `verify-skill-gaps`: 6 failed / 50 passed. Record-level and top-level corruption were rewritten without quarantine, and the exact PATCH/evidence-downgrade race persisted `Verified in Resume` on Partial evidence.
- Initial `verify-analytics-storage`: 5 failed / 1 passed. Neither driver exposed the projection, filesystem ISO boundaries counted zero, and imported database analytics grouped submitted version/profile as `Unspecified`.
- Traversal hardening mutation: 2 failed / 8 passed. A metadata path escaped the application directory and replaced one required job-description read.
- Initial production build: two Turbopack whole-project tracing warnings, then one remaining dynamic-join warning after the first refactor.

## GREEN and performance evidence

- `npm run analytics:verify`: exit 0.
  - core: 21 passed;
  - keywords: 15 passed;
  - skill-gap filesystem/database contract: 56 passed;
  - API/orchestration/cache/privacy: 43 passed;
  - storage/import/performance: 10 passed;
  - real Next.js route-boundary verifier: passed;
  - client verifier: passed unchanged by the backend work.
- Representative filesystem volume: 120 applications; metadata reads 120, job-description reads 120, activity reads 120, full-document reads 0, maximum concurrent reads 16.
- Representative database volume: 120 returned user-owned applications in exactly 3 projection queries; other-user rows 0; full-resume documents 0.
- `npm run verify:ci`: exit 0, including 15-table schema verification, database application and secondary stores, real import/idempotency/source-preservation checks, auth, deployment config, all analytics verifiers, and production build.
- Scoped ESLint: exit 0 with no warnings.
- Final `npm run build`: exit 0 with no Turbopack warnings.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `git diff --check`: exit 0.

## Exact backend files

Production/runtime:

- `lib/analytics.js`
- `lib/analytics/keywords.js`
- `lib/analytics/routeHandlers.js`
- `lib/applications.js`
- `lib/store/applications.db.js`
- `lib/store/applications.fs.js`
- `lib/store/skillGaps.db.js`
- `lib/store/skillGaps.fs.js`
- `scripts/import-to-db.mjs`
- `package.json`

Verification:

- `scripts/verify-analytics-api.mjs`
- `scripts/verify-analytics-keywords.mjs`
- `scripts/verify-analytics-route-boundary.mjs`
- `scripts/verify-analytics-storage.mjs`
- `scripts/verify-skill-gaps.mjs`
- `scripts/verify-store.mjs`

Report:

- `.superpowers/sdd/2026-08-04-job-search-analytics/final-backend-fix-report.md`

No UI component/page files and no `scripts/verify-analytics-client.mjs` changes are included in the backend scope.
