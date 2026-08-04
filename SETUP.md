# Deployment setup (Supabase + GitHub sign-in)

These are the steps only you can do — they need your accounts. Nothing here requires
sharing secrets with anyone: every value goes straight into `.env.local` (git-ignored)
or Vercel's dashboard.

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**
2. Name it (e.g. `resume-tailor`), pick a region near you, set a database password
   (save it in your password manager)
3. Once created: **Project Settings → Database → Connection string → URI**
4. Copy the **"Connection pooling"** URI (port `6543`, ends with `?pgbouncer=true`).
   Serverless needs the pooled one — the direct `5432` string will exhaust connections.

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

To check the schema is valid *without* a database (runs against embedded Postgres):

```bash
npm run db:verify
```

## 4. Deploying to Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the pooled Supabase URI |
| `AUTH_SECRET` | the generated secret |
| `AUTH_GITHUB_ID` | GitHub client id |
| `AUTH_GITHUB_SECRET` | GitHub client secret |
| `ANTHROPIC_API_KEY` | only if you want Claude API mode |

Then create a **second** GitHub OAuth app (or add the callback to the existing one)
for your production domain:

```
https://YOUR-DOMAIN.vercel.app/api/auth/callback/github
```

and set `AUTH_URL="https://YOUR-DOMAIN.vercel.app"` in Vercel.

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

## Privacy note

Running locally with the filesystem driver, your data never leaves your machine.
Once you deploy with Supabase, your resume, contacts, and job history live on
Supabase's servers, and GitHub sign-in is what keeps them private to you. That's a
real trade-off for having a URL you can use anywhere — worth being deliberate about.
