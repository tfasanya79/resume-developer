"use client";

import { useState } from "react";
import type { TailorProposal } from "@/types/cv";

interface Props {
  proposal: TailorProposal;
  onApply: (selectedIds: string[]) => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function TailorReviewModal({ proposal, onApply, onCancel, isApplying }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(proposal.changes.map((c) => c.id)),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-xl font-bold">Review Tailored Changes</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {proposal.role} at {proposal.company}
          {proposal.used_ai ? " · AI-generated" : " · Rule-based"}
        </p>
        <ul className="mt-4 space-y-3">
          {proposal.changes.map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="mt-1"
                />
                <div className="flex-1 text-sm">
                  <p className="text-xs text-gray-500">{c.reason}</p>
                  <p className="mt-1 text-red-600/80 line-through">{c.before}</p>
                  <p className="mt-1 text-green-700 dark:text-green-400">{c.after}</p>
                </div>
              </label>
            </li>
          ))}
        </ul>
        {proposal.changes.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            No changes proposed — try adding more detail to the job description.
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => onApply([...selected])}
            disabled={isApplying || selected.size === 0}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isApplying ? "Applying..." : `Apply Selected (${selected.size})`}
          </button>
          <button
            onClick={onCancel}
            disabled={isApplying}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm dark:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
