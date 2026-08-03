/** @type {import('drizzle-kit').Config} */
export default {
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
