import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useCvStore } from "../state/useCvStore";
import { TailorReviewModal } from "../components/TailorReviewModal";
import type { MatchResult, TailorProposal } from "../types/cv";

export function JobMatchPage() {
  const { profile, setJobContext, loadCv } = useCvStore();
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [tailorMsg, setTailorMsg] = useState("");
  const [proposal, setProposal] = useState<TailorProposal | null>(null);
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const analyze = async () => {
    if (!profile.id) {
      setTailorMsg("Please save your CV first.");
      return;
    }
    setJobContext(jobText);
    const match = await invoke<MatchResult>("match_job_description", { cvId: profile.id, jobText });
    setResult(match);
    const prop = await invoke<TailorProposal>("propose_tailor_cv", { cvId: profile.id, jobText });
    setProposal(prop);
    setCompany(prop.company);
    setRole(prop.role);
  };

  const applyTailor = async (selectedIds: string[]) => {
    if (!profile.id || !proposal) return;
    const cvId = await invoke<string>("apply_tailor_proposal", {
      cvId: profile.id,
      proposal,
      selectedIds,
    });
    setProposal(null);
    setTailorMsg(`Applied ${selectedIds.length} changes — tailored CV saved`);
    await loadCv(cvId);
  };

  const generateLetter = async () => {
    if (!profile.id) return;
    const res = await invoke<{ content: string }>("generate_cover_letter", {
      cvId: profile.id,
      company: company || "Company",
      role: role || "Role",
      jobText,
      style: "formal",
    });
    setCoverLetter(res.content);
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Job Match</h2>
      <textarea
        value={jobText}
        onChange={(e) => setJobText(e.target.value)}
        placeholder="Paste a job description here..."
        rows={10}
        className="w-full rounded-lg border border-gray-300 p-4 text-sm dark:border-gray-600 dark:bg-gray-800"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company name"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role / job title"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={analyze} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Analyze Match</button>
        <button
          onClick={() => setShowTailorModal(true)}
          disabled={!proposal}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Review Tailor Changes
        </button>
        <button onClick={generateLetter} className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white">Cover Letter</button>
      </div>

      {tailorMsg && <p className="mt-4 text-sm text-green-700 dark:text-green-400">{tailorMsg}</p>}

      {showTailorModal && proposal && (
        <TailorReviewModal
          proposal={proposal}
          onApply={(ids) => {
            applyTailor(ids);
            setShowTailorModal(false);
          }}
          onCancel={() => setShowTailorModal(false)}
        />
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="text-xl font-bold">Match Score: {result.score.toFixed(1)}%</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-medium text-green-700">Matched Keywords</h4>
              <div className="mt-2 flex flex-wrap gap-1">
                {result.matched_keywords.map((k) => (
                  <span key={k} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">{k}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-red-700">Missing Keywords</h4>
              <div className="mt-2 flex flex-wrap gap-1">
                {result.missing_keywords.map((k) => (
                  <span key={k} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">{k}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {coverLetter && (
        <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="mb-2 font-bold">Cover Letter</h3>
          <pre className="whitespace-pre-wrap text-sm">{coverLetter}</pre>
        </div>
      )}
    </div>
  );
}
