// Wraps fetch so a non-JSON response (e.g. a Next.js HTML error page during a
// crash or recompile) surfaces a readable message instead of
// "Unexpected token '<', "<!DOCTYPE"... is not valid JSON".
//
// Returns { ok, status, data, error }.
export async function fetchJson(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    return { ok: false, status: 0, data: null, error: `Couldn't reach the server (${err.message}). Is the dev server still running?` };
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const data = await res.json();
      if (!res.ok) return { ok: false, status: res.status, data, error: data?.error || `Request failed (${res.status}).` };
      return { ok: true, status: res.status, data, error: null };
    } catch {
      return { ok: false, status: res.status, data: null, error: `The server sent a malformed response (${res.status}).` };
    }
  }

  // Non-JSON: almost always an HTML error page. Report the status plainly.
  const text = await res.text().catch(() => "");
  const looksLikeHtml = /^\s*<(!doctype|html)/i.test(text);
  let error;
  if (looksLikeHtml) {
    error = res.ok
      ? "The server returned a web page instead of data. If the dev server was recompiling, wait a moment and try again."
      : `The server hit an error (${res.status}) instead of returning data. If the dev server was recompiling, wait a moment and try again — otherwise check the terminal for the stack trace.`;
  } else {
    error = `Unexpected response (${res.status}): ${text.slice(0, 120) || "empty body"}`;
  }
  return { ok: false, status: res.status, data: null, error };
}
