"use client";

import { signOut, useSession } from "next-auth/react";

export default function AuthAccount({ compact = false }) {
  const { data: session, status } = useSession();
  const user = session?.user;

  if (status === "loading") {
    return <div className={compact ? "h-11 w-11 animate-pulse rounded-full bg-slate-100" : "h-8 w-full animate-pulse rounded-lg bg-slate-100"} aria-label="Loading account" />;
  }

  if (!user) return null;

  const label = user.name || user.email || "Signed in";
  const initial = label.trim().charAt(0).toUpperCase() || "U";

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/sign-in" })}
        title={`${label} — sign out`}
        aria-label={`Sign out ${label}`}
        className="grid min-h-11 min-w-11 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
      >
        {initial}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white" aria-hidden="true">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-slate-800">{label}</div>
          <div className="text-[11px] text-slate-500">Private workspace</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/sign-in" })}
        className="mt-2 flex min-h-11 w-full items-center rounded-md px-2 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        Sign out
      </button>
    </div>
  );
}
