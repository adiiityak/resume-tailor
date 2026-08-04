import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { decideAccess } from "@/lib/auth/access";
import { usesDatabaseStorage } from "@/lib/store/shared";

const authenticatedProxy = auth((request) => {
  const decision = decideAccess({
    databaseMode: true,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    authenticated: Boolean(request.auth?.user?.id),
  });

  if (decision.type === "unauthorized") {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.location, request.url));
  }

  return NextResponse.next();
});

export function proxy(request) {
  // Local filesystem mode stays offline and single-user with no login wall.
  if (!usesDatabaseStorage()) return NextResponse.next();
  return authenticatedProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf)$).*)",
  ],
};
