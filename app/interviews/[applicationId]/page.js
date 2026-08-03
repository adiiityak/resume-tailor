"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import EmptyState from "@/components/dashboard/EmptyState";
import StarAnswerBuilder from "@/components/interviews/StarAnswerBuilder";
import {
  generateInterviewQuestions, generateQuestionsToAsk, QUESTION_CATEGORIES, ROUND_TYPES,
} from "@/lib/interviewPrep";
import { formatDateShort } from "@/lib/dashboardShared";

const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const btnGhost = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50";

const CATEGORY_STYLES = {
  "Recruiter Screen": "bg-slate-100 text-slate-600",
  Experience: "bg-blue-50 text-blue-700",
  "Role-Specific": "bg-violet-50 text-violet-700",
  Behavioural: "bg-teal-50 text-teal-700",
  "Gap Questions": "bg-amber-50 text-amber-700",
};

export default function InterviewDetailPage() {
  const { applicationId } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState([]);
  const [toAsk, setToAsk] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [tab, setTab] = useState("questions");

  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");

  const [round, setRound] = useState({ name: "", type: "Recruiter Screen", date: "", format: "", outcome: "", notes: "" });

  const load = useCallback(async () => {
    try {
      const [aRes, iRes] = await Promise.all([
        fetch(`/api/applications/${encodeURIComponent(applicationId)}?full=1`),
        fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview`),
      ]);
      const a = await aRes.json();
      if (!aRes.ok) { setError(a.error || "Application not found."); return; }
      setApp(a);
      if (iRes.ok) {
        const i = await iRes.json();
        setQuestions(i.questions || []);
        setToAsk(i.questionsToAsk || []);
        setRounds(i.rounds || []);
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId]);
  useEffect(() => { load(); }, [load]);

  function generate() {
    const baseResume = app.originalResume || app.tailoredResume || "";
    const gen = generateInterviewQuestions(baseResume, app.jobDescription, app.matchReport);
    // carry over any saved answers by matching question text
    const prev = new Map(questions.map((q) => [q.text, q]));
    setQuestions(gen.map((q) => ({ ...q, ...(prev.get(q.text) ? { star: prev.get(q.text).star, confidence: prev.get(q.text).confidence, answer: prev.get(q.text).answer } : {}) })));
    if (toAsk.length === 0) setToAsk(generateQuestionsToAsk(app.jobDescription));
    setSaveNote("Generated — remember to Save.");
  }

  function updateStar(id, field, val) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, star: { ...(q.star || {}), [field]: val } } : q)));
  }
  function updateConfidence(id, val) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, confidence: val } : q)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, questionsToAsk: toAsk, rounds }),
      });
      if (res.ok) setSaveNote("Saved.");
    } finally {
      setSaving(false);
    }
  }

  function addRound() {
    if (!round.name.trim()) return;
    setRounds((r) => [...r, { ...round, id: `round-${r.length + 1}-${round.date || "d"}` }]);
    setRound({ name: "", type: "Recruiter Screen", date: "", format: "", outcome: "", notes: "" });
  }

  if (loading) return <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8"><DashboardLoadingState /></main>;
  if (error || !app) return <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8"><EmptyState title="Application not found." message={error} actionLabel="Back to Interviews" actionHref="/interviews" /></main>;

  const grouped = QUESTION_CATEGORIES.map((c) => ({ category: c, items: questions.filter((q) => q.category === c) })).filter((g) => g.items.length);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/interviews" className="hover:text-slate-800">Interviews</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-800">{app.role}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{app.role}</h1>
          <p className="mt-1 text-sm text-slate-600">{app.company}</p>
        </div>
        <div className="flex items-center gap-2">
          {saveNote && <span className="text-xs text-emerald-700">{saveNote}</span>}
          <button onClick={save} disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save prep"}
          </button>
        </div>
      </header>

      <div className="mb-5 flex gap-1 border-b border-slate-200" role="tablist">
        {[["questions", "Questions"], ["ask", "Questions to ask"], ["rounds", "Rounds"]].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition ${tab === k ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "questions" && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <button onClick={generate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">
              {questions.length ? "Regenerate questions" : "Generate questions"}
            </button>
            <span className="text-xs text-slate-500">From the job description, your resume, and the match report. Answers are yours to write — never fabricated.</span>
          </div>

          {questions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">No questions yet — click Generate.</p>
          ) : (
            <div className="space-y-6">
              {grouped.map((g) => (
                <section key={g.category}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${CATEGORY_STYLES[g.category] || "bg-slate-100 text-slate-600"}`}>{g.category}</span>
                  </h3>
                  <div className="space-y-2">
                    {g.items.map((q) => (
                      <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-sm text-slate-800">{q.text}</p>
                        <button onClick={() => setExpanded((e) => ({ ...e, [q.id]: !e[q.id] }))} className="mt-1.5 text-xs font-medium text-slate-700 underline">
                          {expanded[q.id] ? "Hide answer builder" : "Prepare answer (STAR)"}
                        </button>
                        {expanded[q.id] && (
                          <StarAnswerBuilder
                            star={q.star} confidence={q.confidence}
                            onStarChange={(f, v) => updateStar(q.id, f, v)}
                            onConfidenceChange={(v) => updateConfidence(q.id, v)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "ask" && (
        <div>
          <p className="mb-3 text-sm text-slate-600">Thoughtful questions to ask, built from this job description.</p>
          {toAsk.length === 0 ? (
            <button onClick={() => setToAsk(generateQuestionsToAsk(app.jobDescription))} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">Generate questions to ask</button>
          ) : (
            <ul className="space-y-2">
              {toAsk.map((q) => (
                <li key={q.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm">
                  <input type="checkbox" checked={!!q.asked} onChange={() => setToAsk((list) => list.map((x) => (x.id === q.id ? { ...x, asked: !x.asked } : x)))} className="mt-0.5" aria-label="Mark asked" />
                  <span className={q.asked ? "line-through text-slate-400" : ""}>{q.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "rounds" && (
        <div>
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-slate-700">Add an interview round</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input className={input} placeholder="Round name" value={round.name} onChange={(e) => setRound({ ...round, name: e.target.value })} />
              <select className={input} value={round.type} onChange={(e) => setRound({ ...round, type: e.target.value })} aria-label="Round type">
                {ROUND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className={input} type="date" aria-label="Date" value={round.date} onChange={(e) => setRound({ ...round, date: e.target.value })} />
              <input className={input} placeholder="Format (video, onsite…)" value={round.format} onChange={(e) => setRound({ ...round, format: e.target.value })} />
              <input className={input} placeholder="Outcome" value={round.outcome} onChange={(e) => setRound({ ...round, outcome: e.target.value })} />
            </div>
            <textarea className={`${input} mt-2 h-16 resize-y`} placeholder="Notes" value={round.notes} onChange={(e) => setRound({ ...round, notes: e.target.value })} />
            <button onClick={addRound} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">Add round</button>
          </div>

          {rounds.length === 0 ? (
            <p className="text-sm text-slate-500">No rounds added yet.</p>
          ) : (
            <div className="space-y-3">
              {rounds.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{r.name} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500">{r.type}</span></p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {r.date && <span>{formatDateShort(r.date)}</span>}
                      <button onClick={() => setRounds((list) => list.filter((x) => x.id !== r.id))} className={btnGhost}>Remove</button>
                    </div>
                  </div>
                  {(r.format || r.outcome) && <p className="mt-1 text-xs text-slate-500">{[r.format, r.outcome].filter(Boolean).join(" · ")}</p>}
                  {r.notes && <p className="mt-1 text-sm text-slate-700">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
