"use client";

import { useEffect, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { CvSummary, InterviewQuestion, InterviewAnswerScore } from "@/types/cv";
import { loadCv } from "@/lib/cvDb";

const CATEGORY_STYLES: Record<string, string> = {
  behavioral: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  technical: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

function scoreColor(score: number) {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function InterviewCoachClient({
  cvs,
  initialCvId,
  initialJobDescription,
}: {
  cvs: CvSummary[];
  initialCvId?: string;
  initialJobDescription?: string;
}) {
  const [cvId, setCvId] = useState(initialCvId || cvs[0]?.id || "");
  const [jobDescription, setJobDescription] = useState(initialJobDescription || "");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [usedAi, setUsedAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [scores, setScores] = useState<Record<number, InterviewAnswerScore>>({});
  const [scoring, setScoring] = useState<number | null>(null);

  // Keep the URL-provided job description prefilled when arriving from an application card.
  useEffect(() => {
    if (initialJobDescription) setJobDescription(initialJobDescription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJobDescription]);

  const handleGenerate = async () => {
    if (!cvId) {
      setError("Select a CV first.");
      return;
    }
    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setScores({});
    try {
      const profile = await loadCv(cvId);
      const res = await fetch("/api/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, jobDescription }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to generate questions");
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setUsedAi(Boolean(data.used_ai));
      setExpanded(0);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGetFeedback = async (idx: number) => {
    const answer = answers[idx] || "";
    if (!answer.trim()) return;
    setScoring(idx);
    try {
      const res = await fetch("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questions[idx].question, answer }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to score answer");
      const data: InterviewAnswerScore = await res.json();
      setScores((prev) => ({ ...prev, [idx]: data }));
    } catch (e) {
      setError(String(e));
    } finally {
      setScoring(null);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Interview Coach</h1>
        <p className="text-sm text-gray-500">
          Get likely interview questions tailored to your CV and a target job, then practice answers and get
          instant feedback.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <label className="mb-1 block text-xs font-medium text-gray-500">CV to use</label>
        <select
          value={cvId}
          onChange={(e) => setCvId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          {cvs.length === 0 && <option value="">No CVs yet — create one first</option>}
          {cvs.map((cv) => (
            <option key={cv.id} value={cv.id}>
              {cv.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-medium text-gray-500">
          Job description (optional, improves relevance)
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description you're preparing for…"
          className="mb-3 h-28 w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />

        <button
          onClick={handleGenerate}
          disabled={loading || !cvId}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Generating…" : "Generate Interview Questions"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-xs text-gray-400">
            {usedAi ? "AI-generated questions" : "Generated with built-in question bank (AI unavailable)"}
          </p>
          {questions.map((q, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <button
                onClick={() => setExpanded(expanded === idx ? null : idx)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[q.category] ?? "bg-gray-100 text-gray-700"}`}>
                    {q.category}
                  </span>
                  <span className="text-sm font-medium">{q.question}</span>
                </div>
                {expanded === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expanded === idx && (
                <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                  <p className="mb-3 text-xs italic text-gray-500">Tip: {q.tip}</p>
                  <textarea
                    value={answers[idx] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="Type or paste your answer here…"
                    className="h-28 w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                  <button
                    onClick={() => handleGetFeedback(idx)}
                    disabled={scoring === idx || !(answers[idx] || "").trim()}
                    className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {scoring === idx ? "Scoring…" : "Get Feedback"}
                  </button>

                  {scores[idx] && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                      <p className={`font-semibold ${scoreColor(scores[idx].score)}`}>
                        Score: {scores[idx].score}/100
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">{scores[idx].feedback}</p>
                      <p className="mt-1 text-xs text-gray-500">STAR: {scores[idx].star_completeness}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

