"use client";

import { useEffect, useState } from "react";
import type { AtsReport, CvProfile, ImprovementSuggestion, SalaryInsight, SkillGapResult } from "@/types/cv";
import { computeAtsReport } from "@/lib/ats";
import { applyImprovementSuggestion } from "@/lib/applySuggestion";
import { withAppBasePath } from "@/lib/paths";

interface Props {
  profile: CvProfile;
  jobText?: string;
  onApply: (patch: Partial<CvProfile>) => void;
}

export function AtsSidebar({ profile, jobText, onApply }: Props) {
  const [report, setReport] = useState<AtsReport | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [skillGap, setSkillGap] = useState<SkillGapResult | null>(null);
  const [skillGapLoading, setSkillGapLoading] = useState(false);
  const [salaryInsight, setSalaryInsight] = useState<SalaryInsight | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setReport(computeAtsReport(profile, jobText || null));
      } catch {
        setReport(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [profile, jobText]);

  useEffect(() => {
    if (!jobText?.trim()) {
      setSkillGap(null);
      setSkillGapLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSkillGapLoading(true);
        const res = await fetch(withAppBasePath("/api/skill-gap"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, jobDescription: jobText }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Skill gap analysis failed");
        setSkillGap(data);
      } catch {
        setSkillGap(null);
      } finally {
        setSkillGapLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profile, jobText]);

  useEffect(() => {
    if (!jobText?.trim() && !profile.professional_title?.trim()) {
      setSalaryInsight(null);
      setSalaryLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSalaryLoading(true);
        const res = await fetch(withAppBasePath("/api/salary-insights"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: profile.professional_title || "",
            location: profile.personal?.location || "",
            jobDescription: jobText || "",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Salary insight failed");
        setSalaryInsight(data);
      } catch {
        setSalaryInsight(null);
      } finally {
        setSalaryLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [profile.professional_title, profile.personal?.location, jobText]);

  const applySuggestion = (s: ImprovementSuggestion) => {
    const patch = applyImprovementSuggestion(profile, s);
    if (patch) onApply(patch);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="absolute right-2 top-2 z-10 rounded-lg bg-blue-600 px-2 py-1 text-xs text-white"
      >
        ATS {report ? `${report.score.toFixed(0)}%` : "..."}
      </button>
    );
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50 lg:border-b-0 lg:border-l">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">ATS Score</h3>
        <button onClick={() => setExpanded(false)} className="text-xs text-gray-500">Hide</button>
      </div>
      {report ? (
        <>
          <p className="text-2xl font-bold text-blue-600">{report.score.toFixed(0)}%</p>
          {report.categories.map((c) => (
            <div key={c.name} className="mt-2">
              <div className="flex justify-between text-xs capitalize">
                <span>{c.name.replace("_", " ")}</span>
                <span>{c.score.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${c.score}%` }} />
              </div>
            </div>
          ))}
          {report.missing_keywords.length > 0 && (
            <p className="mt-2 text-xs text-red-600">
              Missing keywords: {report.missing_keywords.slice(0, 5).join(", ")}
            </p>
          )}
          <ul className="mt-3 max-h-40 space-y-1 overflow-auto">
            {report.suggestions.slice(0, 5).map((s) => (
              <li key={s.id} className="rounded border border-gray-200 p-2 text-xs dark:border-gray-700">
                <p>{s.message}</p>
                {s.suggested_value && (
                  <button
                    onClick={() => applySuggestion(s)}
                    className="mt-1 text-blue-600 hover:underline"
                  >
                    Apply
                  </button>
                )}
              </li>
            ))}
          </ul>

          {jobText?.trim() && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Skill Gap Analyzer</h4>
                {skillGap && <span className="text-xs font-medium text-blue-600">{skillGap.gap_score}% match</span>}
              </div>
              {skillGapLoading ? (
                <p className="mt-2 text-xs text-gray-500">Comparing your skills to the job...</p>
              ) : skillGap ? (
                <>
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500">Strong matches</p>
                    <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                      {skillGap.matching_skills.length > 0 ? skillGap.matching_skills.join(", ") : "None found yet"}
                    </p>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500">Missing from this CV</p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                      {skillGap.missing_skills.length > 0 ? skillGap.missing_skills.join(", ") : "No major gaps detected"}
                    </p>
                  </div>
                  {skillGap.suggestions.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-gray-600 dark:text-gray-300">
                      {skillGap.suggestions.map((suggestion) => (
                        <li key={suggestion}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Add a job description to compare required skills.</p>
              )}
            </div>
          )}

          {(jobText?.trim() || profile.professional_title?.trim()) && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Salary Insights</h4>
                {salaryInsight && (
                  <span className="text-xs font-medium text-blue-600">{salaryInsight.region}</span>
                )}
              </div>
              {salaryLoading ? (
                <p className="mt-2 text-xs text-gray-500">Estimating salary range...</p>
              ) : salaryInsight ? (
                <>
                  <p className="mt-2 text-lg font-bold text-blue-600">
                    {salaryInsight.currency} {salaryInsight.min_salary.toLocaleString()} to {salaryInsight.max_salary.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Median around {salaryInsight.currency} {salaryInsight.median_salary.toLocaleString()} for {salaryInsight.role}
                  </p>
                  {salaryInsight.negotiation_tips.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-gray-600 dark:text-gray-300">
                      {salaryInsight.negotiation_tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-[11px] italic text-gray-400">
                    AI estimate only, not sourced from live market data.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Add a professional title or job description to see an estimate.</p>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-500">Analyzing...</p>
      )}
    </div>
  );
}
