import { callClaudeTool } from "@/lib/anthropic";

const SYSTEM_PROMPT = `You are a resume-tailoring assistant. You rewrite a candidate's resume so it better matches a specific job description, while staying strictly truthful to the candidate's actual background.

Hard rules:
- Never invent employers, job titles, dates, degrees, certifications, or skills the candidate did not provide.
- You MAY rephrase, reorder, and emphasize the candidate's real bullet points to surface relevance to the job description, and mirror the job description's terminology where the candidate's real experience genuinely supports it.
- If the job description requires something the resume gives no evidence of, do not fabricate it — instead surface it as a missing keyword/gap in your analysis, and only mention it in tailoredResume if the candidate's existing resume already implies it.
- Output must be ATS-safe plain text: standard section headers in ALL CAPS (SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS, etc.), no tables, no columns, no special characters/icons, no text boxes. Use simple hyphen bullets ("- ").
- Preserve the candidate's real contact info, company names, titles, and dates exactly as given.
- Write in the candidate's voice with specific, concrete details from their real resume — avoid generic filler phrases ("results-driven professional", "proven track record", "synergy") that read as generic AI-written text.

You must respond by calling the tailor_resume tool exactly once with your full result.`;

const TOOL = {
  name: "tailor_resume",
  description: "Return the tailored resume text and a keyword match analysis against the job description.",
  input_schema: {
    type: "object",
    properties: {
      tailoredResume: {
        type: "string",
        description: "Full tailored resume as ATS-safe plain text with ALL CAPS section headers and hyphen bullets.",
      },
      matchScore: {
        type: "number",
        description: "Estimated 0-100 keyword/skill match score between the tailored resume and the job description.",
      },
      matchedKeywords: {
        type: "array",
        items: { type: "string" },
        description: "Key skills/terms from the job description that are genuinely present in the candidate's resume.",
      },
      missingKeywords: {
        type: "array",
        items: { type: "string" },
        description: "Key skills/terms the job description asks for that the candidate's resume gives no evidence of.",
      },
      notes: {
        type: "string",
        description: "Brief, honest notes for the candidate: gaps to address, or real experience they could add detail on.",
      },
    },
    required: ["tailoredResume", "matchScore", "matchedKeywords", "missingKeywords", "notes"],
  },
};

export async function POST(request) {
  const { resume, jobDescription } = await request.json();

  if (!resume?.trim() || !jobDescription?.trim()) {
    return Response.json({ error: "Both resume and job description are required." }, { status: 400 });
  }

  try {
    const result = await callClaudeTool({
      system: SYSTEM_PROMPT,
      tool: TOOL,
      userContent: `CANDIDATE'S CURRENT RESUME:\n---\n${resume}\n---\n\nJOB DESCRIPTION TO TAILOR FOR:\n---\n${jobDescription}\n---`,
    });
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: err?.message || "Failed to reach Claude API." }, { status: err?.status || 502 });
  }
}
