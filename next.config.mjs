/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native/worker-based PDF packages must be loaded from node_modules at runtime
  // rather than bundled.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],

  // pdf.js loads its worker file dynamically at runtime, so Next's file tracer
  // cannot see it and leaves it out of the serverless function bundle. On a
  // serverless deploy that surfaces as:
  //   Setting up fake worker failed: "Cannot find module
  //   '/var/task/node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs'"
  // Listing the files explicitly forces them into the deployed bundle.
  outputFileTracingIncludes: {
    "/api/parse-pdf": [
      "./node_modules/pdf-parse/dist/**",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
    ],
  },
};

export default nextConfig;
