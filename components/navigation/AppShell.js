"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NavIcon } from "@/components/navigation/navConfig";
import PrivacyModeBadge from "@/components/navigation/PrivacyModeBadge";
import AuthAccount from "@/components/auth/AuthAccount";

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function NavLinks({ pathname, onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
              active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppShell({ children, authEnabled = false }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (pathname === "/sign-in") return children;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 lg:flex print:hidden">
        <div className="mb-5 px-2">
          <div className="text-base font-semibold tracking-tight text-slate-900">Resume Tailor</div>
          <div className="mt-1">
            {authEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Account protected</span>
            ) : <PrivacyModeBadge />}
          </div>
        </div>
        <NavLinks pathname={pathname} />
        <div className="mt-auto px-2 pt-4">
          {authEnabled && <AuthAccount />}
          <div className="mt-3 text-[11px] text-slate-400">Command Center · v1</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900">Resume Tailor</span>
          {authEnabled ? <AuthAccount compact /> : <PrivacyModeBadge />}
        </div>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            <div className="absolute left-0 top-0 h-full w-64 border-r border-slate-200 bg-white px-3 py-4 shadow-xl">
              <div className="mb-5 flex items-center justify-between px-2">
                <span className="text-base font-semibold text-slate-900">Resume Tailor</span>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
                </button>
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
              {authEnabled && <div className="mt-6 px-2"><AuthAccount /></div>}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
