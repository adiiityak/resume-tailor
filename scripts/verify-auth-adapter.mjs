// Exercises Resume Tailor's lazy Auth.js adapter against real embedded Postgres.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import * as schema from "../lib/db/schema.js";
import { createDatabaseAuthAdapter } from "../lib/auth/adapter.js";

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

{
  const client = new PGlite();
  await client.waitReady;

  const dir = path.join(process.cwd(), "drizzle");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement.trim());
    }
  }

  let databaseLoads = 0;
  const db = drizzle(client, { schema });
  const adapter = createDatabaseAuthAdapter(async () => {
    databaseLoads++;
    return db;
  });

  check("adapter stays lazy until Auth.js calls it", databaseLoads === 0);
  const requiredDatabaseSessionMethods = [
    "createUser",
    "getUser",
    "getUserByEmail",
    "getUserByAccount",
    "updateUser",
    "linkAccount",
    "createSession",
    "getSessionAndUser",
    "updateSession",
    "deleteSession",
  ];
  check(
    "Auth.js can detect every required database-session method",
    requiredDatabaseSessionMethods.every((method) => method in adapter)
  );

  const user = await adapter.createUser({
    id: "auth-user-1",
    name: "Resume User",
    email: "resume@example.test",
    emailVerified: null,
    image: null,
  });
  check("user is stored in the existing users table", user.id === "auth-user-1");

  await adapter.linkAccount({
    userId: user.id,
    type: "oauth",
    provider: "github",
    providerAccountId: "github-42",
    access_token: "test-token",
  });
  check(
    "GitHub account resolves to the stored user",
    (await adapter.getUserByAccount({ provider: "github", providerAccountId: "github-42" }))?.id === user.id
  );

  await adapter.createSession({
    sessionToken: "session-token-1",
    userId: user.id,
    expires: new Date("2030-01-01T00:00:00.000Z"),
  });
  const sessionAndUser = await adapter.getSessionAndUser("session-token-1");
  check(
    "database session returns its authenticated user",
    sessionAndUser?.session.userId === user.id && sessionAndUser?.user.id === user.id
  );
  check("database connection is initialized once", databaseLoads === 1, `loaded ${databaseLoads} times`);

  await client.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
