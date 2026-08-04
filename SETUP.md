# Deployment setup (Supabase + GitHub sign-in)

These are the steps only you can do — they need your accounts. Nothing here requires
sharing secrets with anyone: every value goes straight into `.env.local` (git-ignored)
or Vercel's dashboard.

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**
2. Name it (e.g. `resume-tailor`), pick a region near you, set a database password
   (save it in your password manager)
3. Once created: **Project Settings → Database → Connection string → URI**
4. Copy the **Transaction pooler** URI on port `6543`. Serverless functions need
   transaction pooling; do not use a direct `5432` application connection.

Add it to `.env.local`:

```bash
DATABASE_URL="postgresql://postgres.xxxx:YOUR-PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

## 2. Create the GitHub OAuth app

1. <https://github.com/settings/developers> → **New OAuth App**
2. Fill in:
   - **Application name**: Resume Tailor
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Create it, then **Generate a new client secret**

Add both to `.env.local`:

```bash
AUTH_GITHUB_ID="your-client-id"
AUTH_GITHUB_SECRET="your-client-secret"
```

Generate a session secret too:

```bash
openssl rand -base64 32
```

```bash
AUTH_SECRET="the-generated-value"
```

## 3. Create the tables

With `DATABASE_URL` set in `.env.local`:

```bash
npm run db:push
```

This applies the schema in `lib/db/schema.js` to your Supabase database.

The Job-Search Analytics phase adds the `skill_gaps` table. Run `npm run db:push` against the
target database before deploying this phase (and after pulling its schema changes) so the
Skill-Gap Roadmap can load and save.

To check the schema is valid *without* a database (runs against embedded Postgres):

```bash
npm run db:verify
```

To verify the authentication boundary and Auth.js database adapter without using
live OAuth credentials or your Supabase project:

```bash
npm run db:verify-auth
```

## How storage and sign-in modes work

- Without `DATABASE_URL`, Resume Tailor uses the existing local filesystem and does
  not require sign-in. Analytics uses that same filesystem workspace, including a local,
  git-ignored Skill-Gap Roadmap; no database migration is needed in this mode.
- With `DATABASE_URL`, every page and API route requires GitHub sign-in, except the
  Auth.js callback and sign-in page.
- Database records are scoped to the authenticated Auth.js user ID. A missing or
  failed session is rejected with `401` rather than falling back to a shared user.
- Signing out returns to `/sign-in`; signing back in restores access to that
  account's workspace.

You can copy [`.env.local.example`](.env.local.example) as a starting point. Never
commit `.env.local` or OAuth/database secrets.

## 4. Deploying to Vercel

1. Open <https://vercel.com/new> and import
   `github.com/adiiityak/resume-tailor`.
2. Keep the detected framework as **Next.js** and the root directory as the
   repository root.
3. Add the following variables to the **Production** environment before the first
   deployment:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the pooled Supabase URI |
| `AUTH_SECRET` | the generated secret |
| `AUTH_GITHUB_ID` | GitHub client id |
| `AUTH_GITHUB_SECRET` | GitHub client secret |
| `AUTH_URL` | the public production origin, without a trailing path |
| `ANTHROPIC_API_KEY` | only if you want Claude API mode |

Create a **second** GitHub OAuth app for the production domain. Set its homepage to
the production origin and its callback to:

```
https://YOUR-DOMAIN.vercel.app/api/auth/callback/github
```

Set `AUTH_URL="https://YOUR-DOMAIN.vercel.app"` in Vercel, then deploy.

Before deployment, validate a local production environment without printing secret
values:

```bash
npm run deployment:check
```

After deployment, verify the public health endpoint, signed-out API protection,
private-page redirect, and sign-in page:

```bash
npm run deployment:verify -- --url=https://YOUR-DOMAIN.vercel.app
```

The repository's `.github/workflows/verify.yml` workflow runs schema, database-store,
import, authentication, production-config, analytics, and build checks on every push to `main`
and every pull request. Once Vercel's Git integration is connected, pushes to `main`
create production deployments automatically.

Do not give preview deployments access to the production database. Add Preview
environment variables only after creating a separate preview Supabase project and
OAuth callback strategy.

## 5. Importing your existing local data

Once the tables exist, bring your current `history/`, `jobs/`, `master-resume/`,
`achievements/`, `reminders/` and `contacts/` files into the database:

```bash
# After signing in once, find your GitHub user id:
npm run db:users

# Preview the import without writing anything:
npm run db:import -- --user=YOUR_USER_ID --dry-run

# Import under that authenticated user:
npm run db:import -- --user=YOUR_USER_ID
```

The import is safe to re-run: existing records are skipped, IDs and timestamps are
preserved, and the source files remain untouched. Keep the local folders until you
have verified the deployed dashboard, then retain them as an offline backup.

Run the deployment verifier again after the import, then open the dashboard and
spot-check at least one resume, cover letter, job description, and match report.

## Rollback

If a production deployment is unhealthy, use **Vercel → Deployments → the previous
working deployment → Promote to Production**. Database imports are additive and do
not delete source files, so keep the local folders as the recovery copy.

## Privacy note

Running locally with the filesystem driver, your data never leaves your machine.
Once you deploy with Supabase, your resume, contacts, and job history live on
Supabase's servers, and GitHub sign-in is what keeps them private to you. That's a
real trade-off for having a URL you can use anywhere — worth being deliberate about.
