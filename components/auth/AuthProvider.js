"use client";

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({ enabled, children }) {
  return enabled ? <SessionProvider>{children}</SessionProvider> : children;
}
