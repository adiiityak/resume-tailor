"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DOC_VARIANTS, downloadResumeAsDocx, downloadCoverLetterAsDocx } from "@/lib/docxExport";
import { tailorLocally } from "@/lib/localTailor";
import { generateCoverLetterLocally, guessCompanyName, guessJobTitle } from "@/lib/localCoverLetter";
import { parseResume } from "@/lib/resumeParser";
import { computeJobFit } from "@/lib/jobFit";
import { computeResumeDiff } from "@/lib/resumeDiff";
import { analyzeResumeQuality } from "@/lib/resumeQuality";
import FitScore from "@/components/resume/FitScore";
import ResumeDiffViewer from "@/components/resume/ResumeDiffViewer";
import QualityChecker from "@/components/resume/QualityChecker";

function VariantSelect({ value, onChange, idPrefix }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
      aria-label={`${idPrefix} design variant`}
    >
      {Object.entries(DOC_VARIANTS).map(([key, v]) => (
        <option key={key} value={key}>
          {v.label}
        </option>
      ))}
    </select>
  );
}

function ResumePrintView({ text }) {
  const parsed = parseResume(text);
  return (
    <div>
      <div className="r-name">{parsed.name}</div>
      {parsed.contact.map((c, i) => (
        <div key={i} className="r-contact">{c}</div>
      ))}
      {parsed.sections.map((s, i) => (
        <div key={i}>
          {s.title && <div className="r-sec">{s.title}</div>}
          {s.items.map((item, j) => {
            if (item.kind === "entry") {
              return (
                <div key={j} className="r-entry">
                  <span>{item.left}</span>
                  <span className="r-date">{item.right}</span>
                </div>
              );
            }
            if (item.kind === "sub") return <div key={j} className="r-sub">{item.text}</div>;
            if (item.kind === "bullet") return <div key={j} className="r-bullet">• {item.text}</div>;
            return <div key={j} className="r-text">{item.text}</div>;
          })}
        </div>
      ))}
    </div>
  );
}

function slug(value) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function Home() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState("local");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [editedResume, setEditedResume] = useState("");

  const [company, setCompany] = useState("");
  const [companyTouched, setCompanyTouched] = useState(false);
  const [role, setRole] = useState("");
  const [roleTouched, setRoleTouched] = useState(false);

  const [resumeVariant, setResumeVariant] = useState("v1");
  const [clVariant, setClVariant] = useState("v1");

  const [resumeFileLoading, setResumeFileLoading] = useState(false);
  const [resumeFileError, setResumeFileError] = useState("");

  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterNotes, setCoverLetterNotes] = useState("");

  const [printTarget, setPrintTarget] = useState("resume");

  const [applicationId, setApplicationId] = useState(null);
  const [saveNote, setSaveNote] = useState("");

  const [fitReport, setFitReport] = useState(null);
  const [diffReport, setDiffReport] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  const [analysisTab, setAnalysisTab] = useState("fit");

  // Load a saved application into the editor when arriving from the dashboard (?load=<id>).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get("load");
    if (!loadId) return;
    (async () => {
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(loadId)}?full=1`);
        const data = await res.json();
        if (!res.ok) return;
        setResume(data.originalResume || data.tailoredResume || "");
        setEditedResume(data.tailoredResume || "");
        setJobDescription(data.jobDescription || "");
        setCompany(data.company || "");
        setCompanyTouched(true);
        setRole(data.role && data.role !== "Unknown Role" ? data.role : "");
        setRoleTouched(true);
        setMode(data.mode || "local");
        setResumeVariant(data.resumeVariant || "v1");
        setApplicationId(data.id);
        if (data.coverLetterText) setCoverLetter(data.coverLetterText);
        if (data.fitReport) setFitReport(data.fitReport);
        if (data.resumeDiff) setDiffReport(data.resumeDiff);
        if (data.qualityReport) setQualityReport(data.qualityReport);
        if (data.matchReport) {
          setResult({
            matchScore: data.matchReport.matchScore ?? "—",
            matchedKeywords: data.matchReport.matchedKeywords || [],
            missingKeywords: data.matchReport.missingKeywords || [],
            notes: data.matchReport.notes || `Loaded from history (${data.company}).`,
            tailoredResume: data.tailoredResume || "",
          });
        }
        setSaveNote(`Loaded application: ${data.company} — ${data.role}`);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  function handleJdChange(e) {
    const value = e.target.value;
    setJobDescription(value);
    const detectedCompany = companyTouched ? company : guessCompanyName(value) || "";
    if (!companyTouched) setCompany(detectedCompany);
    if (!roleTouched) {
      const title = guessJobTitle(value, detectedCompany);
      setRole(title && title !== "this role" ? title : "");
    }
  }

  async function handleResumeFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFileError("");
    setResumeFileLoading(true);
    try {
      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) {
        setResumeFileError(data.error || "Failed to parse that PDF.");
        return;
      }
      setResume(data.text);
    } catch (err) {
      setResumeFileError(err.message || "Failed to upload the file.");
    } finally {
      setResumeFileLoading(false);
      e.target.value = "";
    }
  }

  function checkFit() {
    setError("");
    if (!resume.trim() || !jobDescription.trim()) {
      setError("Paste both your resume and the job description first.");
      return;
    }
    setFitReport(computeJobFit(resume, jobDescription));
    setAnalysisTab("fit");
  }

  function applyMetric(original, revised) {
    if (!original || !revised) return;
    setEditedResume((prev) => prev.split(original).join(revised));
  }

  async function handleTailor() {
    setError("");
    setResult(null);
    setSaveNote("");

    if (!resume.trim() || !jobDescription.trim()) {
      setError("Paste both your resume and the job description first.");
      return;
    }

    setLoading(true);
    try {
      let data;
      if (mode === "local") {
        data = tailorLocally(resume, jobDescription);
      } else {
        const res = await fetch("/api/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription }),
        });
        data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
      }

      setResult(data);
      setEditedResume(data.tailoredResume);

      // Resume intelligence: fit, change-by-change diff with evidence, quality.
      const fit = computeJobFit(resume, jobDescription);
      const diff = computeResumeDiff(resume, data.tailoredResume);
      const quality = analyzeResumeQuality(data.tailoredResume);
      setFitReport(fit);
      setDiffReport(diff);
      setQualityReport(quality);
      setAnalysisTab("compare");

      // Create a new application folder for this tailoring.
      try {
        const saveRes = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            role,
            jobDescription,
            originalResume: resume,
            tailoredResume: data.tailoredResume,
            matchReport: {
              matchScore: data.matchScore,
              matchedKeywords: data.matchedKeywords,
              missingKeywords: data.missingKeywords,
              notes: data.notes,
            },
            fitReport: fit,
            fitScore: fit.overall,
            resumeDiff: diff,
            qualityReport: quality,
            mode,
            resumeVariant,
            matchScore: typeof data.matchScore === "number" ? data.matchScore : null,
          }),
        });
        const saved = await saveRes.json();
        if (saveRes.ok) {
          setApplicationId(saved.application.id);
          setSaveNote(`Saved to ${saved.application.company} / ${saved.application.applicationDate} folder.`);
        }
      } catch {
        /* saving is a convenience; never block tailoring on it */
      }
    } catch (err) {
      setError(err.message || "Failed to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCoverLetter() {
    setCoverLetterError("");

    if (!resume.trim() || !jobDescription.trim()) {
      setCoverLetterError("Paste both your resume and the job description first.");
      return;
    }

    setCoverLetterLoading(true);
    try {
      let data;
      if (mode === "local") {
        data = generateCoverLetterLocally(resume, jobDescription);
      } else {
        const res = await fetch("/api/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription }),
        });
        data = await res.json();
        if (!res.ok) {
          setCoverLetterError(data.error || "Something went wrong.");
          return;
        }
      }

      setCoverLetter(data.coverLetter);
      setCoverLetterNotes(data.notes);

      // Save into the current application folder (create one first if needed).
      let appId = applicationId;
      try {
        if (!appId) {
          const createRes = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company,
              role,
              jobDescription,
              originalResume: resume,
              tailoredResume: editedResume,
              mode,
              resumeVariant,
            }),
          });
          const created = await createRes.json();
          if (createRes.ok) {
            appId = created.application.id;
            setApplicationId(appId);
          }
        }
        if (appId) {
          await fetch(`/api/applications/${encodeURIComponent(appId)}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: "cover-letter.txt", content: data.coverLetter, variant: clVariant }),
          });
          setSaveNote("Cover letter saved to the same application folder.");
        }
      } catch {
        /* non-fatal */
      }
    } catch (err) {
      setCoverLetterError(err.message || "Failed to reach the server.");
    } finally {
      setCoverLetterLoading(false);
    }
  }

  async function handleDownloadResume() {
    await downloadResumeAsDocx(editedResume, resumeVariant, `resume-${slug(company) || "tailored"}-${resumeVariant}.docx`);
    if (applicationId) {
      fetch(`/api/applications/${encodeURIComponent(applicationId)}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generate: "resume", variant: resumeVariant }),
      }).catch(() => {});
    }
  }

  async function handleDownloadCoverLetter() {
    await downloadCoverLetterAsDocx(coverLetter, clVariant, `cover-letter-${slug(company) || "tailored"}-${clVariant}.docx`);
    if (applicationId) {
      fetch(`/api/applications/${encodeURIComponent(applicationId)}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generate: "coverLetter", variant: clVariant }),
      }).catch(() => {});
    }
  }

  function printDocument(target) {
    setPrintTarget(target);
    requestAnimationFrame(() => window.print());
  }

  const companySlug = slug(company);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Resume Tailor</h1>
          <p className="mt-1 text-sm text-slate-600">
            Paste or upload your resume and a job description. Get a tailored resume, a keyword match
            report, and a cover letter — grounded only in your real experience. Every tailoring is
            auto-saved to your <Link href="/dashboard" className="font-medium text-slate-900 underline">dashboard</Link>.
          </p>
        </div>
        {saveNote && (
          <span className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">{saveNote}</span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="resume" className="text-sm font-medium text-slate-700">Your resume</label>
            <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              {resumeFileLoading ? "Reading PDF..." : "Upload PDF"}
              <input type="file" accept="application/pdf" onChange={handleResumeFile} disabled={resumeFileLoading} className="hidden" />
            </label>
          </div>
          {resumeFileError && <p className="mb-2 text-xs text-red-600">{resumeFileError}</p>}
          <textarea
            id="resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your current resume text here, or upload a PDF above..."
            className="h-72 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="jd" className="mb-2 text-sm font-medium text-slate-700">Job description</label>
          <textarea
            id="jd"
            value={jobDescription}
            onChange={handleJdChange}
            placeholder="Paste the target job description here..."
            className="h-72 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col">
          <label htmlFor="company" className="mb-1 text-sm font-medium text-slate-700">Company</label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => { setCompany(e.target.value); setCompanyTouched(true); }}
            placeholder="Auto-detected — edit if wrong"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="role" className="mb-1 text-sm font-medium text-slate-700">Job title / role</label>
          <input
            id="role"
            type="text"
            value={role}
            onChange={(e) => { setRole(e.target.value); setRoleTouched(true); }}
            placeholder="Auto-detected — edit if wrong"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      <fieldset className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <legend className="mb-1 w-full text-sm font-medium text-slate-700">Tailoring mode</legend>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="mode" checked={mode === "local"} onChange={() => setMode("local")} />
          Local (no API key, instant, reorders your real bullets)
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="mode" checked={mode === "api"} onChange={() => setMode("api")} />
          Claude API (rewrites phrasing, needs ANTHROPIC_API_KEY)
        </label>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleTailor}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Tailoring..." : "Tailor my resume"}
        </button>
        <button
          onClick={handleCoverLetter}
          disabled={coverLetterLoading}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {coverLetterLoading ? "Writing..." : "Write cover letter"}
        </button>
        <button
          onClick={checkFit}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Check job fit
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {coverLetterError && <p className="text-sm text-red-600">{coverLetterError}</p>}
      </div>

      {fitReport && !result && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-slate-700">Job fit (before tailoring)</h2>
          <FitScore
            fit={fitReport}
            actions={
              <>
                <button onClick={handleTailor} disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50">
                  {loading ? "Tailoring..." : "Tailor anyway"}
                </button>
                <span className="self-center text-xs text-slate-500">
                  A stretch fit is fine to apply to — the missing items just have no evidence in your resume yet.
                </span>
              </>
            }
          />
        </section>
      )}

      {result && (
        <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-slate-700">Tailored resume (editable)</h2>
              <div className="flex flex-wrap gap-2">
                <VariantSelect value={resumeVariant} onChange={setResumeVariant} idPrefix="Resume" />
                <button onClick={handleDownloadResume} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Download .docx</button>
                <button onClick={() => printDocument("resume")} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Save as PDF</button>
              </div>
            </div>
            <textarea
              value={editedResume}
              onChange={(e) => setEditedResume(e.target.value)}
              className="h-[32rem] w-full resize-y rounded-lg border border-slate-300 bg-white p-4 font-mono text-xs leading-relaxed text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            {printTarget === "resume" && (
              <div className={`print-area print-${resumeVariant}`}><ResumePrintView text={editedResume} /></div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-medium text-slate-700">Match score</h2>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{result.matchScore}<span className="text-base font-normal text-slate-500">/100</span></p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-medium text-slate-700">Matched keywords</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.matchedKeywords.length === 0 && <span className="text-xs text-slate-500">—</span>}
                {result.matchedKeywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">{kw}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-medium text-slate-700">Missing keywords</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.missingKeywords.length === 0 && <span className="text-xs text-slate-500">None — great coverage.</span>}
                {result.missingKeywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{kw}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-medium text-slate-700">Notes</h2>
              <p className="mt-2 text-sm text-slate-600">{result.notes}</p>
            </div>
          </div>
        </section>
      )}

      {result && (diffReport || qualityReport || fitReport) && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Resume analysis</h2>
          <div className="mb-4 flex gap-1 border-b border-slate-200" role="tablist" aria-label="Resume analysis">
            {[
              { key: "compare", label: "Compare & evidence" },
              { key: "fit", label: "Job fit" },
              { key: "quality", label: "Quality check" },
            ].map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={analysisTab === t.key}
                onClick={() => setAnalysisTab(t.key)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                  analysisTab === t.key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {analysisTab === "compare" && <ResumeDiffViewer diff={diffReport} />}
          {analysisTab === "fit" && <FitScore fit={fitReport} />}
          {analysisTab === "quality" && <QualityChecker report={qualityReport} onApplyMetric={applyMetric} />}
        </section>
      )}

      {coverLetter && (
        <section className="mt-10">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-700">Cover letter (editable)</h2>
            <div className="flex flex-wrap gap-2">
              <VariantSelect value={clVariant} onChange={setClVariant} idPrefix="Cover letter" />
              <button onClick={handleDownloadCoverLetter} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Download .docx</button>
              <button onClick={() => printDocument("coverLetter")} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Save as PDF</button>
            </div>
          </div>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="h-96 w-full max-w-3xl resize-y rounded-lg border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {printTarget === "coverLetter" && (
            <div className={`print-area print-${clVariant}`}><div className="cl-pre">{coverLetter}</div></div>
          )}
          {coverLetterNotes && <p className="mt-2 max-w-3xl text-sm text-slate-600">{coverLetterNotes}</p>}
        </section>
      )}
    </main>
  );
}
