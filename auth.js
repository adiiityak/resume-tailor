import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { createDatabaseAuthAdapter } from "@/lib/auth/adapter";
import { setUserIdResolver, usesDatabaseStorage } from "@/lib/store/shared";

const databaseMode = usesDatabaseStorage();

const authConfig = {
  providers: [GitHub],
  pages: { signIn: "/sign-in" },
  session: { strategy: databaseMode ? "database" : "jwt" },
  callbacks: {
    session({ session, user, token }) {
      const id = user?.id || token?.sub;
      if (session.user && id) session.user.id = id;
      return session;
    },
  },
  ...(databaseMode ? { adapter: createDatabaseAuthAdapter() } : {}),
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// All database stores resolve ownership through the active Auth.js session.
// Filesystem mode still resolves to the isolated local owner in shared.js.
setUserIdResolver(async () => (await auth())?.user?.id || null);
