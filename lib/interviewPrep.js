import { extractKeywords } from "@/lib/localTailor";

export const QUESTION_CATEGORIES = [
  "Recruiter Screen",
  "Experience",
  "Role-Specific",
  "Behavioural",
  "Gap Questions",
];

export const CONFIDENCE_LEVELS = ["Not Practised", "Needs Work", "Comfortable", "Strong"];

const BEHAVIOURAL = [
  "Tell me about a time you had to handle competing priorities. What did you do?",
  "Describe a situation where you disagreed with a teammate. How did you resolve it?",
  "Walk me through a project you're most proud of and your specific role in it.",
  "Tell me about a time something you built didn't go as planned. What did you learn?",
  "Describe a time you had to learn something new quickly to deliver.",
];

const RECRUITER = [
  "Walk me through your background in a couple of minutes.",
  "What interests you about this role specifically?",
  "What are you looking for in your next role?",
  "What's your notice period / availability?",
];

function contains(resumeLower, kw) {
  return resumeLower.includes(kw.toLowerCase());
}

// Generates categorized interview questions grounded in the real job description
// and resume. Gap questions come from missing evidence and are framed honestly —
// no fabricated answers are ever produced.
export function generateInterviewQuestions(resume, jobDescription, matchReport) {
  const keywords = extractKeywords(jobDescription || "");
  const resumeLower = (resume || "").toLowerCase();

  const matched = (matchReport?.matchedKeywords && matchReport.matchedKeywords.length
    ? matchReport.matchedKeywords
    : keywords.filter((k) => contains(resumeLower, k))).slice(0, 6);
  const missing = (matchReport?.missingKeywords && matchReport.missingKeywords.length
    ? matchReport.missingKeywords
    : keywords.filter((k) => !contains(resumeLower, k))).slice(0, 6);

  let n = 0;
  const q = (category, text) => ({ id: `q-${++n}`, category, text });
  const questions = [];

  RECRUITER.forEach((t) => questions.push(q("Recruiter Screen", t)));

  matched.forEach((kw) =>
    questions.push(q("Experience", `Tell me about your hands-on experience with ${kw}. Can you give a concrete example?`))
  );

  const roleLine = (jobDescription || "").split("\n").map((l) => l.trim()).find(Boolean);
  if (roleLine) questions.push(q("Role-Specific", `This role emphasizes: “${roleLine.slice(0, 120)}”. How does your experience map to that?`));
  keywords.slice(0, 3).forEach((kw) =>
    questions.push(q("Role-Specific", `How would you approach a problem in this role that requires ${kw}?`))
  );

  BEHAVIOURAL.forEach((t) => questions.push(q("Behavioural", t)));

  missing.forEach((kw) =>
    questions.push(q("Gap Questions", `The role asks for ${kw}, which isn't prominent in your resume. How would you honestly describe your exposure to it?`))
  );

  return questions;
}

// Thoughtful, role-specific questions the candidate can ask — built from the JD,
// avoiding generic "what does your company do" filler.
export function generateQuestionsToAsk(jobDescription) {
  const keywords = extractKeywords(jobDescription || "");
  let n = 0;
  const q = (text) => ({ id: `ask-${++n}`, text });
  const out = [
    q("What does success in this role look like in the first 90 days?"),
    q("How is this team structured, and who would I collaborate with most closely?"),
    q("What does the design/engineering process look like day to day?"),
    q("What are the biggest challenges the person in this role will tackle first?"),
  ];
  if (keywords[0]) out.push(q(`The role mentions ${keywords[0]} — how is ownership of that split across teams today?`));
  if (keywords[1]) out.push(q(`How does the team currently approach ${keywords[1]}?`));
  return out;
}

export const ROUND_TYPES = [
  "Recruiter Screen",
  "Hiring Manager",
  "Portfolio Review",
  "Technical Round",
  "Case Study",
  "Panel Interview",
  "Leadership Round",
  "Culture Fit",
  "Final Round",
];
