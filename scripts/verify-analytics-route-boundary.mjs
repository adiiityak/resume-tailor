import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const dataRoot = await mkdtemp(path.join(tmpdir(), "resume-editor-route-boundary-"));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function rawPatch(port, routePath) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ notes: "x" });
    const req = request({
      hostname: "127.0.0.1",
      port,
      path: routePath,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { responseBody += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body: responseBody }));
    });
    req.once("error", reject);
    req.end(body);
  });
}

function waitForReady(child, logs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next.js did not become ready.\n${logs.join("")}`)), 30000);
    const inspect = (chunk) => {
      const text = chunk.toString();
      logs.push(text);
      if (logs.join("").includes("Ready in")) {
        clearTimeout(timeout);
        resolve();
      }
    };
    child.stdout.on("data", inspect);
    child.stderr.on("data", inspect);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Next.js exited before readiness with code ${code}.\n${logs.join("")}`));
    });
  });
}

function stop(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

let child;
try {
  const port = await freePort();
  const environment = { ...process.env };
  delete environment.DATABASE_URL;
  child = spawn(process.execPath, [
    path.join(root, "node_modules", "next", "dist", "bin", "next"),
    "dev", "-H", "127.0.0.1", "-p", String(port),
  ], {
    cwd: root,
    env: {
      ...environment,
      NEXT_TELEMETRY_DISABLED: "1",
      STORAGE_DRIVER: "fs",
      RESUME_TAILOR_DATA_ROOT: dataRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  await waitForReady(child, logs);

  const singleEncoded = await rawPatch(port, "/api/skill-gaps/%2e%2e%2fskill-gap-product-analytics");
  const doubleEncoded = await rawPatch(port, "/api/skill-gaps/%252e%252e%252fskill-gap-product-analytics");
  const valid = [singleEncoded, doubleEncoded].every((response) => {
    if (response.status !== 400) return false;
    try {
      return JSON.parse(response.body).error === "Invalid skill-gap id.";
    } catch {
      return false;
    }
  });
  if (!valid) {
    console.error("FAIL Next.js framework boundary rejects encoded traversal", { singleEncoded, doubleEncoded });
    process.exitCode = 1;
  } else {
    console.log("PASS Next.js framework boundary rejects single- and double-encoded traversal with 400");
  }
} finally {
  if (child) await stop(child);
  await rm(dataRoot, { recursive: true, force: true });
}
