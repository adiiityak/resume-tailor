# Job-Search Analytics Design

Date: 2026-08-04
Status: Approved for implementation

## Outcome

Replace the planned `/analytics` screen with a complete, local-first analytics workspace that helps the user understand job-search activity, pipeline progression, resume-version patterns, recurring job requirements, and evidence-backed skill gaps.

The feature must remain descriptive rather than causal. It may report patterns in the user's records, but it must never claim that a resume design, match score, profile, or keyword caused an interview or offer.

## Scope

This phase includes:

- transparent job-search summary metrics;
- applications-over-time and pipeline-conversion visualizations;
- status, source, role, and company breakdowns;
- match-score versus response patterns;
- resume variant, base-profile, and submitted-version performance;
- keyword trends across saved job descriptions;
- comparison of requested keywords with verified resume evidence;
- a persisted, editable Skill-Gap Roadmap;
- date, role, company, location, and source filters;
- empty, partial-data, loading, corruption, and error states;
- filesystem and Supabase/Postgres support with user isolation.

This phase does not include sensitive-data masking, backup and restore, external research, automatic learning recommendations from the internet, or local vault encryption. Those remain separate Settings and Privacy phases.

## Product principles

1. Never fabricate experience, evidence, outcomes, dates, skills, or qualifications.
2. Clearly distinguish job-market demand from verified user evidence.
3. Show every denominator and metric definition.
4. Treat correlations as descriptive patterns, not causes.
5. Show sample-size warnings before drawing attention to performance differences.
6. Keep all analysis local unless a separate user-triggered API mode is introduced later.
7. Never add a roadmap skill to the resume merely because its learning status changed.

## Architecture

### Shared analytics engine

Create a server-side analytics engine with pure calculation functions and a thin storage orchestration layer.

- `lib/analytics/core.js` contains deterministic calculations that accept normalized records and return aggregate results.
- `lib/analytics/keywords.js` handles local keyword normalization, taxonomy classification, frequency counting, and evidence comparison.
- `lib/analytics.js` loads data through the active filesystem or database stores, normalizes it, applies filters, synchronizes derived skill-gap information, and returns the API response.
- `app/api/analytics/route.js` validates query parameters and returns aggregate data only.
- `app/api/skill-gaps/[id]/route.js` updates editable roadmap fields.

The browser must not receive complete resumes or complete job descriptions from the analytics endpoint. It receives only aggregates, labels, counts, scores, definitions, warnings, and lightweight related-record references.

### Storage parity

The analytics calculations are shared. Only skill-gap persistence differs by storage driver.

Filesystem mode stores roadmap records in:

```text
data/
└── skill-gaps/
    └── skill-gaps.json
```

Database mode adds a `skill_gaps` table scoped by `user_id`.

Required fields:

```json
{
  "id": "skill-gap-product-analytics",
  "skill": "Product analytics",
  "skillSlug": "product-analytics",
  "category": "Skills",
  "frequency": 6,
  "evidenceLevel": "Partial",
  "importance": "High",
  "importanceSource": "derived",
  "learningStatus": "Not Started",
  "notes": "",
  "relatedJobIds": ["job-1", "application-2"],
  "portfolioOpportunity": "",
  "createdAt": "2026-08-04T10:00:00.000Z",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

Allowed evidence levels:

- Strong
- Partial
- Weak
- None

Allowed category values:

- Skills
- Tools
- Responsibilities
- Seniority
- Soft Skills
- Domain Knowledge

Allowed learning statuses:

- Not Started
- Learning
- Practising
- Used in Project
- Added to Portfolio
- Verified in Resume

Allowed importance values:

- High
- Medium
- Low

Allowed importance sources:

- derived
- user

Derived fields such as frequency, category, evidence level, and related jobs are refreshed from current analytics. Importance is recalculated only when `importanceSource` is `derived`. Editing importance sets `importanceSource` to `user`. Learning status, user importance, notes, and portfolio opportunity are preserved during synchronization.

`Verified in Resume` is not accepted unless the current evidence level is `Strong`. The API returns a clear validation error instead of silently changing evidence.

## Metric definitions

The API returns a `definitions` map alongside metric values. The UI exposes definitions through visible help text or accessible disclosure controls.

### Submitted application

An application counts as submitted when at least one of the following is true:

- `submittedAt` exists;
- activity contains a transition to `Applied`;
- activity contains a later response stage;
- the current status is `Applied`, `Assessment`, `Recruiter Screen`, `Interviewing`, `Offer`, or `Rejected` and no more reliable history is available.

`Saved`, `Tailoring`, and `Ready to Apply` do not count as submitted. `Withdrawn` and `Archived` count only when submission is supported by `submittedAt` or activity history.

### Response

A submitted application counts as having a response when activity or current status shows one of:

- Assessment
- Recruiter Screen
- Interviewing
- Offer
- Rejected

This is a recorded-response measure. It cannot determine whether a rejection was automated or personalized.

### Rates

- Response rate = submitted applications with a recorded response ÷ submitted applications.
- Recruiter-screen rate = submitted applications that reached Recruiter Screen, Interviewing, or Offer ÷ submitted applications.
- Interview rate = submitted applications that reached Interviewing or Offer ÷ submitted applications.
- Offer rate = submitted applications that reached Offer ÷ submitted applications.
- Rejection rate = submitted applications that reached Rejected ÷ submitted applications.
- Follow-up completion rate = completed follow-up reminders ÷ follow-up reminders that are due or completed.

All rates return both numerator and denominator. When the denominator is zero, the displayed value is unavailable rather than `0%`.

### Response time

Average response time is measured from `submittedAt` or the earliest transition to `Applied` to the earliest recorded response-stage event. Records without both timestamps are excluded. The response includes the number excluded.

### Time and grouping

- Applications over time uses calendar weeks by default and respects the selected date range.
- Status distribution uses current status.
- Pipeline conversion uses historical maximum stage reached.
- Missing source values group under `Unspecified`.
- Role and company labels are preserved for display while normalized slugs are used for grouping.

### Performance patterns

Resume performance groups submitted applications by:

- resume design variant;
- base profile when present;
- submitted resume version when present;
- tailoring mode.

Each group shows submitted count, response count/rate, interview count/rate, and offer count/rate. Groups with fewer than five submitted applications show `Not enough applications to identify a reliable pattern.`

Match-score comparison uses fixed score bands: below 60, 60–69, 70–79, 80–89, and 90–100. Applications without a score are excluded and counted in a disclosure. The UI states that any observed relationship is an association in the current records, not proof of causation.

## Keyword trends and evidence

### Sources

Keyword trends use job descriptions from:

- Job Library records;
- application job descriptions not already represented by a linked Job Library record.

Normalized duplicate descriptions count once so saving and tailoring the same job does not inflate demand.

### Classification

A deterministic local taxonomy and phrase extractor classifies terms into:

- skills;
- tools;
- responsibilities;
- seniority signals;
- soft skills;
- domain knowledge.

Each result includes occurrence count, percentage of analyzed jobs, category, and lightweight related-job references. The engine favors meaningful multi-word phrases and removes stop words and generic job-posting language.

### Evidence comparison

Evidence is read only from:

- Master Resume entries marked `Approved`;
- achievements with a non-empty `evidence` field. A resume-ready bullet without supporting evidence does not count as verified evidence.

Evidence levels are assigned as follows:

- Strong: the requested phrase is explicitly present in verified evidence.
- Partial: closely related verified terms exist, but the full requirement is not proven.
- Weak: limited contextual overlap exists and must not be presented as confirmation.
- None: no verified supporting evidence was found.

Every result can expose a short evidence explanation. It must not turn partial or weak evidence into a resume claim.

## Skill-Gap Roadmap behavior

The roadmap is derived from recurring keywords with Partial, Weak, or None evidence. Single-occurrence gaps may still appear for small datasets, labeled as emerging rather than recurring.

Default importance is based on frequency and percentage across analyzed jobs. The user may override importance. Editing a roadmap item updates only:

- importance;
- learning status;
- notes;
- portfolio opportunity.

The roadmap supports filtering by evidence level, learning status, importance, category, and free-text search.

Changing a status to `Learning`, `Practising`, `Used in Project`, or `Added to Portfolio` does not change evidence level. New resume evidence must be added through the Master Resume or Achievement Bank and approved there.

## API response

`GET /api/analytics` accepts optional query parameters:

```text
from=YYYY-MM-DD
to=YYYY-MM-DD
company=<companySlug>
role=<roleSlug or normalized role>
location=<normalized location>
source=<normalized source>
```

The response contains:

```json
{
  "filters": {},
  "filterOptions": {},
  "summary": {},
  "definitions": {},
  "applicationsOverTime": [],
  "pipeline": [],
  "statusDistribution": [],
  "breakdowns": {
    "roles": [],
    "companies": [],
    "sources": []
  },
  "matchScorePatterns": [],
  "resumePerformance": {
    "variants": [],
    "profiles": [],
    "versions": [],
    "modes": []
  },
  "keywordTrends": [],
  "skillGaps": [],
  "dataQuality": {
    "corruptedRecords": 0,
    "missingDates": 0,
    "missingScores": 0,
    "analyzedJobDescriptions": 0,
    "warnings": []
  }
}
```

`PATCH /api/skill-gaps/[id]` accepts only editable roadmap fields. Unknown fields, invalid IDs, invalid enum values, oversized notes, and path-traversal attempts return `400`. Missing records return `404`.

## User interface

### Page structure

The `/analytics` route becomes a client page with these sections:

1. Header and privacy statement.
2. Filter toolbar.
3. Summary metric cards.
4. Applications-over-time and pipeline-conversion charts.
5. Status, source, role, and company breakdowns.
6. Match-score versus response panel.
7. Resume performance tabs.
8. Keyword trend explorer.
9. Editable Skill-Gap Roadmap.
10. Metric definitions and data-quality disclosures.

Suggested components:

```text
components/analytics/
├── AnalyticsHeader.js
├── AnalyticsFilters.js
├── AnalyticsSummary.js
├── MetricCard.js
├── ApplicationsTrendChart.js
├── PipelineConversionChart.js
├── DistributionChart.js
├── MatchScorePatterns.js
├── ResumePerformance.js
├── KeywordTrends.js
├── EvidenceBadge.js
├── SkillGapRoadmap.js
├── SkillGapEditor.js
├── MetricDefinitions.js
├── DataQualityNotice.js
├── AnalyticsEmptyState.js
└── AnalyticsLoadingState.js
```

### Visual treatment

- Follow the existing slate, white, blue, amber, violet, green, and red dashboard language.
- Use white cards, subtle slate borders, restrained shadows, compact labels, and comfortable spacing.
- Use status color only with text and icons.
- Implement charts with semantic HTML plus lightweight SVG/CSS; do not add a chart dependency in this phase.
- Every chart includes a text summary or accessible data table.
- Do not use decorative gradients, oversized headings, or gamified success language.

### Responsive behavior

- Desktop: two-column chart areas and full performance tables.
- Tablet: wrapped filters and single- or two-column panels depending on width.
- Mobile: stacked cards, horizontally scrollable compact data regions when necessary, and filters in a collapsible panel.
- No action depends on hover.

### Empty and partial states

- No records: explain that saved jobs and submitted applications will populate analytics, with links to Jobs and Resume Tailor.
- Jobs but no applications: show keyword trends and gaps while explaining that pipeline metrics need submitted applications.
- Applications but no job descriptions: show pipeline analytics and a keyword-analysis empty state.
- Small samples: show the data while displaying the minimum-data warning.
- Corrupt records: show the valid analytics plus a non-blocking count of skipped records.

## Error handling

The analytics route must not fail because one record is malformed. Store readers return valid records plus corruption counts where possible.

User-facing errors include:

- Unable to load analytics.
- Some records could not be analyzed.
- Invalid date range.
- Unable to update skill gap.
- Skill gap no longer exists.
- Verified in Resume requires approved evidence.

The UI preserves existing analytics when a roadmap update fails and restores the edited row to its previous value.

## Testing strategy

Implementation follows red-green-refactor.

### Pure calculation tests

Fixture-driven tests cover:

- submitted-application detection;
- historical maximum stage;
- every rate numerator and denominator;
- zero-denominator behavior;
- response-time calculation and exclusions;
- weekly grouping and date filters;
- source, role, company, and status grouping;
- score bands and missing-score counts;
- minimum-sample warnings;
- duplicate job-description removal;
- keyword categorization and frequency;
- Strong, Partial, Weak, and None evidence classification;
- deterministic skill-gap IDs and synchronization.

### Store contract tests

The filesystem and database stores share behavior tests for:

- creating/synchronizing gaps;
- preserving user-managed fields;
- updating allowed fields;
- rejecting invalid enums and unsupported verification;
- user isolation in database mode;
- rejecting unsafe IDs in filesystem mode.

### API and UI verification

- API query validation and error status tests.
- Analytics endpoint returns aggregates without full resume or job-description content.
- Changed JavaScript passes ESLint.
- The full schema, store, import, authentication, and deployment suites remain green.
- Next.js production build passes.
- Browser verification covers populated, empty, partial, update-error, desktop, and mobile states.
- Keyboard focus, labels, chart alternatives, and contrast receive an accessibility check.

## Migration and compatibility

Add a forward-only Drizzle migration for `skill_gaps`. Existing application, job, history, and Master Resume data are untouched.

Filesystem mode creates `data/skill-gaps/skill-gaps.json` only when roadmap records are first synchronized or edited. Existing `history/` compatibility remains unchanged.

## Acceptance criteria

The phase is complete when:

1. `/analytics` displays real metrics from the active storage driver.
2. Every rate has a visible, accurate definition and denominator.
3. Historical statuses preserve prior funnel progression.
4. Filters update every panel consistently.
5. Keyword trends analyze de-duplicated job descriptions locally.
6. Evidence labels rely only on approved or verified records.
7. Skill-gap edits persist in both filesystem and database modes.
8. Learning status never silently changes resume evidence.
9. Small samples and missing data are disclosed.
10. One corrupt record cannot crash the page.
11. The page is responsive and keyboard accessible.
12. Automated verification and the production build pass.
