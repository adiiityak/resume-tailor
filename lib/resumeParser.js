const SECTION_HEADER = /^[A-Z][A-Z0-9 &/'()-]{2,}$/;
const BULLET = /^\s*([-•*◦]|\d+[.)])\s+/;

const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
const YEAR = "(?:19|20)\\d{2}";
const DATE_POINT = `(?:${MONTH}\\s+)?${YEAR}`;
const DATE_RANGE = `\\(?${DATE_POINT}\\s*[–—-]\\s*(?:Present|Current|Now|${DATE_POINT})\\)?`;
const DATE_END = new RegExp(`[\\s,|]*((?:${DATE_RANGE})|\\(?${DATE_POINT}\\)?)$`, "i");

export function isSectionHeader(line) {
  return SECTION_HEADER.test(line);
}

// Parses ATS-style plain text into { name, contact[], sections: [{ title, items }] }.
// Item kinds: entry (left + right-aligned date), sub (line following an entry), bullet, text.
export function parseResume(text) {
  const rawLines = text.split("\n").map((l) => l.replace(/\s+$/, ""));

  let i = 0;
  while (i < rawLines.length && !rawLines[i].trim()) i++;

  const name = rawLines[i]?.trim() || "";
  i++;

  const contact = [];
  while (i < rawLines.length) {
    const t = rawLines[i].trim();
    if (!t) {
      i++;
      break;
    }
    if (SECTION_HEADER.test(t)) break;
    contact.push(t);
    i++;
  }

  const sections = [];
  let current = null;
  let lastKind = null;

  for (; i < rawLines.length; i++) {
    const t = rawLines[i].trim();

    if (!t) {
      lastKind = null;
      continue;
    }

    if (SECTION_HEADER.test(t)) {
      current = { title: t, items: [] };
      sections.push(current);
      lastKind = null;
      continue;
    }

    if (!current) {
      current = { title: null, items: [] };
      sections.push(current);
    }

    if (BULLET.test(t)) {
      current.items.push({ kind: "bullet", text: t.replace(BULLET, "") });
      lastKind = "bullet";
      continue;
    }

    const m = t.match(DATE_END);
    if (m && m.index > 0) {
      const left = t.slice(0, m.index).replace(/[,\s|]+$/, "");
      if (left) {
        current.items.push({ kind: "entry", left, right: m[1].trim() });
        lastKind = "entry";
        continue;
      }
    }

    if (lastKind === "entry") {
      current.items.push({ kind: "sub", text: t });
      lastKind = "sub";
      continue;
    }

    current.items.push({ kind: "text", text: t });
    lastKind = "text";
  }

  return { name, contact, sections };
}
