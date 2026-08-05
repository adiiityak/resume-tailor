import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

function getMigrationUrl() {
  const configuredUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || "";
  if (!configuredUrl) return "";

  const url = new URL(configuredUrl);

  // Supabase's transaction pooler is appropriate for serverless application traffic,
  // but schema introspection can stall there. Use the matching session-pooler endpoint
  // for Drizzle commands without changing the application's DATABASE_URL.
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543") {
    url.port = "5432";
    url.searchParams.delete("pgbouncer");
  }

  return url.toString();
}

/** @type {import('drizzle-kit').Config} */
const config = {
  schema: "./lib/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Supplied via .env.local (never committed). Only needed for `drizzle-kit push`
    // / `migrate`; `generate` works without a live connection.
    url: getMigrationUrl(),
  },
  strict: true,
};

export default config;
