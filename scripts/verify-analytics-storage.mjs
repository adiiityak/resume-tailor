import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { promises as fs } from "node:fs";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as schema from "../lib/db/schema.js";
import { __setTestDb } from "../lib/db/client.js";

const projectRoot = process.cwd();
const tempRoot = await mkdtemp(path.join(tmpdir(), "resume-editor-analytics-storage-"));
const originalEnvironment = {
  STORAGE_DRIVER: process.env.STORAGE_DRIVER,
  RESUME_TAILOR_USER_ID: process.env.RESUME_TAILOR_USER_ID,
  RESUME_TAILOR_DATA_ROOT: process.env.RESUME_TAILOR_DATA_ROOT,
};

let passed = 0;
let failed = 0;
let client;

function check(name, condition, extra = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${extra ? `: ${extra}` : ""}`);
  }
}

function moduleUrl(relativePath) {
  return pathToFileURL(path.join(projectRoot, relativePath)).href;
}

async function writeApplicationFixture(index, overrides = {}) {
  const id = overrides.id || `company-${index}-product-designer-2026-08-04-${String(index).padStart(6, "0")}`;
  const companySlug = overrides.companySlug || `company-${index % 12}`;
  const directory = path.join(tempRoot, "history", companySlug, "2026-08-04", `product-designer-${String(index).padStart(6, "0")}`);
  await mkdir(directory, { recursive: true });
  const metadata = {
    id,
    company: overrides.company || `Company ${index % 12}`,
    companySlug,
    role: "Product Designer",
    roleSlug: "product-designer",
    createdAt: "2026-08-04T08:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
    applicationDate: "2026-08-04",
    location: "Remote",
    jobUrl: "",
    workMode: "Remote",
    priority: "Medium",
    tags: [],
    mode: "local",
    resumeVariant: "v2",
    matchScore: 82,
    status: "Applied",
    statusUpdatedAt: "2026-08-04T09:00:00.000Z",
    submittedAt: "2026-08-04T09:00:00.000Z",
    submittedResumeVersion: "resume-r9",
    submittedCoverLetterVersion: "cover-letter-c4",
    applicationSource: "Referral",
    baseProfileId: "product-design",
    migrated: false,
    files: {
      jobDescription: "job-description.txt",
      originalResume: "original-resume.txt",
      tailoredResume: "tailored-resume.json",
    },
    ...overrides,
  };
  await Promise.all([
    writeFile(path.join(directory, "metadata.json"), JSON.stringify(metadata, null, 2)),
    writeFile(path.join(directory, "job-description.txt"), overrides.jobDescription || "Figma and product analytics are required."),
    writeFile(path.join(directory, "original-resume.txt"), "PRIVATE COMPLETE RESUME DOCUMENT"),
    writeFile(path.join(directory, "tailored-resume.json"), JSON.stringify({ tailoredResume: "PRIVATE COMPLETE TAILORED RESUME" })),
    writeFile(path.join(directory, "activity.json"), JSON.stringify([
      { id: `event-${index}-1`, type: "status_changed", to: "Applied", createdAt: "2026-08-04T09:00:00.000Z" },
      { id: `event-${index}-2`, type: "status_changed", to: "Recruiter Screen", createdAt: "2026-08-05T09:00:00.000Z" },
    ])),
  ]);
  return metadata;
}

async function applyMigrations(databaseClient) {
  const migrationDirectory = path.join(projectRoot, "drizzle");
  for (const file of (await readdir(migrationDirectory)).filter((entry) => entry.endsWith(".sql")).sort()) {
    const sql = await readFile(path.join(migrationDirectory, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await databaseClient.exec(statement.trim());
    }
  }
}

function countingDatabase(database) {
  let selects = 0;
  return {
    db: new Proxy(database, {
      get(target, property) {
        if (property === "select") {
          return (...args) => {
            selects += 1;
            return target.select(...args);
          };
        }
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
    count: () => selects,
  };
}

try {
  console.log("filesystem analytics projection");
  process.env.STORAGE_DRIVER = "fs";
  process.env.RESUME_TAILOR_DATA_ROOT = tempRoot;
  for (let index = 0; index < 120; index += 1) await writeApplicationFixture(index);
  const traversalDirectory = path.join(tempRoot, "history", "company-0", "2026-08-04", "product-designer-000000");
  const traversalMetadataPath = path.join(traversalDirectory, "metadata.json");
  const traversalMetadata = JSON.parse(await readFile(traversalMetadataPath, "utf8"));
  traversalMetadata.files.jobDescription = "../../../escaped-job-description.txt";
  await writeFile(traversalMetadataPath, JSON.stringify(traversalMetadata, null, 2));
  await writeFile(path.join(tempRoot, "history", "escaped-job-description.txt"), "PRIVATE ESCAPED JOB DESCRIPTION");
  process.chdir(tempRoot);
  const appsFs = await import(moduleUrl("lib/store/applications.fs.js"));

  check("filesystem driver exposes the analytics projection contract", typeof appsFs.loadAnalyticsApplications === "function");
  if (typeof appsFs.loadAnalyticsApplications === "function") {
    const originalReadFile = fs.readFile;
    const reads = { metadata: 0, jobDescription: 0, activity: 0, fullDocuments: 0 };
    let inFlight = 0;
    let maxInFlight = 0;
    fs.readFile = async (...args) => {
      const filename = String(args[0]);
      if (filename.endsWith(`${path.sep}metadata.json`)) reads.metadata += 1;
      if (filename.endsWith(`${path.sep}job-description.txt`)) reads.jobDescription += 1;
      if (filename.endsWith(`${path.sep}activity.json`)) reads.activity += 1;
      if (filename.endsWith(`${path.sep}original-resume.txt`) || filename.endsWith(`${path.sep}tailored-resume.json`)) {
        reads.fullDocuments += 1;
      }
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        await new Promise((resolve) => setImmediate(resolve));
        return await originalReadFile(...args);
      } finally {
        inFlight -= 1;
      }
    };
    let projection;
    try {
      projection = await appsFs.loadAnalyticsApplications();
    } finally {
      fs.readFile = originalReadFile;
    }
    check(
      "one filesystem walk loads 120 application projections with linear required reads",
      projection.applications.length === 120 && reads.metadata === 120 &&
        reads.jobDescription === 120 && reads.activity === 120,
      JSON.stringify({ count: projection.applications.length, reads })
    );
    check(
      "filesystem projection avoids full resume documents and bounds concurrent reads",
      reads.fullDocuments === 0 && maxInFlight <= 16 &&
        !JSON.stringify(projection).includes("PRIVATE ESCAPED JOB DESCRIPTION"),
      JSON.stringify({ reads, maxInFlight })
    );
    console.log(`  evidence filesystem reads: metadata=${reads.metadata}, jobDescription=${reads.jobDescription}, activity=${reads.activity}, fullDocuments=${reads.fullDocuments}, maxConcurrent=${maxInFlight}`);
  }

  await rm(path.join(tempRoot, "history"), { recursive: true, force: true });
  const importedApplication = await writeApplicationFixture(999, {
    id: "linked-co-product-designer-2026-08-04-090000",
    company: "Linked Co",
    companySlug: "linked-co",
  });
  await mkdir(path.join(tempRoot, "jobs"), { recursive: true });
  const jobs = [
    {
      id: "job-start", company: "Boundary Start", companySlug: "boundary-start", role: "Designer", roleSlug: "designer",
      dateSaved: "2026-08-04T00:00:00.000Z", updatedAt: "2026-08-04T00:00:00.000Z", status: "Saved",
      jobDescription: "Figma is required.", applicationId: importedApplication.id,
    },
    {
      id: "job-end", company: "Boundary End", companySlug: "boundary-end", role: "Designer", roleSlug: "designer",
      dateSaved: "2026-08-04T23:59:59.999Z", updatedAt: "2026-08-04T23:59:59.999Z", status: "Saved",
      jobDescription: "React is required.", applicationId: null,
    },
    {
      id: "job-after", company: "Outside", companySlug: "outside", role: "Designer", roleSlug: "designer",
      dateSaved: "2026-08-05T00:00:00.000Z", updatedAt: "2026-08-05T00:00:00.000Z", status: "Saved",
      jobDescription: "SQL is required.", applicationId: null,
    },
  ];
  for (const job of jobs) await writeFile(path.join(tempRoot, "jobs", `${job.id}.json`), JSON.stringify(job, null, 2));

  const { getAnalytics } = await import(moduleUrl("lib/analytics.js"));
  const filters = { from: "2026-08-04", to: "2026-08-04", company: "", role: "", location: "", source: "" };
  const filesystemAnalytics = await getAnalytics(filters);
  check(
    "filesystem analytics includes both production-shaped ISO UTC date boundaries",
    filesystemAnalytics.summary.totalJobsSaved === 2 && filesystemAnalytics.dataQuality.analyzedJobDescriptions === 2,
    JSON.stringify({ summary: filesystemAnalytics.summary, dataQuality: filesystemAnalytics.dataQuality })
  );

  console.log("database import and analytics projection");
  client = new PGlite();
  await client.waitReady;
  await applyMigrations(client);
  const realDb = drizzle(client, { schema });
  __setTestDb(realDb);
  const { runImport } = await import(moduleUrl("scripts/import-to-db.mjs"));
  await runImport({ userId: "analytics-user" });

  process.env.STORAGE_DRIVER = "db";
  process.env.RESUME_TAILOR_USER_ID = "analytics-user";
  const appsDb = await import(moduleUrl("lib/store/applications.db.js"));
  const importedFull = await appsDb.getApplication(importedApplication.id, { full: true });
  check(
    "import round-trips submitted versions and base profile metadata through the database mapper",
    importedFull.submittedAt === "2026-08-04T09:00:00.000Z" &&
      importedFull.submittedResumeVersion === "resume-r9" &&
      importedFull.submittedCoverLetterVersion === "cover-letter-c4" &&
      importedFull.applicationSource === "Referral" &&
      importedFull.baseProfileId === "product-design",
    JSON.stringify(importedFull)
  );

  const databaseAnalytics = await getAnalytics(filters);
  check(
    "imported database analytics preserves submitted version and profile performance groups",
    databaseAnalytics.resumePerformance.versions.some((row) => row.key === "resume-r9" && row.submitted === 1) &&
      databaseAnalytics.resumePerformance.profiles.some((row) => row.key === "product-design" && row.submitted === 1) &&
      databaseAnalytics.summary.totalJobsSaved === 2,
    JSON.stringify({ resumePerformance: databaseAnalytics.resumePerformance, summary: databaseAnalytics.summary })
  );
  const databaseSerialized = JSON.stringify(databaseAnalytics);
  check(
    "end-to-end database analytics remains aggregate-only",
    !databaseSerialized.includes("PRIVATE COMPLETE RESUME DOCUMENT") &&
      !databaseSerialized.includes("PRIVATE COMPLETE TAILORED RESUME") &&
      !Object.hasOwn(databaseAnalytics, "applications"),
    databaseSerialized
  );

  const extraApplications = Array.from({ length: 119 }, (_, index) => ({
    id: `volume-app-${index}`,
    userId: "analytics-user",
    company: `Volume ${index % 10}`,
    companySlug: `volume-${index % 10}`,
    role: "Product Designer",
    roleSlug: "product-designer",
    applicationDate: "2026-08-04",
    status: "Applied",
    statusUpdatedAt: new Date("2026-08-04T09:00:00.000Z"),
    mode: "local",
    resumeVariant: "v2",
    matchScore: 80,
    submittedAt: new Date("2026-08-04T09:00:00.000Z"),
    submittedResumeVersion: "resume-volume",
    submittedCoverLetterVersion: "cover-volume",
    applicationSource: "Referral",
    extra: { baseProfileId: "volume-profile" },
    createdAt: new Date("2026-08-04T08:00:00.000Z"),
    updatedAt: new Date("2026-08-04T10:00:00.000Z"),
  }));
  await realDb.insert(schema.applications).values(extraApplications);
  await realDb.insert(schema.applicationDocuments).values(extraApplications.flatMap((application) => [
    { applicationId: application.id, kind: "job_description", content: "Figma and React are required." },
    { applicationId: application.id, kind: "original_resume", content: "PRIVATE VOLUME RESUME" },
  ]));
  await realDb.insert(schema.applicationActivity).values(extraApplications.map((application, index) => ({
    id: `volume-event-${index}`,
    applicationId: application.id,
    type: "status_changed",
    toStatus: "Applied",
    createdAt: new Date("2026-08-04T09:00:00.000Z"),
  })));
  await realDb.insert(schema.applications).values({
    id: "other-user-application",
    userId: "other-user",
    company: "Private Other User",
    companySlug: "private-other-user",
    role: "Designer",
    roleSlug: "designer",
    status: "Applied",
    extra: { baseProfileId: "other-user-profile" },
  });
  await realDb.insert(schema.applicationDocuments).values({
    applicationId: "other-user-application",
    kind: "job_description",
    content: "PRIVATE OTHER USER JOB DESCRIPTION",
  });

  check("database driver exposes the analytics projection contract", typeof appsDb.loadAnalyticsApplications === "function");
  if (typeof appsDb.loadAnalyticsApplications === "function") {
    const counted = countingDatabase(realDb);
    __setTestDb(counted.db);
    const databaseProjection = await appsDb.loadAnalyticsApplications();
    __setTestDb(realDb);
    const projectionSerialized = JSON.stringify(databaseProjection);
    check(
      "database projection loads 120 user-scoped applications in at most three queries",
      databaseProjection.applications.length === 120 && counted.count() <= 3 &&
        !projectionSerialized.includes("Private Other User") &&
        !projectionSerialized.includes("PRIVATE OTHER USER JOB DESCRIPTION"),
      JSON.stringify({ count: databaseProjection.applications.length, queries: counted.count() })
    );
    check(
      "database projection loads only analytics fields and avoids full resume documents",
      !projectionSerialized.includes("PRIVATE COMPLETE RESUME DOCUMENT") &&
        !projectionSerialized.includes("PRIVATE VOLUME RESUME") &&
        databaseProjection.applications.every((application) =>
          Object.hasOwn(application, "jobDescription") && Object.hasOwn(application, "activity") &&
          !Object.hasOwn(application, "originalResume") && !Object.hasOwn(application, "tailoredResume")
        ),
      projectionSerialized
    );
    console.log(`  evidence database projection: applications=${databaseProjection.applications.length}, queries=${counted.count()}, otherUserRows=0, fullResumeDocuments=0`);
  }
} finally {
  process.chdir(projectRoot);
  __setTestDb(null);
  if (client) await client.close();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(tempRoot, { recursive: true, force: true });
}

if (failed) {
  console.error(`\n${failed} analytics storage assertion${failed === 1 ? "" : "s"} failed; ${passed} passed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${passed} analytics storage assertions passed.`);
}
