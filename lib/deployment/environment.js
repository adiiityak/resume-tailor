const REQUIRED_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "AUTH_URL",
];

function looksLikePlaceholder(value) {
  return /(?:your-|your_|change-me|replace-me|example|placeholder|project:password|\[your)/i.test(value);
}

function addError(errors, key, message) {
  errors.push({ key, message });
}

export function validateProductionEnv(environment) {
  const errors = [];

  for (const key of REQUIRED_KEYS) {
    const value = environment[key]?.trim();
    if (!value) addError(errors, key, "Required for production.");
    else if (looksLikePlaceholder(value)) addError(errors, key, "Replace the placeholder with a real value.");
  }

  const databaseUrl = environment.DATABASE_URL?.trim();
  if (databaseUrl && !looksLikePlaceholder(databaseUrl)) {
    try {
      const parsed = new URL(databaseUrl);
      if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) {
        addError(errors, "DATABASE_URL", "Must use a postgres:// or postgresql:// URL.");
      } else if (parsed.port !== "6543") {
        addError(errors, "DATABASE_URL", "Use Supabase transaction pooling on port 6543 for serverless deployment.");
      }
    } catch {
      addError(errors, "DATABASE_URL", "Must be a valid PostgreSQL connection URL.");
    }
  }

  const authSecret = environment.AUTH_SECRET?.trim();
  if (authSecret && !looksLikePlaceholder(authSecret) && authSecret.length < 32) {
    addError(errors, "AUTH_SECRET", "Must contain at least 32 characters.");
  }

  const authUrl = environment.AUTH_URL?.trim();
  if (authUrl && !looksLikePlaceholder(authUrl)) {
    try {
      const parsed = new URL(authUrl);
      if (parsed.protocol !== "https:" || parsed.hostname === "localhost") {
        addError(errors, "AUTH_URL", "Must be the public HTTPS production origin.");
      }
    } catch {
      addError(errors, "AUTH_URL", "Must be a valid HTTPS URL.");
    }
  }

  return { ok: errors.length === 0, errors };
}

export { REQUIRED_KEYS as REQUIRED_PRODUCTION_ENV_KEYS };
