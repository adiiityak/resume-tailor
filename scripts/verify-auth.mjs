// Verifies the storage ownership boundary without requiring OAuth credentials.
// Run directly while developing; package.json exposes it as db:verify-auth once
// the authentication phase is wired.
import { currentUserId, setUserIdResolver } from "../lib/store/shared.js";

let pass = 0;
let fail = 0;

function check(name, condition, extra = "") {
  if (condition) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

async function rejection(fn) {
  try {
    await fn();
    return null;
  } catch (error) {
    return error;
  }
}

const original = {
  databaseUrl: process.env.DATABASE_URL,
  driver: process.env.STORAGE_DRIVER,
  override: process.env.RESUME_TAILOR_USER_ID,
};

try {
  delete process.env.DATABASE_URL;
  delete process.env.RESUME_TAILOR_USER_ID;
  process.env.STORAGE_DRIVER = "fs";
  setUserIdResolver(null);
  check("filesystem mode remains available as the local user", (await currentUserId()) === "local");

  process.env.STORAGE_DRIVER = "db";
  const missingResolver = await rejection(() => currentUserId());
  check(
    "database mode rejects a missing auth resolver",
    missingResolver?.status === 401,
    `received ${missingResolver?.status || "no error"}`
  );

  setUserIdResolver(async () => null);
  const signedOut = await rejection(() => currentUserId());
  check(
    "database mode rejects a signed-out request",
    signedOut?.status === 401,
    `received ${signedOut?.status || "no error"}`
  );

  setUserIdResolver(async () => "github-user-42");
  check("database mode uses the authenticated user id", (await currentUserId()) === "github-user-42");

  setUserIdResolver(async () => {
    throw new Error("session backend unavailable");
  });
  const resolverFailure = await rejection(() => currentUserId());
  check(
    "database mode fails closed when session resolution fails",
    resolverFailure?.status === 401,
    `received ${resolverFailure?.status || "no error"}`
  );

  process.env.RESUME_TAILOR_USER_ID = "import-owner";
  setUserIdResolver(null);
  check("explicit import/test owner remains supported", (await currentUserId()) === "import-owner");
} finally {
  setUserIdResolver(null);
  if (original.databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original.databaseUrl;
  if (original.driver === undefined) delete process.env.STORAGE_DRIVER;
  else process.env.STORAGE_DRIVER = original.driver;
  if (original.override === undefined) delete process.env.RESUME_TAILOR_USER_ID;
  else process.env.RESUME_TAILOR_USER_ID = original.override;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
