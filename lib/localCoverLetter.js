import { extractKeywords, isBulletLine } from "@/lib/localTailor";

function guessCandidateName(resume) {
  const firstLine = resume.split("\n").map((l) => l.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 60 && !/[.:]$/.test(firstLine)) {
    return firstLine;
  }
  return "[Your Name]";
}

function stripCompanySuffix(title, company) {
  if (!company) return title;
  const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title.replace(new RegExp(`\\s+at\\s+${escaped}$`, "i"), "").trim() || title;
}

export function guessJobTitle(jobDescription, company) {
  const labelMatch = jobDescription.match(/\b(?:job title|position|role)\s*[:\-]\s*(.+)/i);
  if (labelMatch) return stripCompanySuffix(labelMatch[1].trim().split("\n")[0].slice(0, 60), company);

  const firstLine = jobDescription.split("\n").map((l) => l.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 60 && !/[.]$/.test(firstLine)) {
    return stripCompanySuffix(firstLine, company);
  }
  return "this role";
}

export function guessCompanyName(jobDescription) {
  const match = jobDescription.match(/\b(?:at|join)[ \t]+([A-Z][A-Za-z0-9&.,'-]*(?:[ \t]+[A-Z][A-Za-z0-9&.,'-]*){0,3})(?=[\n.,]|$)/);
  return match ? match[1].trim() : null;
}

function topBullets(resume, keywordsLower, limit) {
  const scored = resume
    .split("\n")
    .filter((line) => isBulletLine(line))
    .map((line) => {
      const text = line.replace(/^\s*([-•*◦]|\d+[.)])\s*/, "").trim();
      const lineLower = text.toLowerCase();
      const score = keywordsLower.reduce((acc, kw) => (lineLower.includes(kw) ? acc + 1 : acc), 0);
      return { text, score };
    })
    .filter((b) => b.text.length > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((b) => b.text);
}

export function generateCoverLetterLocally(resume, jobDescription) {
  const keywords = extractKeywords(jobDescription);
  const keywordsLower = keywords.map((k) => k.toLowerCase());

  const name = guessCandidateName(resume);
  const company = guessCompanyName(jobDescription);
  const jobTitle = guessJobTitle(jobDescription, company);
  const highlights = topBullets(resume, keywordsLower, 3);

  const greeting = "Dear Hiring Manager,";

  const opening = company
    ? `I'm writing to apply for ${jobTitle} at ${company}.`
    : `I'm writing to apply for ${jobTitle}.`;

  const highlightSentences = highlights.length
    ? highlights.map((h) => `- ${h}`).join("\n")
    : "- (No resume bullets closely matched this job description's key terms — consider adding more relevant detail to your resume before using this letter.)";

  const body =
    `Relevant to what you're looking for, here's directly from my background:\n\n${highlightSentences}`;

  const closing = company
    ? `I'd welcome the chance to talk about how this experience could contribute to ${company}. Thank you for your time and consideration.`
    : `I'd welcome the chance to talk about how this experience fits the role. Thank you for your time and consideration.`;

  const coverLetter = `${greeting}\n\n${opening}\n\n${body}\n\n${closing}\n\nSincerely,\n${name}`;

  const notes =
    "This is a mechanically assembled template using your resume's own bullet points — it has not been rewritten into flowing prose. Switch to Claude API mode for a genuinely written letter, or edit this one by hand before sending.";

  return { coverLetter, notes };
}
