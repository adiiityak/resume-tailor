const STOPWORDS = new Set(
  (
    "a about above after again against all am an and any are aren't as at be because been before being below " +
    "between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for " +
    "from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself " +
    "his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no " +
    "nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's " +
    "should shouldn't so some such than that that's the their theirs them themselves then there there's these they " +
    "they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're " +
    "we've were weren't what what's when when's where where's which while who who's whom why why's with won't would " +
    "wouldn't you you'd you'll you're you've your yours yourself yourselves " +
    "experience years year ability strong working knowledge skills skill team teams work include including preferred " +
    "required requirement requirements qualification qualifications responsibilities responsibility role candidate " +
    "candidates company join looking plus etc using use used new across provide providing ensure ensuring help " +
    "helping must should will able excellent good great highly high level levels related similar various other " +
    "others opportunity opportunities we you your our us also within across per day time full part job description " +
    "position apply application benefits environment fast paced growing"
  ).split(/\s+/)
);

const SKILL_DICTIONARY = [
  "node.js", "javascript", "typescript", "python", "java", "c++", "c#", "go", "golang", "ruby", "php", "swift",
  "kotlin", "react", "react.js", "angular", "vue", "next.js", "redux", "html", "css", "sass", "tailwind",
  "rest api", "graphql", "microservices", "grpc", "websocket",
  "aws", "azure", "gcp", "google cloud", "cloud computing", "terraform", "kubernetes", "docker", "ci/cd",
  "jenkins", "git", "github", "gitlab", "linux",
  "sql", "nosql", "mongodb", "postgresql", "mysql", "redis", "kafka", "elasticsearch", "data warehouse",
  "etl", "spark", "hadoop", "airflow",
  "machine learning", "deep learning", "nlp", "data science", "data analysis", "pandas", "tensorflow", "pytorch",
  "agile", "scrum", "kanban", "jira", "project management", "product management", "stakeholder management",
  "unit testing", "integration testing", "test automation", "selenium", "jest", "cypress", "qa",
  "seo", "sem", "google ads", "ppc", "content marketing", "email marketing", "social media marketing",
  "growth marketing", "marketing automation", "hubspot", "salesforce", "crm", "google analytics",
  "leadership", "communication", "cross-functional", "mentoring", "budgeting", "forecasting",
  "excel", "power bi", "tableau", "figma", "ux design", "ui design", "wireframing",
  "security", "compliance", "gdpr", "soc 2", "penetration testing", "incident response",
  "sales", "account management", "customer success", "negotiation", "b2b", "b2c", "saas",
];

function tokenizeWords(text) {
  return text.match(/[A-Za-z][A-Za-z0-9+.#/-]{1,}/g) || [];
}

export function isBulletLine(line) {
  return /^\s*([-•*◦]|\d+[.)])\s+/.test(line);
}

function countOccurrences(haystackLower, needleLower) {
  if (!needleLower) return 0;
  let count = 0;
  let idx = haystackLower.indexOf(needleLower);
  while (idx !== -1) {
    count += 1;
    idx = haystackLower.indexOf(needleLower, idx + needleLower.length);
  }
  return count;
}

export function extractKeywords(jobDescription) {
  const jdLower = jobDescription.toLowerCase();

  const dictionaryHits = SKILL_DICTIONARY
    .map((term) => ({ term, count: countOccurrences(jdLower, term.toLowerCase()) }))
    .filter((hit) => hit.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((hit) => hit.term);

  const dictionarySet = new Set(dictionaryHits.map((t) => t.toLowerCase()));

  const freq = new Map();
  for (const raw of tokenizeWords(jobDescription)) {
    const word = raw.toLowerCase();
    if (word.length < 3) continue;
    if (STOPWORDS.has(word)) continue;
    if ([...dictionarySet].some((term) => term.includes(word))) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  const frequencyExtras = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return [...dictionaryHits, ...frequencyExtras].slice(0, 24);
}

function reorderBulletsByRelevance(resumeText, keywordsLower) {
  const blocks = resumeText.split(/\n\s*\n/);

  const scoredBlocks = blocks.map((block) => {
    const lines = block.split("\n");
    const headerLines = [];
    let i = 0;
    while (i < lines.length && !isBulletLine(lines[i])) {
      headerLines.push(lines[i]);
      i += 1;
    }
    const bulletLines = lines.slice(i);
    if (bulletLines.length === 0) return block;

    const scored = bulletLines.map((line) => {
      const lineLower = line.toLowerCase();
      const score = keywordsLower.reduce((acc, kw) => (lineLower.includes(kw) ? acc + 1 : acc), 0);
      return { line, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return [...headerLines, ...scored.map((s) => s.line)].join("\n");
  });

  return scoredBlocks.join("\n\n");
}

export function tailorLocally(resume, jobDescription) {
  const keywords = extractKeywords(jobDescription);
  const resumeLower = resume.toLowerCase();

  const matchedKeywords = keywords.filter((kw) => resumeLower.includes(kw.toLowerCase()));
  const missingKeywords = keywords.filter((kw) => !resumeLower.includes(kw.toLowerCase()));

  const matchScore = keywords.length === 0 ? 0 : Math.round((matchedKeywords.length / keywords.length) * 100);

  const tailoredResume = reorderBulletsByRelevance(
    resume,
    keywords.map((k) => k.toLowerCase())
  );

  const notes =
    keywords.length === 0
      ? "Couldn't detect clear keywords in this job description — try pasting the full posting including the requirements/qualifications section."
      : missingKeywords.length === 0
        ? "Your resume already covers every keyword detected in the job description. Bullets have been reordered to put the most relevant ones first."
        : `Detected ${keywords.length} likely keywords from the job description. Your resume already covers ${matchedKeywords.length} of them — bullets were reordered to surface those first. Consider adding real, truthful detail about: ${missingKeywords.slice(0, 6).join(", ")}${missingKeywords.length > 6 ? ", ..." : ""} if you actually have that experience.`;

  return { tailoredResume, matchScore, matchedKeywords, missingKeywords, notes };
}
