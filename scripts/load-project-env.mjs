import nextEnv from "@next/env";

// Next.js loads .env.local automatically, but standalone Node and Drizzle commands
// do not. Keep their behavior aligned without sourcing secrets through the shell.
nextEnv.loadEnvConfig(process.cwd());
