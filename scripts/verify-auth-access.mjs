import { readFile } from "node:fs/promises";
import { decideAccess, safeReturnPath } from "../lib/auth/access.js";

let pass = 0;
let fail = 0;
const check = (name, condition, extra = "") => {
  if (condition) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ""}`);
  }
};

{
  check(
    "filesystem mode does not require sign-in",
    decideAccess({ databaseMode: false, pathname: "/dashboard", authenticated: false }).type === "allow"
  );

  check(
    "Auth.js callback routes remain public",
    decideAccess({ databaseMode: true, pathname: "/api/auth/callback/github", authenticated: false }).type === "allow"
  );

  check(
    "deployment health checks remain public",
    decideAccess({ databaseMode: true, pathname: "/api/health", authenticated: false }).type === "allow"
  );

  const api = decideAccess({ databaseMode: true, pathname: "/api/applications", authenticated: false });
  check("signed-out database API requests receive 401", api.type === "unauthorized");

  const proxySource = await readFile(new URL("../proxy.js", import.meta.url), "utf8");
  check(
    "proxy database API 401 wiring is not cached",
    /if \(decision\.type === "unauthorized"\) \{\s*return NextResponse\.json\([\s\S]*?\{ status: 401, headers: \{ "Cache-Control": "no-store" \} \}\s*\);/.test(
      proxySource
    )
  );

  const page = decideAccess({
    databaseMode: true,
    pathname: "/dashboard/application/app-1",
    search: "?tab=files",
    authenticated: false,
  });
  check(
    "signed-out pages redirect to sign-in with their return URL",
    page.type === "redirect" &&
      page.location === "/sign-in?callbackUrl=%2Fdashboard%2Fapplication%2Fapp-1%3Ftab%3Dfiles",
    JSON.stringify(page)
  );

  check(
    "authenticated users can access private pages",
    decideAccess({ databaseMode: true, pathname: "/dashboard", authenticated: true }).type === "allow"
  );

  const signedInSignInPage = decideAccess({
    databaseMode: true,
    pathname: "/sign-in",
    authenticated: true,
  });
  check(
    "signed-in users leave the sign-in page",
    signedInSignInPage.type === "redirect" && signedInSignInPage.location === "/"
  );
}

{
  check("internal return URLs are preserved", safeReturnPath("/dashboard?view=kanban") === "/dashboard?view=kanban");
  check("absolute external return URLs are rejected", safeReturnPath("https://evil.example") === "/");
  check("protocol-relative return URLs are rejected", safeReturnPath("//evil.example/path") === "/");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
