import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { AtsReport, ImprovementSuggestion } from "../types/cv";
import { useCvStore } from "../state/useCvStore";
import { applyImprovementSuggestion } from "../utils/applySuggestion";

interface Props {
  jobText?: string;
}

export function AtsSidebar({ jobText }: Props) {
  const { profile, updateProfile } = useCvStore();
  const [report, setReport] = useState<AtsReport | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await invoke<AtsReport>("compute_ats_report", {
          profile,
          jobText: jobText || null,
        });
        setReport(res);
      } catch {
        setReport(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [profile, jobText]);

  const applySuggestion = (s: ImprovementSuggestion) => {
    const patch = applyImprovementSuggestion(profile, s);
    if (patch) updateProfile(patch);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="absolute right-2 top-2 z-10 rounded-lg bg-blue-600 px-2 py-1 text-xs text-white"
      >
        ATS {report ? `${report.score.toFixed(0)}%` : "—"}
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
              Missing: {report.missing_keywords.slice(0, 5).join(", ")}
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
        </>
      ) : (
        <p className="text-xs text-gray-500">Analyzing…</p>
      )}
    </div>
  );
}
