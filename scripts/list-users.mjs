// Prints the users known to the database, so you can find the id to import your
// existing data under after signing in with GitHub.
//   npm run db:users
import { getDb } from "../lib/db/client.js";
import { users } from "../lib/db/schema.js";

const db = await getDb();
const rows = await db.select().from(users);

if (rows.length === 0) {
  console.log("No users yet. Sign in with GitHub once, then run this again.");
} else {
  console.log(`${rows.length} user(s):\n`);
  for (const u of rows) {
    console.log(`  id:    ${u.id}`);
    console.log(`  name:  ${u.name || "—"}`);
    console.log(`  email: ${u.email || "—"}\n`);
  }
  console.log(`Import your local data with:\n  npm run db:import -- --user=${rows[0].id}`);
}
process.exit(0);
