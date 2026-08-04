export function safeReturnPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export function decideAccess({
  databaseMode,
  pathname,
  search = "",
  authenticated,
}) {
  if (!databaseMode) return { type: "allow" };

  if (pathname.startsWith("/api/auth/")) return { type: "allow" };
  if (pathname === "/api/health") return { type: "allow" };

  if (pathname === "/sign-in") {
    return authenticated
      ? { type: "redirect", location: "/" }
      : { type: "allow" };
  }

  if (authenticated) return { type: "allow" };
  if (pathname.startsWith("/api/")) return { type: "unauthorized" };

  const returnTo = `${pathname}${search}`;
  return {
    type: "redirect",
    location: `/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`,
  };
}
