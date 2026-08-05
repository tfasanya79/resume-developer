import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { LinkedInOptimization } from "../types/cv";
import { FormField } from "../components/FormField";

export function LinkedInOptimizerPage() {
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState("");
  const [result, setResult] = useState<LinkedInOptimization | null>(null);

  const optimize = async () => {
    const res = await invoke<LinkedInOptimization>("optimize_linkedin", {
      headline,
      summary,
      experienceText: experience,
    });
    setResult(res);
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">LinkedIn Optimizer</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Paste content from your exported LinkedIn profile.
      </p>
      <div className="grid gap-4">
        <FormField label="Headline" value={headline} onChange={setHeadline} />
        <FormField label="Summary" value={summary} onChange={setSummary} multiline />
        <FormField label="Experience" value={experience} onChange={setExperience} multiline />
      </div>
      <button onClick={optimize} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
        Optimize Profile
      </button>

      {result && (
        <div className="mt-6 space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h4 className="font-medium">Suggested Headline</h4>
            <p className="text-sm">{result.headline}</p>
          </div>
          <div>
            <h4 className="font-medium">Suggested Summary</h4>
            <p className="text-sm whitespace-pre-wrap">{result.summary}</p>
          </div>
          <div>
            <h4 className="font-medium">Experience Improvements</h4>
            {result.experience_suggestions.map((s, i) => (
              <p key={i} className="text-sm">{s}</p>
            ))}
          </div>
          <div>
            <h4 className="font-medium">General Tips</h4>
            <ul className="list-disc pl-5 text-sm">
              {result.improvements.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
