let validateProductionEnv;
try {
  ({ validateProductionEnv } = await import("../lib/deployment/environment.js"));
} catch {
  // The first TDD run intentionally reaches this branch.
}

let pass = 0;
let fail = 0;
const check = (name, condition, extra = "") => {
  if (condition) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ""}`);
  }
};

const valid = {
  DATABASE_URL: "postgresql://postgres.project:real-password@aws-0-region.pooler.supabase.com:6543/postgres",
  AUTH_SECRET: "a-secure-random-secret-that-is-over-32-characters",
  AUTH_GITHUB_ID: "github-client-id-123",
  AUTH_GITHUB_SECRET: "github-client-secret-456",
  AUTH_URL: "https://resume-tailor.vercel.app",
};

check("production environment validator is available", typeof validateProductionEnv === "function");

if (validateProductionEnv) {
  const ready = validateProductionEnv(valid);
  check("valid serverless production configuration passes", ready.ok === true, JSON.stringify(ready.errors));

  const missing = validateProductionEnv({});
  check(
    "every required production key is reported when missing",
    ["DATABASE_URL", "AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_URL"]
      .every((key) => missing.errors.some((error) => error.key === key))
  );

  const directDatabase = validateProductionEnv({
    ...valid,
    DATABASE_URL: "postgresql://postgres.project:password@aws-0-region.pooler.supabase.com:5432/postgres",
  });
  check(
    "non-transaction database port is rejected for serverless production",
    directDatabase.errors.some((error) => error.key === "DATABASE_URL")
  );

  const insecureUrl = validateProductionEnv({ ...valid, AUTH_URL: "http://localhost:3000" });
  check(
    "localhost HTTP callback is rejected for production",
    insecureUrl.errors.some((error) => error.key === "AUTH_URL")
  );

  const weakSecret = validateProductionEnv({ ...valid, AUTH_SECRET: "too-short" });
  check(
    "short session secrets are rejected",
    weakSecret.errors.some((error) => error.key === "AUTH_SECRET")
  );

  const placeholders = validateProductionEnv({ ...valid, AUTH_GITHUB_SECRET: "your-client-secret" });
  check(
    "placeholder values are rejected",
    placeholders.errors.some((error) => error.key === "AUTH_GITHUB_SECRET")
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
