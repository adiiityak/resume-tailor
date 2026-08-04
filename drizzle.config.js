import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

/** @type {import('drizzle-kit').Config} */
const config = {
  schema: "./lib/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Supplied via .env.local (never committed). Only needed for `drizzle-kit push`
    // / `migrate`; `generate` works without a live connection.
    url: process.env.DATABASE_URL || "",
  },
  strict: true,
};

export default config;
