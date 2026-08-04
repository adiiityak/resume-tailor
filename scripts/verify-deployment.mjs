const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
if (!urlArg) {
  console.error("Usage: npm run deployment:verify -- --url=https://your-domain.example");
  process.exit(1);
}

let origin;
try {
  const parsed = new URL(urlArg.slice("--url=".length));
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error();
  origin = parsed.origin;
} catch {
  console.error("Deployment URL must be HTTPS, or localhost for development verification.");
  process.exit(1);
}

let failures = 0;
async function check(name, path, expectedStatus, options = {}) {
  try {
    const response = await fetch(`${origin}${path}`, {
      redirect: options.redirect || "follow",
      signal: AbortSignal.timeout(15_000),
    });
    let passed = response.status === expectedStatus;
    if (passed && options.locationPrefix) {
      passed = (response.headers.get("location") || "").startsWith(options.locationPrefix);
    }
    if (passed && options.jsonStatus) {
      const body = await response.json();
      passed = body.status === options.jsonStatus;
    }

    if (passed) console.log(`  ok   ${name}`);
    else {
      failures++;
      console.log(`  FAIL ${name} — received HTTP ${response.status}`);
    }
  } catch (error) {
    failures++;
    console.log(`  FAIL ${name} — ${error.message}`);
  }
}

console.log(`Verifying ${origin}`);
await check("public health endpoint", "/api/health", 200, { jsonStatus: "ok" });
await check("signed-out API protection", "/api/applications", 401);
await check("private page redirect", "/dashboard", 307, {
  redirect: "manual",
  locationPrefix: "/sign-in?callbackUrl=",
});
await check("sign-in page", "/sign-in", 200);

console.log(`\n${failures ? "DEPLOYMENT VERIFICATION FAILED" : "DEPLOYMENT VERIFIED"}`);
process.exit(failures ? 1 : 0);
