"use client";

import { useEffect, useState } from "react";
import type { CvProfile, ImprovementSuggestion } from "@/types/cv";
import { suggestImprovements } from "@/lib/ats";
import { applyImprovementSuggestion } from "@/lib/applySuggestion";

interface Props {
  profile: CvProfile;
  onApply: (patch: Partial<CvProfile>) => void;
}

export function CvImprovementPanel({ profile, onApply }: Props) {
  const [report, setReport] = useState<{ score: number; suggestions: ImprovementSuggestion[] } | null>(null);
  const [preview, setPreview] = useState<{ id: string; before: string; after: string } | null>(null);

  const load = () => setReport(suggestImprovements(profile));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      onApply(patch);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Improve CV</h3>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">
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
