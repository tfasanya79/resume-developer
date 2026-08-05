import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { ImprovementReport, ImprovementSuggestion } from "../types/cv";
import { useCvStore } from "../state/useCvStore";
import { applyImprovementSuggestion } from "../utils/applySuggestion";

export function CvImprovementPanel() {
  const { profile, updateProfile } = useCvStore();
  const [report, setReport] = useState<ImprovementReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ id: string; before: string; after: string } | null>(null);

  const load = async () => {
    if (!profile.id) {
      const res = await invoke<AtsReportLike>("compute_ats_report", { profile, jobText: null });
      setReport({ score: res.score, suggestions: res.suggestions });
      return;
    }
    setLoading(true);
    try {
      const res = await invoke<ImprovementReport>("suggest_cv_improvements", { cvId: profile.id });
      setReport(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [profile.id, profile.updated_at]);

    const applySuggestion = (s: ImprovementSuggestion) => {
    if (!s.suggested_value || !s.field) return;
    const patch = applyImprovementSuggestion(profile, s);
    if (patch) {
      if (s.field.startsWith("experience.")) {
        const parts = s.field.split(".");
        const expId = parts[1];
        const bi = parseInt(parts[3] || "0", 10);
        const exp = profile.experience.find((e) => e.id === expId);
        const oldBullet = exp?.bullets[bi] || "";
        setPreview({ id: s.id, before: oldBullet, after: s.suggested_value });
      }
      updateProfile(patch);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Improve CV</h3>
        <button onClick={load} disabled={loading} className="text-sm text-blue-600 hover:underline disabled:opacity-50">
          Refresh
        </button>
      </div>

      {report && (
        <>
          <p className="text-sm">
            CV quality score: <strong>{report.score.toFixed(0)}%</strong>
          </p>
          {preview && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800">
              <p className="line-through text-red-600">{preview.before}</p>
              <p className="text-green-700">{preview.after}</p>
            </div>
          )}
          <ul className="space-y-2">
            {report.suggestions.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"
              >
                <div>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs uppercase dark:bg-gray-800">
                    {s.category}
                  </span>
                  <p className="mt-1">{s.message}</p>
                  {s.suggested_value && s.field?.startsWith("experience.") && (
                    <p className="mt-1 text-xs text-green-700">→ {s.suggested_value}</p>
                  )}
                </div>
                {s.suggested_value && (
                  <button onClick={() => applySuggestion(s)} className="shrink-0 text-xs text-blue-600 hover:underline">
                    Apply
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

interface AtsReportLike {
  score: number;
  suggestions: ImprovementSuggestion[];
}
