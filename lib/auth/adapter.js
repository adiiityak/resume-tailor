import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

const authTables = {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
};

const adapterMethods = [
  "createUser",
  "getUser",
  "getUserByEmail",
  "getUserByAccount",
  "updateUser",
  "deleteUser",
  "linkAccount",
  "unlinkAccount",
  "getAccount",
  "createSession",
  "getSessionAndUser",
  "updateSession",
  "deleteSession",
  "createVerificationToken",
  "useVerificationToken",
  "createAuthenticator",
  "getAuthenticator",
  "listAuthenticatorsByUserId",
  "updateAuthenticatorCounter",
];

// getDb() is intentionally lazy so local filesystem mode and production builds
// do not open a Supabase connection merely by importing the authentication config.
export function createDatabaseAuthAdapter(loadDatabase = getDb) {
  let adapterPromise;

  const loadAdapter = () => {
    if (!adapterPromise) {
      adapterPromise = Promise.resolve(loadDatabase()).then((db) =>
        DrizzleAdapter(db, authTables)
      );
    }
    return adapterPromise;
  };

  return Object.fromEntries(
    adapterMethods.map((name) => [
      name,
      async (...args) => {
        const adapter = await loadAdapter();
        return adapter[name](...args);
      },
    ])
  );
}
