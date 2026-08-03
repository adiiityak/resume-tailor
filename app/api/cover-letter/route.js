import { callClaudeTool } from "@/lib/anthropic";

const SYSTEM_PROMPT = `You write cover letters for job applicants, strictly grounded in the candidate's real resume.

Hard rules:
- Never invent employers, titles, dates, achievements, metrics, or skills the candidate's resume does not support.
- Reference 2-3 specific, real details from the candidate's resume that genuinely match what the job description asks for.
- If you can identify a job title and/or company name in the job description, address the letter to that role/company; otherwise use "the [role type]" and "your team" naturally, without inventing a company name.
- Write in a natural, specific, first-person voice. Avoid generic filler phrases that read as AI-written ("results-driven professional", "proven track record", "passionate about leveraging synergies", "I am writing to express my interest"). Open with something concrete instead.
- Keep it to 3-4 short paragraphs, under 350 words total.
- Do not restate the entire resume — pick the most relevant details only.
- Sign off with the candidate's real name as found in the resume (or "[Your Name]" if none is present).

You must respond by calling the write_cover_letter tool exactly once with your full result.`;

const TOOL = {
  name: "write_cover_letter",
  description: "Return a tailored cover letter grounded in the candidate's real resume.",
  input_schema: {
    type: "object",
    properties: {
      coverLetter: {
        type: "string",
        description: "The full cover letter as plain text, ready to send.",
      },
      notes: {
        type: "string",
        description: "Brief, honest notes: any real experience the candidate could add more detail on for this role.",
      },
    },
    required: ["coverLetter", "notes"],
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
      userContent: `CANDIDATE'S RESUME:\n---\n${resume}\n---\n\nJOB DESCRIPTION:\n---\n${jobDescription}\n---`,
    });
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: err?.message || "Failed to reach Claude API." }, { status: err?.status || 502 });
  }
}
