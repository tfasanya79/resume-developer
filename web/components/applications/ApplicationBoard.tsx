"use client";

import type { JobApplicationRecord } from "@/types/cv";
import { APPLICATION_STATUS_COLUMNS } from "@/types/cv";
import { Trash2, Link2, Calendar } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  wishlist: "border-gray-300 dark:border-gray-700",
  applied: "border-blue-300 dark:border-blue-700",
  interviewing: "border-amber-300 dark:border-amber-700",
  offered: "border-green-300 dark:border-green-700",
  rejected: "border-red-300 dark:border-red-700",
  accepted: "border-emerald-400 dark:border-emerald-600",
};

interface Props {
  applications: JobApplicationRecord[];
  onStatusChange: (id: string, status: JobApplicationRecord["status"]) => void;
  onEdit: (app: JobApplicationRecord) => void;
  onDelete: (id: string) => void;
  onPractice: (app: JobApplicationRecord) => void;
}

export function ApplicationBoard({ applications, onStatusChange, onEdit, onDelete, onPractice }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {APPLICATION_STATUS_COLUMNS.map((col) => {
        const items = applications.filter((a) => a.status === col.id);
        return (
          <div key={col.id} className="min-w-[240px] rounded-xl bg-gray-100 p-3 dark:bg-gray-900">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((app) => (
                <div
                  key={app.id}
                  className={`rounded-lg border-l-4 bg-white p-3 shadow-sm dark:bg-gray-800 ${STATUS_STYLES[app.status]}`}
                >
                  <button onClick={() => onEdit(app)} className="block w-full text-left">
                    <p className="truncate text-sm font-medium">{app.position}</p>
                    <p className="truncate text-xs text-gray-500">{app.company}</p>
                    {app.match_score !== null && app.match_score !== undefined && (
                      <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                        ATS match: {app.match_score}%
                      </p>
                    )}
                    {app.follow_up_date && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                        <Calendar size={11} /> Follow up {new Date(app.follow_up_date).toLocaleDateString()}
                      </p>
                    )}
                  </button>
                  <div className="mt-2 flex items-center gap-1">
                    <select
                      value={app.status}
                      onChange={(e) => onStatusChange(app.id, e.target.value as JobApplicationRecord["status"])}
                      className="flex-1 rounded border border-gray-200 bg-transparent px-1 py-1 text-xs dark:border-gray-700"
                    >
                      {APPLICATION_STATUS_COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {app.job_description && (
                      <button
                        onClick={() => onPractice(app)}
                        title="Practice interview for this job"
                        className="rounded p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                      >
                        <Link2 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(app.id)}
                      title="Delete"
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-gray-400">Nothing here yet</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

