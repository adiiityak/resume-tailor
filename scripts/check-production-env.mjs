import "./load-project-env.mjs";
import {
  REQUIRED_PRODUCTION_ENV_KEYS,
  validateProductionEnv,
} from "../lib/deployment/environment.js";

const result = validateProductionEnv(process.env);

console.log("Production environment check");
for (const key of REQUIRED_PRODUCTION_ENV_KEYS) {
  const invalid = result.errors.some((error) => error.key === key);
  console.log(`  ${invalid ? "FAIL" : "ok  "} ${key}`);
}

if (!result.ok) {
  console.log("\nRequired corrections:");
  for (const error of result.errors) console.log(`  - ${error.key}: ${error.message}`);
  console.log("\nNo secret values were printed.");
  process.exit(1);
}

console.log("\nPRODUCTION ENVIRONMENT READY");
