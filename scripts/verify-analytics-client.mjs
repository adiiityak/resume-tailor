import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  FILTER_ORDER,
  buildAnalyticsQuery,
  formatMetricValue,
  formatRate,
  rateDetail,
} from "../lib/analytics/client.js";

const failures = [];

async function check(name, callback) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

await check("uses the approved stable filter order", () => {
  assert.deepEqual(FILTER_ORDER, ["from", "to", "company", "role", "location", "source"]);
  assert.equal(
    buildAnalyticsQuery({
      source: "Referral",
      location: "Remote",
      company: "Acme",
      from: "2026-01-01",
      role: "designer",
      to: "2026-01-31",
      ignored: "not-in-query",
    }),
    "from=2026-01-01&to=2026-01-31&company=Acme&role=designer&location=Remote&source=Referral"
  );
});

await check("omits empty filter values after trimming", () => {
  assert.equal(
    buildAnalyticsQuery({ from: "  ", to: null, company: "  Acme  ", role: undefined, location: "", source: "  " }),
    "company=Acme"
  );
});

await check("URL encodes filter values", () => {
  assert.equal(
    buildAnalyticsQuery({ company: "A & B", location: "New York/NY" }),
    "company=A+%26+B&location=New+York%2FNY"
  );
});

await check("formats numeric rates and unavailable rates", () => {
  assert.equal(formatRate({ value: 42 }), "42%");
  assert.equal(formatRate({ value: null }), "—");
  assert.equal(formatRate({ value: "42" }), "—");
});

await check("formats metric values and explains numerator context", () => {
  assert.equal(formatMetricValue(3.5, " days"), "3.5 days");
  assert.equal(formatMetricValue(Number.NaN), "—");
  assert.equal(rateDetail({ numerator: 4, denominator: 12 }), "4 of 12 submitted applications");
  assert.equal(rateDetail({ numerator: 0, denominator: 0 }), "No eligible records");
});

const chartPaths = [
  "components/analytics/ApplicationsTrendChart.js",
  "components/analytics/PipelineConversionChart.js",
  "components/analytics/DistributionChart.js",
];

for (const chartPath of chartPaths) {
  await check(`${chartPath} exposes an accessible visual and visible data fallback`, async () => {
    const fileUrl = new URL(`../${chartPath}`, import.meta.url);
    const source = await readFile(fileURLToPath(fileUrl), "utf8");
    assert.match(source, /aria-label/);
    assert.match(source, /data-analytics-fallback/);
  });
}

if (failures.length) {
  console.error(`\n${failures.length} analytics client verification failure${failures.length === 1 ? "" : "s"}.`);
  process.exitCode = 1;
} else {
  console.log("\nAnalytics client verification passed.");
}
