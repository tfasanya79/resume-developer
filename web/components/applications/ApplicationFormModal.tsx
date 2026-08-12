"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { JobApplicationRecord, NewJobApplication, ApplicationStatus, CvSummary } from "@/types/cv";
import { APPLICATION_STATUS_COLUMNS } from "@/types/cv";

interface Props {
  initial?: JobApplicationRecord | null;
  cvs: CvSummary[];
  onSave: (data: NewJobApplication) => Promise<void>;
  onClose: () => void;
}

export function ApplicationFormModal({ initial, cvs, onSave, onClose }: Props) {
  const [form, setForm] = useState<NewJobApplication>({
    company: initial?.company ?? "",
    position: initial?.position ?? "",
    location: initial?.location ?? "",
    job_url: initial?.job_url ?? "",
    job_description: initial?.job_description ?? "",
    salary_range: initial?.salary_range ?? "",
    status: initial?.status ?? "wishlist",
    cv_id: initial?.cv_id ?? null,
    notes: initial?.notes ?? "",
    contact_name: initial?.contact_name ?? "",
    contact_email: initial?.contact_email ?? "",
    follow_up_date: initial?.follow_up_date ?? null,
  });
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<NewJobApplication>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    if (!form.company.trim() || !form.position.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? "Edit Application" : "New Application"}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            value={form.company}
            onChange={(e) => set({ company: e.target.value })}
            placeholder="Company *"
            className="col-span-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            value={form.position}
            onChange={(e) => set({ position: e.target.value })}
            placeholder="Position *"
            className="col-span-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            value={form.location ?? ""}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="Location"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            value={form.salary_range ?? ""}
            onChange={(e) => set({ salary_range: e.target.value })}
            placeholder="Salary range"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            value={form.job_url ?? ""}
            onChange={(e) => set({ job_url: e.target.value })}
            placeholder="Job posting URL"
            className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <select
            value={form.status}
            onChange={(e) => set({ status: e.target.value as ApplicationStatus })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {APPLICATION_STATUS_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={form.cv_id ?? ""}
            onChange={(e) => set({ cv_id: e.target.value || null })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">Link a CV (optional)</option>
            {cvs.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.name}
              </option>
            ))}
          </select>
          <input
            value={form.contact_name ?? ""}
            onChange={(e) => set({ contact_name: e.target.value })}
            placeholder="Contact name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            value={form.contact_email ?? ""}
            onChange={(e) => set({ contact_email: e.target.value })}
            placeholder="Contact email"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Follow-up date</label>
            <input
              type="date"
              value={form.follow_up_date ?? ""}
              onChange={(e) => set({ follow_up_date: e.target.value || null })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <textarea
            value={form.job_description ?? ""}
            onChange={(e) => set({ job_description: e.target.value })}
            placeholder="Job description (used for interview prep questions)"
            className="col-span-2 h-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Notes"
            className="col-span-2 h-16 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.company.trim() || !form.position.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

