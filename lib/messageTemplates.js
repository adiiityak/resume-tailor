// Client-safe message drafting. Builds outreach/follow-up drafts strictly from
// real application + contact data. Anything unknown is left as an explicit
// [PLACEHOLDER] for the user to fill — never invented, never assumed.

export const MESSAGE_TYPES = [
  { key: "recruiter_outreach", label: "Recruiter Outreach" },
  { key: "referral_request", label: "Referral Request" },
  { key: "application_follow_up", label: "Application Follow-Up" },
  { key: "linkedin_note", label: "LinkedIn Connection Note" },
  { key: "interview_confirmation", label: "Interview Confirmation" },
  { key: "interview_thank_you", label: "Interview Thank-You" },
  { key: "assessment_submission", label: "Assessment Submission" },
  { key: "offer_clarification", label: "Offer Clarification" },
  { key: "rejection_response", label: "Rejection Response" },
  { key: "withdrawal", label: "Withdrawal Message" },
];

function firstName(name) {
  const n = (name || "").trim();
  if (!n) return "[Their name]";
  return n.split(/\s+/)[0];
}

function greeting(contact) {
  return `Hi ${firstName(contact?.name)},`;
}

function signOff(candidateName) {
  return `Best regards,\n${candidateName || "[Your name]"}`;
}

// Pull up to `n` real, relevant bullets from the tailored resume for evidence.
function evidenceBullets(app, n = 2) {
  const text = app?.tailoredResume || app?.originalResume || "";
  const bullets = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-•*]\s+/.test(l))
    .map((l) => l.replace(/^[-•*]\s+/, ""));

  const matched = (app?.matchReport?.matchedKeywords || []).map((k) => k.toLowerCase());
  const scored = bullets.map((b) => ({
    b,
    score: matched.reduce((acc, k) => (b.toLowerCase().includes(k) ? acc + 1 : acc), 0),
  }));
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, n).filter((s) => s.b).map((s) => s.b);
}

function bulletBlock(app) {
  const items = evidenceBullets(app, 2);
  if (items.length === 0) return "";
  return `\n\n${items.map((b) => `- ${b}`).join("\n")}`;
}

function appliedWhen(app) {
  if (app?.submittedAt) return new Date(app.submittedAt).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  if (app?.applicationDate) return new Date(app.applicationDate).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return "[date you applied]";
}

const BUILDERS = {
  recruiter_outreach: (app, contact, name) => ({
    subject: `${app.role} at ${app.company} — quick introduction`,
    body: `${greeting(contact)}

I'm reaching out about the ${app.role} role at ${app.company}. I've applied, and I wanted to introduce myself directly.

Relevant to what the role asks for, from my background:${bulletBlock(app)}

If it would help, I'm happy to share more detail or answer questions. Thanks for your time.

${signOff(name)}`,
  }),

  referral_request: (app, contact, name) => ({
    subject: `Referral for ${app.role} at ${app.company}?`,
    body: `${greeting(contact)}

I'm applying for the ${app.role} role at ${app.company} and I saw you're at the company. Would you be open to referring me, or pointing me to the right person?

A quick summary of relevant experience:${bulletBlock(app)}

No pressure at all if it isn't a fit — I appreciate you considering it either way.

${signOff(name)}`,
  }),

  application_follow_up: (app, contact, name) => ({
    subject: `Following up — ${app.role} application`,
    body: `${greeting(contact)}

I applied for the ${app.role} role at ${app.company} on ${appliedWhen(app)} and wanted to follow up to confirm my application was received.

I remain very interested in the role. If there's anything else useful for your review, I'm glad to send it along.

${signOff(name)}`,
  }),

  linkedin_note: (app, contact, name) => ({
    subject: "",
    body: `${greeting(contact)} I'm applying for the ${app.role} role at ${app.company} and would love to connect. Happy to share more about my background if useful. — ${name || "[Your name]"}`,
  }),

  interview_confirmation: (app, contact, name) => ({
    subject: `Confirming interview — ${app.role}`,
    body: `${greeting(contact)}

Thank you for the invitation to interview for the ${app.role} role at ${app.company}. I'm confirming [day, date] at [time, timezone].

Please let me know if anything changes, or if there's anything you'd like me to prepare in advance.

${signOff(name)}`,
  }),

  interview_thank_you: (app, contact, name) => ({
    subject: `Thank you — ${app.role} interview`,
    body: `${greeting(contact)}

Thank you for taking the time to speak with me about the ${app.role} role at ${app.company}. I especially enjoyed discussing [specific topic from the conversation].

Our conversation reinforced my interest in the role. If any follow-up detail would be helpful, just let me know.

${signOff(name)}`,
  }),

  assessment_submission: (app, contact, name) => ({
    subject: `Assessment submission — ${app.role}`,
    body: `${greeting(contact)}

I've submitted the assessment for the ${app.role} role at ${app.company}. [Add where it was submitted or attach the file.]

A short note on my approach: [briefly describe what you actually did].

Happy to walk through my reasoning if that's useful.

${signOff(name)}`,
  }),

  offer_clarification: (app, contact, name) => ({
    subject: `Questions about the ${app.role} offer`,
    body: `${greeting(contact)}

Thank you for the offer for the ${app.role} role at ${app.company} — I'm genuinely glad to receive it.

Before I decide, I'd appreciate clarity on a few points:
- [Question 1]
- [Question 2]

Could we find a time to discuss, or would email be easier?

${signOff(name)}`,
  }),

  rejection_response: (app, contact, name) => ({
    subject: `Thank you — ${app.role}`,
    body: `${greeting(contact)}

Thank you for letting me know about the ${app.role} role at ${app.company}. I appreciate you taking the time to consider my application and to close the loop.

If you're open to it, I'd welcome any brief feedback that could help me going forward. I'd also be glad to stay in touch about future roles.

${signOff(name)}`,
  }),

  withdrawal: (app, contact, name) => ({
    subject: `Withdrawing from consideration — ${app.role}`,
    body: `${greeting(contact)}

I'm writing to withdraw my application for the ${app.role} role at ${app.company}. [Optional: brief reason.]

Thank you for the time you and the team invested in the process. I hope our paths cross again.

${signOff(name)}`,
  }),
};

export function buildMessage(type, app, contact, candidateName) {
  const builder = BUILDERS[type] || BUILDERS.application_follow_up;
  return builder(app || {}, contact || null, candidateName);
}

export function messageTypeLabel(key) {
  return MESSAGE_TYPES.find((t) => t.key === key)?.label || key;
}
