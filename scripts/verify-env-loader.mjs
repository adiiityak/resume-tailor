import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";

const fixture = mkdtempSync(path.join(tmpdir(), "resume-tailor-env-"));
const loader = path.join(process.cwd(), "scripts", "load-project-env.mjs");

try {
  writeFileSync(path.join(fixture, ".env.local"), "RESUME_TAILOR_ENV_TEST=loaded-from-local-file\n");
  const childEnv = { ...process.env };
  delete childEnv.RESUME_TAILOR_ENV_TEST;

  const result = spawnSync(
    process.execPath,
    ["--import", loader, "-e", "process.stdout.write(process.env.RESUME_TAILOR_ENV_TEST || 'missing')"],
    {
      cwd: fixture,
      encoding: "utf8",
      env: childEnv,
    }
  );

  const passed = result.status === 0 && result.stdout === "loaded-from-local-file";
  if (passed) {
    console.log("  ok   standalone commands load .env.local through the shared bootstrap");
  } else {
    console.log(`  FAIL standalone commands load .env.local — status ${result.status}, output ${JSON.stringify(result.stdout)}`);
  }

  process.exitCode = passed ? 0 : 1;
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
