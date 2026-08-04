import { createHash } from "node:crypto";
import { createSlug } from "../store/shared.js";

export const KEYWORD_TAXONOMY = {
  Skills: {
    "Product design": ["product design"],
    "UX design": ["ux design", "user experience design"],
    "UI design": ["ui design", "user interface design"],
    "User research": ["user research"],
    "Usability testing": ["usability testing", "usability studies"],
    Wireframing: ["wireframing", "wireframes"],
    Prototyping: ["prototyping", "prototypes"],
    "Interaction design": ["interaction design"],
    "Information architecture": ["information architecture"],
    "Visual design": ["visual design"],
    "Responsive design": ["responsive design", "responsive web design"],
    "Design systems": ["design systems", "design system"],
    Accessibility: ["accessibility", "wcag"],
    "Data analysis": ["data analysis"],
    "Product analytics": ["product analytics"],
    "Product management": ["product management"],
    "Project management": ["project management"],
    Agile: ["agile"],
    Scrum: ["scrum"],
    "Frontend development": ["frontend development", "front-end development"],
    "Backend development": ["backend development", "back-end development"],
    "Full-stack development": ["full-stack development", "full stack development"],
    "Content strategy": ["content strategy"],
    SEO: ["seo", "search engine optimization"],
    "Growth marketing": ["growth marketing"],
  },
  Tools: {
    Figma: ["figma"], Framer: ["framer"], Sketch: ["sketch"],
    Illustrator: ["adobe illustrator", "illustrator"], Photoshop: ["adobe photoshop", "photoshop"],
    Notion: ["notion"], Jira: ["jira"], React: ["react.js", "react"],
    "Next.js": ["next.js", "nextjs"], HTML: ["html"], CSS: ["css"],
    JavaScript: ["javascript"], TypeScript: ["typescript"], "Node.js": ["node.js", "nodejs"],
    Python: ["python"], SQL: ["sql"], PostgreSQL: ["postgresql", "postgres"],
    Git: ["git"], GitHub: ["github"], AWS: ["aws", "amazon web services"],
    Azure: ["azure"], GCP: ["gcp", "google cloud"], Docker: ["docker"],
    Kubernetes: ["kubernetes"], Tableau: ["tableau"], "Power BI": ["power bi"],
    Salesforce: ["salesforce"], HubSpot: ["hubspot"], "Google Analytics": ["google analytics"],
    Jest: ["jest"], Cypress: ["cypress"],
  },
  Responsibilities: {
    "Stakeholder management": ["stakeholder management"],
    "Cross-functional collaboration": ["cross-functional collaboration", "cross functional collaboration"],
    "Team leadership": ["team leadership", "lead a team", "leading teams"],
    Mentoring: ["mentoring", "mentor designers", "mentor engineers"],
    "Roadmap planning": ["roadmap planning", "product roadmap"],
    "Product strategy": ["product strategy"],
    "Design-system ownership": ["design-system ownership", "design system ownership", "own the design system"],
    "User interviews": ["user interviews", "customer interviews"],
    "Requirements gathering": ["requirements gathering", "gather requirements"],
    "Experiment design": ["experiment design"],
    "A/B testing": ["a/b testing", "ab testing"],
    "Workshop facilitation": ["workshop facilitation", "facilitate workshops"],
    Presentations: ["presentations", "present to stakeholders"],
    "Code review": ["code review", "code reviews"],
    "Technical architecture": ["technical architecture", "system architecture"],
    "Campaign management": ["campaign management"],
  },
  Seniority: {
    "Entry level": ["entry level", "entry-level"], Junior: ["junior", "jr."],
    Associate: ["associate"], "Mid level": ["mid level", "mid-level"],
    Senior: ["senior", "sr."], Lead: ["lead designer", "lead engineer", "team lead"],
    Staff: ["staff designer", "staff engineer"], Principal: ["principal"],
    Manager: ["design manager", "engineering manager", "product manager"],
    "Head of": ["head of"], Director: ["director"],
  },
  "Soft Skills": {
    Communication: ["communication"], Collaboration: ["collaboration"], Leadership: ["leadership"],
    "Problem solving": ["problem solving", "problem-solving"],
    "Critical thinking": ["critical thinking"], "Attention to detail": ["attention to detail"],
    Adaptability: ["adaptability", "adaptable"], Ownership: ["ownership"],
    "Decision making": ["decision making", "decision-making"], Facilitation: ["facilitation"],
  },
  "Domain Knowledge": {
    "B2B SaaS": ["b2b saas"], SaaS: ["saas"], Fintech: ["fintech"], Banking: ["banking"],
    Healthcare: ["healthcare"], EdTech: ["edtech"], Education: ["education"],
    "E-commerce": ["e-commerce", "ecommerce"], Insurance: ["insurance"],
    "Real estate": ["real estate"], Manufacturing: ["manufacturing"],
    Logistics: ["logistics"], Marketing: ["marketing"], Gaming: ["gaming"], Media: ["media"],
  },
};

const RELATED_EVIDENCE = {
  "Design systems": ["component library", "reusable components", "shared components"],
  "Design-system ownership": ["maintained components", "component documentation", "shared library"],
  "Team leadership": ["mentored", "coached", "led delivery"],
  "Product analytics": ["analytics", "product metrics", "funnel analysis"],
  "Stakeholder management": ["stakeholder collaboration", "presented to stakeholders"],
  "User research": ["user interviews", "customer interviews", "research plan"],
};

const STOP_WORDS = new Set(["a", "an", "and", "of", "the", "to", "for", "in", "on", "with"]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function textValues(record) {
  if (!record || typeof record !== "object") return [];
  return Object.entries(record)
    .filter(([key]) => key !== "sourceType" && key !== "sourceId")
    .flatMap(([, value]) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .map((value) => ({ original: value.trim(), normalized: normalizeText(value) }))
    .filter((value) => value.normalized);
}

function phraseMatch(text, phrase) {
  const match = allPhraseMatches(text, phrase)[0];
  return match ? match.start : -1;
}

function allPhraseMatches(text, phrase) {
  const matches = [];
  let offset = 0;
  while (offset < text.length) {
    const at = text.indexOf(phrase, offset);
    if (at === -1) break;
    if ((at === 0 || text[at - 1] === " ") && (at + phrase.length === text.length || text[at + phrase.length] === " ")) {
      matches.push({ start: at, end: at + phrase.length });
    }
    offset = at + 1;
  }
  return matches;
}

function excerpt(value) {
  return value.length <= 180 ? value : `${value.slice(0, 177).trimEnd()}...`;
}

function evidenceItem(record, matchingValue) {
  return {
    sourceType: String(record.sourceType || "Verified record"),
    sourceId: String(record.sourceId || "verified-record"),
    excerpt: excerpt(matchingValue?.original || "Verified evidence"),
  };
}

function uniqueEvidence(matches) {
  const evidence = [];
  const seen = new Set();
  for (const match of matches) {
    const item = evidenceItem(match.record, match.value);
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!seen.has(key)) {
      seen.add(key);
      evidence.push(item);
    }
    if (evidence.length === 3) break;
  }
  return evidence;
}

const TAXONOMY_ENTRIES = Object.entries(KEYWORD_TAXONOMY).flatMap(([category, terms]) =>
  Object.entries(terms).map(([term, aliases]) => ({
    category,
    term,
    aliases: [...new Set(aliases.map(normalizeText))].sort((left, right) => right.length - left.length || left.localeCompare(right)),
  }))
);

const TERM_BY_NORMALIZED_NAME = new Map(TAXONOMY_ENTRIES.map((entry) => [normalizeText(entry.term), entry]));

function termDefinition(term) {
  const normalizedTerm = normalizeText(term);
  const taxonomyTerm = TERM_BY_NORMALIZED_NAME.get(normalizedTerm);
  return taxonomyTerm || {
    term: String(term ?? "").trim(),
    aliases: normalizedTerm ? [normalizedTerm] : [],
  };
}

function relatedPhrases(term) {
  const mappingKey = Object.keys(RELATED_EVIDENCE).find((key) => normalizeText(key) === normalizeText(term));
  return mappingKey ? RELATED_EVIDENCE[mappingKey].map(normalizeText) : [];
}

function significantTokens(term) {
  return normalizeText(term).split(" ").filter((token) => token && !STOP_WORDS.has(token));
}

function matchRecordPhrases(record, phrases) {
  const values = textValues(record);
  const matches = [];
  for (const value of values) {
    for (const phrase of phrases) {
      if (phraseMatch(value.normalized, phrase) !== -1) {
        matches.push({ record, value, phrase });
        break;
      }
    }
  }
  return matches;
}

function recordContainsAllTokens(record, tokens) {
  const values = textValues(record);
  const normalized = values.map((value) => value.normalized).join(" ");
  return tokens.every((token) => phraseMatch(normalized, token) !== -1);
}

function firstTokenValue(record, tokens) {
  return textValues(record).find((value) => tokens.some((token) => phraseMatch(value.normalized, token) !== -1));
}

export function skillGapId(term) {
  return `skill-gap-${createSlug(term)}`;
}

export function classifyEvidence(term, verifiedCorpus = []) {
  const definition = termDefinition(term);
  const records = Array.isArray(verifiedCorpus) ? verifiedCorpus : [];
  const strongMatches = records.flatMap((record) => matchRecordPhrases(record, definition.aliases));
  if (strongMatches.length) {
    return {
      level: "Strong",
      explanation: `Verified evidence directly mentions ${definition.term}.`,
      evidence: uniqueEvidence(strongMatches),
    };
  }

  const tokens = significantTokens(definition.term);
  const partialMatches = [];
  if (tokens.length > 1) {
    for (const record of records) {
      if (recordContainsAllTokens(record, tokens)) {
        partialMatches.push({ record, value: firstTokenValue(record, tokens) });
      }
    }
  }
  for (const record of records) {
    partialMatches.push(...matchRecordPhrases(record, relatedPhrases(definition.term)));
  }
  if (partialMatches.length) {
    return {
      level: "Partial",
      explanation: `Verified evidence partially supports ${definition.term}.`,
      evidence: uniqueEvidence(partialMatches),
    };
  }

  if (tokens.length > 1) {
    const weakMatches = records
      .filter((record) => textValues(record).some((value) => tokens.some((token) => phraseMatch(value.normalized, token) !== -1)))
      .map((record) => ({ record, value: firstTokenValue(record, tokens) }));
    if (weakMatches.length) {
      return {
        level: "Weak",
        explanation: `Verified evidence mentions part of ${definition.term}.`,
        evidence: uniqueEvidence(weakMatches),
      };
    }
  }

  return {
    level: "None",
    explanation: `No verified evidence supports ${definition.term}.`,
    evidence: [],
  };
}

function verifiedEvidence(masterEntries, achievements) {
  const masterRecords = (Array.isArray(masterEntries) ? masterEntries : [])
    .filter((entry) => entry?.status === "Approved")
    .map((entry, index) => ({
      sourceType: "Master Resume",
      sourceId: String(entry.id || `master-entry-${index + 1}`),
      title: entry.title,
      org: entry.org,
      bullets: entry.bullets,
      skills: entry.skills,
      tags: entry.tags,
      metrics: entry.metrics,
    }));
  const achievementRecords = (Array.isArray(achievements) ? achievements : [])
    .filter((achievement) => typeof achievement?.evidence === "string" && achievement.evidence.trim() !== "")
    .map((achievement, index) => ({
      sourceType: "Achievement",
      sourceId: String(achievement.id || `achievement-${index + 1}`),
      title: achievement.title,
      context: achievement.context,
      action: achievement.action,
      result: achievement.result,
      metric: achievement.metric,
      skills: achievement.skills,
      tags: achievement.tags,
      evidence: achievement.evidence,
      resumeBullet: achievement.resumeBullet,
    }));
  return [...masterRecords, ...achievementRecords];
}

function descriptionMatches(description) {
  const candidates = TAXONOMY_ENTRIES.flatMap((entry) =>
    entry.aliases.flatMap((alias) => allPhraseMatches(description, alias).map((match) => ({
      ...match,
      term: entry.term,
      category: entry.category,
      length: alias.length,
    })))
  ).sort((left, right) => right.length - left.length || left.start - right.start || left.term.localeCompare(right.term));
  const accepted = [];
  for (const candidate of candidates) {
    if (!accepted.some((match) => candidate.start < match.end && candidate.end > match.start)) accepted.push(candidate);
  }
  return new Map(accepted.map((match) => [match.term, match.category]));
}

function uniqueDescriptions(jobs, applicationJobs) {
  const descriptions = new Map();
  let duplicates = 0;
  const savedJobs = Array.isArray(jobs) ? jobs : [];
  const linkedApplicationIds = new Set(savedJobs
    .map((job) => String(job?.applicationId || "").trim())
    .filter(Boolean));
  const unlinkedApplications = (Array.isArray(applicationJobs) ? applicationJobs : [])
    .filter((application) => !linkedApplicationIds.has(String(application?.id || "").trim()));
  for (const job of [...savedJobs, ...unlinkedApplications]) {
    const normalized = normalizeText(job?.jobDescription);
    if (!normalized) continue;
    const hash = createHash("sha256").update(normalized).digest("hex");
    if (descriptions.has(hash)) {
      duplicates += 1;
      continue;
    }
    descriptions.set(hash, {
      description: normalized,
      relatedJob: {
        id: String(job?.id || job?.applicationId || ""),
        company: String(job?.company || ""),
        role: String(job?.role || ""),
      },
    });
  }
  return { descriptions: [...descriptions.values()], duplicates };
}

export function analyzeKeywordTrends({ jobs = [], applicationJobs = [], masterEntries = [], achievements = [] } = {}) {
  const { descriptions, duplicates } = uniqueDescriptions(jobs, applicationJobs);
  const trendMatches = new Map();
  for (const item of descriptions) {
    for (const [term, category] of descriptionMatches(item.description)) {
      if (!trendMatches.has(term)) trendMatches.set(term, { category, relatedJobs: [] });
      trendMatches.get(term).relatedJobs.push(item.relatedJob);
    }
  }

  const corpus = verifiedEvidence(masterEntries, achievements);
  const trends = [...trendMatches.entries()].map(([term, { category, relatedJobs }]) => {
    const evidence = classifyEvidence(term, corpus);
    const count = relatedJobs.length;
    return {
      term,
      slug: createSlug(term),
      category,
      count,
      percentage: descriptions.length ? Math.round((count / descriptions.length) * 100) : 0,
      evidenceLevel: evidence.level,
      evidenceExplanation: evidence.explanation,
      evidence: evidence.evidence,
      relatedJobs,
    };
  }).sort((left, right) => right.count - left.count || left.category.localeCompare(right.category) || left.term.localeCompare(right.term));

  const gaps = trends
    .filter((trend) => trend.evidenceLevel !== "Strong")
    .map((trend) => ({ id: skillGapId(trend.term), skill: trend.term, skillSlug: trend.slug, ...trend }));

  return {
    trends,
    gaps,
    analyzedJobDescriptions: descriptions.length,
    duplicateDescriptions: duplicates,
  };
}
