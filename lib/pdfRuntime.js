import { createRequire } from "module";

// pdf-parse ships three builds and its package exports map lists a "browser"
// condition first. When the bundler resolves the bare specifier it can pick that
// web build, which expects browser globals and fails in Node with
// "ReferenceError: DOMMatrix is not defined" while loading the module.
//
// Two defences, applied together:
//  1. Resolve through Node's own require(), which uses the node/require
//     conditions and therefore loads the CommonJS Node build.
//  2. Install Node implementations of the browser globals pdf.js touches, from
//     @napi-rs/canvas (already a pdf-parse dependency), in case a build that
//     needs them is loaded anyway.

let polyfilled = false;

async function installDomPolyfills() {
  if (polyfilled) return;
  polyfilled = true;
  try {
    const canvas = await import("@napi-rs/canvas");
    const g = globalThis;
    if (typeof g.DOMMatrix === "undefined" && canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix;
    if (typeof g.Path2D === "undefined" && canvas.Path2D) g.Path2D = canvas.Path2D;
    if (typeof g.ImageData === "undefined" && canvas.ImageData) g.ImageData = canvas.ImageData;
  } catch (err) {
    // Not fatal on its own — text extraction usually succeeds without these.
    console.warn("PDF polyfill unavailable:", err?.message || err);
  }
}

// Returns the PDFParse class with the Node environment prepared.
export async function loadPdfParser() {
  await installDomPolyfills();

  // Preferred: Node's resolution → CommonJS Node build.
  try {
    const nodeRequire = createRequire(import.meta.url);
    const mod = nodeRequire("pdf-parse");
    const PDFParse = mod?.PDFParse || mod?.default?.PDFParse;
    if (PDFParse) return PDFParse;
  } catch (err) {
    console.warn("pdf-parse require() path failed, falling back to import():", err?.message || err);
  }

  // Fallback: dynamic import (works when the bundler resolves the Node build).
  const { PDFParse } = await import("pdf-parse");
  return PDFParse;
}
