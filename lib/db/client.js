import * as schema from "@/lib/db/schema";

// Lazily-created singleton so a missing DATABASE_URL only fails when the database
// is actually used (the filesystem driver stays usable locally without one).
let dbPromise = null;

// Tests inject an embedded Postgres (PGlite) instance so the real query paths can
// be exercised without a live database.
let injected = null;
export function __setTestDb(db) {
  injected = db;
  dbPromise = null;
}

export function hasDatabase() {
  return Boolean(injected || process.env.DATABASE_URL);
}

export async function getDb() {
  if (injected) return injected;
  if (!dbPromise) {
    dbPromise = (async () => {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw Object.assign(new Error("DATABASE_URL is not set. See SETUP.md."), { status: 500 });
      }
      const [{ drizzle }, postgresMod] = await Promise.all([
        import("drizzle-orm/postgres-js"),
        import("postgres"),
      ]);
      const postgres = postgresMod.default;
      // prepare:false is required for Supabase's pooled (pgbouncer) connection.
      const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
      return drizzle(sql, { schema });
    })();
  }
  return dbPromise;
}
