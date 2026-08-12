"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import type { CvSummary, LinkedInOptimization } from "@/types/cv";
import { loadCv } from "@/lib/cvDb";

export function LinkedInOptimizerClient({ cvs }: { cvs: CvSummary[] }) {
  const [cvId, setCvId] = useState("");
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [loadingCv, setLoadingCv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LinkedInOptimization | null>(null);
  const [usedAi, setUsedAi] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCvSelect = async (id: string) => {
    setCvId(id);
    if (!id) return;
    setLoadingCv(true);
    setError("");
    try {
      const profile = await loadCv(id);
      setHeadline(profile.professional_title || "");
      setSummary(profile.personal.summary || "");
      const bullets = profile.experience.flatMap((e) => e.bullets.filter(Boolean));
      setExperience(bullets.join("\n"));
      setSkills(profile.skills || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingCv(false);
    }
  };

  const handleOptimize = async () => {
    if (!headline.trim() && !summary.trim() && !experience.trim()) {
      setError("Enter a headline, summary, or experience to optimize.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/linkedin/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, summary, experienceText: experience, skills }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");
      setResult(data.result);
      setUsedAi(data.used_ai);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard not available; ignore
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">LinkedIn Optimizer</h1>
        <p className="text-sm text-gray-500">
          Paste your current LinkedIn headline, About section, and experience bullets — or auto-fill from a CV — to get
          AI-rewritten, recruiter-friendly copy.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <label className="mb-1 block text-sm font-medium">Auto-fill from a CV (optional)</label>
        <select
          value={cvId}
          onChange={(e) => handleCvSelect(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">Start blank</option>
          {cvs.map((cv) => (
            <option key={cv.id} value={cv.id}>
              {cv.name}
            </option>
          ))}
        </select>
        {loadingCv && <p className="mb-3 text-xs text-gray-500">Loading CV…</p>}

        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Headline</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Software Engineer at Acme Corp"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">About / Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              placeholder="Paste your current About section…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Experience bullets (one per line)</label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              rows={6}
              placeholder="One bullet per line, e.g.&#10;Managed a team of 5 engineers&#10;Shipped the new checkout flow"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={loading}
          className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Optimizing…" : "Optimize Profile"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          {!usedAi && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              AI service unavailable — showing rule-based suggestions instead.
            </p>
          )}

          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Suggested Headline</h4>
              <button
                onClick={() => copyText("headline", result.headline)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                {copied === "headline" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "headline" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-sm">{result.headline}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Suggested About / Summary</h4>
              <button
                onClick={() => copyText("summary", result.summary)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                {copied === "summary" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "summary" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{result.summary}</p>
          </div>

          {result.experience_suggestions.length > 0 && (
            <div>
              <h4 className="font-medium">Experience Bullet Improvements</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {result.experience_suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.skills_suggestions && result.skills_suggestions.length > 0 && (
            <div>
              <h4 className="font-medium">Skills to Add</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.skills_suggestions.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium">General Tips</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {result.improvements.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}

