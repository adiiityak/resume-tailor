import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import * as schema from "../lib/db/schema.js";
import { __setTestDb } from "../lib/db/client.js";

const GAP_ID = "skill-gap-product-analytics";
const baseGap = {
  id: GAP_ID,
  skill: "Product analytics",
  skillSlug: "product-analytics",
  category: "Tools",
  frequency: 3,
  percentage: 60,
  evidenceLevel: "None",
  evidenceExplanation: "No verified evidence found.",
  relatedJobs: [{ id: "j1", company: "A", role: "Designer" }],
};

let passed = 0;
let failed = 0;

function check(name, condition, extra = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${extra ? `: ${extra}` : ""}`);
  }
}

async function rejects400(operation) {
  try {
    await operation();
    return false;
  } catch (error) {
    return error?.status === 400;
  }
}

function withConflictInterleaving(realDb, targetId) {
  return new Proxy(realDb, {
    get(target, property) {
      if (property !== "transaction") {
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return (callback) => target.transaction(async (tx) => {
        let interleaved = false;
        const wrappedTx = new Proxy(tx, {
          get(transaction, transactionProperty) {
            if (transactionProperty !== "insert") {
              const value = Reflect.get(transaction, transactionProperty);
              return typeof value === "function" ? value.bind(transaction) : value;
            }
            return (table) => {
              const insert = transaction.insert(table);
              return {
                values(values) {
                  const query = insert.values(values);
                  return {
                    async onConflictDoUpdate(config) {
                      if (!interleaved && values.id === targetId) {
                        interleaved = true;
                        await transaction.update(schema.skillGaps).set({
                          importance: "Low",
                          importanceSource: "user",
                          learningStatus: "Verified in Resume",
                          notes: "Concurrent note",
                          portfolioOpportunity: "Concurrent portfolio",
                          createdAt: new Date("2020-01-02T03:04:05.000Z"),
                        }).where(and(
                          eq(schema.skillGaps.userId, values.userId),
                          eq(schema.skillGaps.id, values.id)
                        ));
                      }
                      return query.onConflictDoUpdate(config);
                    },
                  };
                },
              };
            };
          },
        });
        return callback(wrappedTx);
      });
    },
  });
}

async function runContract(name, store) {
  console.log(name);

  const synced = await store.syncSkillGaps([baseGap]);
  check("sync returns active records in input order", synced.length === 1 && synced[0].id === GAP_ID);
  check(
    "new record uses roadmap defaults and derived importance",
    synced[0].importance === "High" &&
      synced[0].importanceSource === "derived" &&
      synced[0].learningStatus === "Not Started" &&
      synced[0].notes === "" &&
      synced[0].portfolioOpportunity === ""
  );

  const edited = await store.updateSkillGap(GAP_ID, {
    importance: "High",
    learningStatus: "Learning",
    notes: "  Complete a real analytics exercise.  ",
  });
  check(
    "user edit persisted",
    edited.importanceSource === "user" &&
      edited.learningStatus === "Learning" &&
      edited.notes === "Complete a real analytics exercise."
  );

  const beforeNoOp = edited.updatedAt;
  const noOp = await store.updateSkillGap(GAP_ID, {
    importance: "High",
    learningStatus: "Learning",
    notes: "Complete a real analytics exercise.",
  });
  check("no-op user patch preserves updatedAt", noOp.updatedAt === beforeNoOp);

  const refreshed = await store.syncSkillGaps([{
    ...baseGap,
    frequency: 4,
    relatedJobs: [...baseGap.relatedJobs, { id: "j2", company: "B", role: "Researcher" }],
  }]);
  check(
    "sync refreshes derived fields and preserves user fields",
    refreshed[0].frequency === 4 &&
      refreshed[0].importance === "High" &&
      refreshed[0].importanceSource === "user" &&
      refreshed[0].learningStatus === "Learning" &&
      refreshed[0].notes === "Complete a real analytics exercise." &&
      refreshed[0].relatedJobs.length === 2
  );

  const beforeEquivalentJson = refreshed[0].updatedAt;
  const equivalentJson = await store.syncSkillGaps([{
    ...baseGap,
    frequency: 4,
    relatedJobs: [
      { role: "Designer", company: "A", id: "j1" },
      { role: "Researcher", id: "j2", company: "B" },
    ],
  }]);
  check("structurally equal related jobs preserve updatedAt", equivalentJson[0].updatedAt === beforeEquivalentJson);

  const detached = equivalentJson[0];
  detached.relatedJobs.push({ id: "evil", company: "Mutation", role: "Mutation" });
  const afterMutation = await store.listSkillGaps();
  check("returned records are defensive copies", afterMutation.skillGaps[0].relatedJobs.length === 2);

  await store.syncSkillGaps([
    { ...baseGap, id: "skill-gap-accessibility", skill: "Accessibility", skillSlug: "accessibility", frequency: 1, percentage: 10 },
    { ...baseGap, id: "skill-gap-design-systems", skill: "Design systems", skillSlug: "design-systems", frequency: 3, percentage: 30 },
  ]);
  const listed = await store.listSkillGaps();
  check(
    "list includes dormant records in deterministic order",
    isDeepStrictEqual(listed.skillGaps.map((gap) => gap.id), [GAP_ID, "skill-gap-design-systems", "skill-gap-accessibility"]),
    JSON.stringify(listed.skillGaps.map((gap) => gap.id))
  );

  check("invalid id rejected", await rejects400(() => store.updateSkillGap("../skill-gap-product-analytics", { notes: "x" })));
  check("empty patch rejected", await rejects400(() => store.updateSkillGap(GAP_ID, {})));
  check("unknown field rejected", await rejects400(() => store.updateSkillGap(GAP_ID, { frequency: "5" })));
  check("non-string editable value rejected", await rejects400(() => store.updateSkillGap(GAP_ID, { notes: 5 })));
  check("invalid importance rejected", await rejects400(() => store.updateSkillGap(GAP_ID, { importance: "Urgent" })));
  check("invalid learning status rejected", await rejects400(() => store.updateSkillGap(GAP_ID, { learningStatus: "Done" })));
  check("notes over 4000 characters rejected", await rejects400(() => store.updateSkillGap(GAP_ID, { notes: "x".repeat(4001) })));
  check("portfolio opportunity over 1000 characters rejected", await rejects400(() => store.updateSkillGap(GAP_ID, { portfolioOpportunity: "x".repeat(1001) })));
  check(
    "Verified in Resume requires Strong evidence",
    await rejects400(() => store.updateSkillGap(GAP_ID, { learningStatus: "Verified in Resume" }))
  );
  check("missing record returns null", (await store.updateSkillGap("skill-gap-missing", { notes: "x" })) === null);

  const strongGap = {
    ...baseGap,
    id: "skill-gap-verified-evidence",
    skill: "Verified evidence",
    skillSlug: "verified-evidence",
    evidenceLevel: "Strong",
    evidenceExplanation: "Verified evidence found.",
  };
  await store.syncSkillGaps([strongGap]);
  const verified = await store.updateSkillGap(strongGap.id, { learningStatus: "Verified in Resume" });
  check("Strong evidence can be verified in resume", verified.learningStatus === "Verified in Resume");
  const [downgraded] = await store.syncSkillGaps([{
    ...strongGap,
    evidenceLevel: "Partial",
    evidenceExplanation: "Only partial evidence remains.",
  }]);
  check(
    "evidence downgrade resets verified learning status",
    downgraded.evidenceLevel === "Partial" && downgraded.learningStatus === "Not Started"
  );

  const countOnlyGap = {
    ...baseGap,
    id: "skill-gap-count-input",
    skill: "Count input",
    skillSlug: "count-input",
    count: 2,
    percentage: 25,
  };
  delete countOnlyGap.frequency;
  const countNormalized = await store.syncSkillGaps([countOnlyGap]);
  check("analytics count input persists as frequency", countNormalized[0].frequency === 2);
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "resume-tailor-skill-gaps-"));
let client;

try {
  process.env.STORAGE_DRIVER = "fs";
  process.env.RESUME_TAILOR_DATA_ROOT = tempRoot;
  const store = await import("../lib/skillGaps.js");
  await runContract("filesystem driver", store);

  const dataFile = path.join(tempRoot, "data", "skill-gaps", "skill-gaps.json");
  const beforeSameSync = await stat(dataFile);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const current = await store.listSkillGaps();
  await store.syncSkillGaps(current.skillGaps.map(({ importance, importanceSource, learningStatus, notes, portfolioOpportunity, createdAt, updatedAt, ...gap }) => gap));
  const afterSameSync = await stat(dataFile);
  check("unchanged filesystem sync avoids a rewrite", beforeSameSync.mtimeMs === afterSameSync.mtimeMs);

  const invalidVerifiedRecord = {
    ...current.skillGaps[0],
    id: "skill-gap-invalid-verified-record",
    skill: "Invalid verified record",
    skillSlug: "invalid-verified-record",
    evidenceLevel: "Partial",
    learningStatus: "Verified in Resume",
  };
  await writeFile(dataFile, JSON.stringify([current.skillGaps[0], invalidVerifiedRecord, null, { id: "unsafe" }], null, 2));
  const partiallyCorrupt = await store.listSkillGaps();
  check("malformed filesystem records are counted and skipped", partiallyCorrupt.skillGaps.length === 1 && partiallyCorrupt.corrupted === 3);
  await writeFile(dataFile, "{not json");
  const malformedJson = await store.listSkillGaps();
  check("malformed filesystem JSON is counted without throwing", malformedJson.skillGaps.length === 0 && malformedJson.corrupted === 1);
  check("filesystem writes stay under the injected root", (await readFile(dataFile, "utf8")) === "{not json");

  process.env.STORAGE_DRIVER = "db";
  delete process.env.RESUME_TAILOR_DATA_ROOT;
  process.env.RESUME_TAILOR_USER_ID = "skill-gap-user-1";
  client = new PGlite();
  await client.waitReady;
  const migrationDir = path.join(process.cwd(), "drizzle");
  for (const file of (await readdir(migrationDir)).filter((entry) => entry.endsWith(".sql")).sort()) {
    const sql = await readFile(path.join(migrationDir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement.trim());
    }
  }
  const realDb = drizzle(client, { schema });
  __setTestDb(realDb);
  await runContract("database driver", store);

  const concurrentGap = {
    ...baseGap,
    id: "skill-gap-concurrent-edit",
    skill: "Concurrent edit",
    skillSlug: "concurrent-edit",
    evidenceLevel: "Strong",
    evidenceExplanation: "Verified evidence found.",
  };
  await store.syncSkillGaps([concurrentGap]);
  __setTestDb(withConflictInterleaving(realDb, concurrentGap.id));
  const [afterConcurrentEdit] = await store.syncSkillGaps([{
    ...concurrentGap,
    frequency: 4,
    evidenceLevel: "Partial",
    evidenceExplanation: "Only partial evidence remains.",
  }]);
  check(
    "database conflict preserves concurrent user fields and applies evidence downgrade",
    afterConcurrentEdit.importance === "Low" &&
      afterConcurrentEdit.importanceSource === "user" &&
      afterConcurrentEdit.learningStatus === "Not Started" &&
      afterConcurrentEdit.notes === "Concurrent note" &&
      afterConcurrentEdit.portfolioOpportunity === "Concurrent portfolio" &&
      afterConcurrentEdit.createdAt === "2020-01-02T03:04:05.000Z" &&
      afterConcurrentEdit.evidenceLevel === "Partial" &&
      afterConcurrentEdit.frequency === 4,
    JSON.stringify(afterConcurrentEdit)
  );
  __setTestDb(realDb);

  process.env.RESUME_TAILOR_USER_ID = "skill-gap-user-2";
  const otherUser = await store.listSkillGaps();
  check("database rows are isolated by user", otherUser.skillGaps.length === 0);
  check("other user cannot update by shared id", (await store.updateSkillGap(GAP_ID, { notes: "x" })) === null);

  await store.syncSkillGaps([baseGap]);
  const secondUserRows = await store.listSkillGaps();
  check("same deterministic id is valid for another user", secondUserRows.skillGaps.length === 1 && secondUserRows.skillGaps[0].id === GAP_ID);
} finally {
  if (client) await client.close();
  __setTestDb(null);
  delete process.env.STORAGE_DRIVER;
  delete process.env.RESUME_TAILOR_DATA_ROOT;
  delete process.env.RESUME_TAILOR_USER_ID;
  await rm(tempRoot, { recursive: true, force: true });
}

if (failed) {
  console.error(`\n${failed} skill-gap assertion${failed === 1 ? "" : "s"} failed; ${passed} passed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${passed} skill-gap assertions passed.`);
}
