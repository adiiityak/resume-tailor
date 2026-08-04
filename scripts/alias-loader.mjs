// Resolves Next.js's "@/..." path alias when running scripts under plain Node.
import { pathToFileURL } from "url";

const root = pathToFileURL(`${process.cwd()}/`).href;

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let target = root + specifier.slice(2);
    if (!/\.[a-z]+$/i.test(target)) target += ".js";
    return next(target, context);
  }
  return next(specifier, context);
}
