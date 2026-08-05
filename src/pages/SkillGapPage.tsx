import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useCvStore } from "../state/useCvStore";
import type { SkillGapResult } from "../types/cv";

export function SkillGapPage() {
  const { profile } = useCvStore();
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<SkillGapResult | null>(null);

  const analyze = async () => {
    if (!profile.id) return;
    const res = await invoke<SkillGapResult>("analyze_skill_gap", {
      cvId: profile.id,
      jobText,
    });
    setResult(res);
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Skill Gap Analyzer</h2>
      <textarea
        value={jobText}
        onChange={(e) => setJobText(e.target.value)}
        placeholder="Paste job requirements..."
        rows={8}
        className="w-full rounded-lg border border-gray-300 p-4 text-sm dark:border-gray-600 dark:bg-gray-800"
      />
      <button onClick={analyze} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
        Analyze Gap
      </button>

      {result && (
        <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="text-xl font-bold">Gap Score: {result.gap_score.toFixed(1)}%</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-medium text-green-700">Matching Skills</h4>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {result.matching_skills.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-red-700">Missing Skills</h4>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {result.missing_skills.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium">Suggestions</h4>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
