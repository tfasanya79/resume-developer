import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SalaryInsight } from "../types/cv";
import { FormField } from "../components/FormField";

export function SalaryInsightsPage() {
  const [role, setRole] = useState("Software Engineer");
  const [region, setRegion] = useState("Remote");
  const [insight, setInsight] = useState<SalaryInsight | null>(null);

  const lookup = async () => {
    const res = await invoke<SalaryInsight>("get_salary_insights", { role, region });
    setInsight(res);
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Salary Insights</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Role" value={role} onChange={setRole} />
        <FormField label="Region" value={region} onChange={setRegion} />
      </div>
      <button onClick={lookup} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
        Get Insights
      </button>

      {insight && (
        <div className="mt-6 rounded-lg border border-gray-200 p-6 dark:border-gray-700">
          <h3 className="text-lg font-bold">
            {insight.role} in {insight.region}
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Min</p>
              <p className="text-xl font-bold">${insight.min_salary.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Median</p>
              <p className="text-xl font-bold text-blue-600">${insight.median_salary.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Max</p>
              <p className="text-xl font-bold">${insight.max_salary.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-6">
            <h4 className="font-medium">Negotiation Tips</h4>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {insight.negotiation_tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
