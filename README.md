# Resume Tailor

Paste or upload (PDF) your resume and a target job description. Get a tailored resume, a keyword
match report, and a cover letter — grounded only in your real, existing experience, nothing
fabricated. Works in two modes:

- **Local** — no API key, instant, runs entirely in this app. Extracts likely keywords from the
  job description (skill dictionary + frequency analysis) and reorders your resume's own bullets
  to surface the most relevant ones first. The cover letter is assembled from a template using
  your resume's real bullet points, not rewritten prose.
- **Claude API** — calls the Anthropic API to rewrite phrasing and write a genuinely composed
  cover letter, still grounded in your real resume (see system prompts in the API routes for the
  exact constraints).

## Setup

1. Copy the env example and add your Anthropic API key (only needed for Claude API mode):

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and set `ANTHROPIC_API_KEY=sk-ant-...` (get one at
   https://console.anthropic.com/settings/keys).

2. Install dependencies (already done if you just scaffolded this project):

   ```bash
   npm install
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## How it works

- `app/page.js` — UI: paste/upload resume + job description, choose mode, view tailored resume,
  match score, matched/missing keywords, cover letter, and export buttons.
- `app/api/tailor/route.js` / `app/api/cover-letter/route.js` — Claude API mode routes, using a
  forced tool call so the response comes back as structured JSON. The API key stays server-side.
- `lib/anthropic.js` — shared helper for calling Claude with a forced tool.
- `lib/localTailor.js` / `lib/localCoverLetter.js` — Local mode: keyword extraction, bullet
  reordering, and template-based cover letter generation, all pure JS, no network call.
- `app/api/parse-pdf/route.js` — extracts text from an uploaded PDF resume server-side using
  `pdf-parse`. Note: PDF text extraction loses the original blank-line spacing between sections,
  so local-mode bullet reordering may treat adjacent job entries as one block after a PDF upload —
  paste-based input preserves structure better if this matters to you.
- `lib/resumeParser.js` — parses the plain-text resume into structure (name, contact, sections,
  entries with dates, bullets) so exports can be properly formatted.
- `lib/docxExport.js` — converts tailored resume / cover letter text into a downloadable `.docx`
  in one of four designs: V1 Classic serif (centered name, ruled section headers, right-aligned
  dates), V2 Modern blue, V3 Minimal compact, V4 Executive navy. Pick the variant in the dropdown
  next to the download buttons.
- "Save as PDF" uses the browser's native print dialog against a print-only view of whichever
  document you clicked, styled to match the selected design variant — choose "Save as PDF" in the
  print dialog.
## Application Dashboard

Every tailoring is auto-saved on disk under a structured, per-application folder tree and surfaced
in a dedicated dashboard (nav header: **Resume Tailor | Application Dashboard**).

Folder structure — `history/<company-slug>/<YYYY-MM-DD>/<role-slug>-<HHMMSS>/`:

```
history/google/2026-07-17/product-designer-190521/
├── resume.docx          # auto-generated from the tailored text
├── cover-letter.docx    # added when a cover letter is generated
├── cover-letter.txt
├── job-description.txt
├── match-report.json
├── original-resume.txt
├── tailored-resume.json
└── metadata.json        # id, company, role, dates, status, mode, variant, score, files map
```

- Multiple applications for the same company on the same day never overwrite each other — the
  `-HHMMSS` suffix keeps each folder unique.
- Tailoring a resume creates the folder + `metadata.json`; generating a cover letter later updates
  the **same** folder and bumps `updatedAt` (no second folder).
- Company/role are auto-detected from the job description and editable before tailoring.
  Undetectable company → `history/uncategorized/`.

Dashboard routes:
- `/dashboard` — summary stats, search/status/company/date filters, sort, Company-view (folder
  cards + recent applications) and Application-view (flat sortable table).
- `/dashboard/company/[companySlug]` — one company, applications grouped by date.
- `/dashboard/application/[applicationId]` — tabs: Overview, Resume, Cover Letter, Job
  Description, Match Report, Files. Change status, load back into the editor, download files,
  duplicate, or delete.

API: `app/api/applications` (GET list / POST create), `app/api/applications/[id]`
(GET / PATCH / POST duplicate / DELETE), `app/api/applications/[id]/files` (GET download /
POST save), `app/api/companies/[companySlug]` (GET). All file I/O is server-side; application IDs
and filenames are validated to prevent path traversal. The `history/` folder is git-ignored since
it holds your personal data.

Legacy `history/<Company>/*.json` records from the earlier flat format are migrated automatically
on first load (marked `"migrated": true`). Original files are preserved as an immutable recovery
copy after the structured records are created.

## Database deployment

The application can run locally from the filesystem or as an authenticated Supabase-backed
workspace on Vercel. See [SETUP.md](SETUP.md) for the production runbook. Useful checks:

```bash
npm run deployment:check
npm run verify:ci
npm run deployment:verify -- --url=https://YOUR-DOMAIN.vercel.app
```

## Notes on ATS formatting

The model (Claude API mode) is instructed to output plain text with standard ALL CAPS section
headers and simple hyphen bullets — no tables, columns, or graphics — which is what most ATS
parsers handle reliably. Neither mode will invent employers, titles, dates, or skills you didn't
provide.
