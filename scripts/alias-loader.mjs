// Resolves Next.js's "@/..." path alias when running scripts under plain Node.
import { pathToFileURL } from "url";

const root = pathToFileURL(`${process.cwd()}/`).href;

// Only real module extensions count — "applications.fs" must still get ".js".
const HAS_EXT = /\.(js|mjs|cjs|json|node)$/i;

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let target = root + specifier.slice(2);
    if (!HAS_EXT.test(target)) target += ".js";
    return next(target, context);
  }
  return next(specifier, context);
}
