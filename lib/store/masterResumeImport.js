import { parseResume } from "@/lib/resumeParser";

// Pure parsing shared by both storage drivers: turns a pasted resume into contact
// details, a summary, and draft entries. Extracts verbatim — never invents content.
// Callers assign ids and set each entry's review status.

const SECTION_MAP = [
  { re: /SUMMARY|PROFILE|OBJECTIVE/i, kind: "summary" },
  { re: /EXPERIENCE|EMPLOYMENT|WORK/i, section: "Experience" },
  { re: /PROJECT/i, section: "Projects" },
  { re: /EDUCATION/i, section: "Education" },
  { re: /SKILL|TOOL|TECH/i, section: "Skills" },
  { re: /CERTIF|LICENSE/i, section: "Certifications" },
  { re: /AWARD|HONOR|ACHIEVE/i, section: "Awards" },
];

function sectionFor(title) {
  return SECTION_MAP.find((x) => x.re.test(title || "")) || null;
}

export function extractMasterFromResume(resumeText) {
  const parsed = parseResume(resumeText);

  const contactBlob = parsed.contact.join(" ");
  const contact = {
    name: parsed.name || "",
    email: contactBlob.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] || "",
    phone: (contactBlob.match(/\+?\d[\d ()-]{7,}\d/)?.[0] || "").trim(),
    linkedin: contactBlob.match(/linkedin\.com\/[^\s|]+/i)?.[0] || "",
  };

  let summary = "";
  const entries = [];

  for (const sec of parsed.sections) {
    const map = sectionFor(sec.title);
    if (!map) continue;

    if (map.kind === "summary") {
      summary = sec.items.map((i) => i.text || "").filter(Boolean).join(" ");
      continue;
    }

    if (map.section === "Skills") {
      const bullets = sec.items.map((i) => i.text || "").filter(Boolean);
      if (bullets.length) entries.push({ section: "Skills", title: "Skills", org: "", dates: "", bullets });
      continue;
    }

    let current = null;
    for (const item of sec.items) {
      if (item.kind === "entry") {
        current = { section: map.section, title: "", org: item.left, dates: item.right, bullets: [] };
        entries.push(current);
      } else if (item.kind === "sub") {
        if (current && !current.title) current.title = item.text;
        else {
          current = { section: map.section, title: item.text, org: "", dates: "", bullets: [] };
          entries.push(current);
        }
      } else if (item.kind === "bullet") {
        if (!current) {
          current = { section: map.section, title: "", org: "", dates: "", bullets: [] };
          entries.push(current);
        }
        current.bullets.push(item.text);
      } else if (item.kind === "text") {
        current = { section: map.section, title: item.text, org: "", dates: "", bullets: [] };
        entries.push(current);
      }
    }
  }

  return { contact, summary, entries };
}
