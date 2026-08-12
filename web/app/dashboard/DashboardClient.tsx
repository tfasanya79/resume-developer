"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, Trash2, FileText } from "lucide-react";
import type { CvSummary } from "@/types/cv";
import { createCv, deleteCv } from "@/lib/cvDb";
import { CV_TEMPLATES } from "@/types/cv";

export function DashboardClient({ initialCvs }: { initialCvs: CvSummary[] }) {
  const router = useRouter();
  const [cvs, setCvs] = useState(initialCvs);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (template?: string) => {
    setCreating(true);
    try {
      const cv = await createCv(template);
      router.push(`/cv/${cv.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this CV? This cannot be undone.")) return;
    await deleteCv(id);
    setCvs((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your CVs</h1>
          <p className="text-sm text-gray-500">
            {cvs.length === 0 ? "Create your first CV to get started." : `${cvs.length} saved`}
          </p>
        </div>
        <button
          onClick={() => handleCreate()}
          disabled={creating}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <FilePlus size={16} /> New CV
        </button>
      </div>

      {cvs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <p className="mb-4 text-gray-500">Pick a template to start:</p>
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
            {CV_TEMPLATES.slice(0, 8).map((t) => (
              <button
                key={t.id}
                onClick={() => handleCreate(t.id)}
                disabled={creating}
                className="rounded-lg border border-gray-200 p-3 text-xs font-medium hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-blue-950"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cvs.map((cv) => (
            <div
              key={cv.id}
              className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <button onClick={() => router.push(`/cv/${cv.id}`)} className="block w-full text-left">
                <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700">
                  <FileText className="text-blue-400" size={32} />
                </div>
                <h3 className="truncate font-medium">{cv.name}</h3>
                <p className="text-xs text-gray-500">
                  {cv.template.replace(/-/g, " ")} · Updated {new Date(cv.updated_at).toLocaleDateString()}
                </p>
              </button>
              <button
                onClick={() => handleDelete(cv.id)}
                className="absolute right-3 top-3 rounded-lg bg-white p-1.5 text-red-500 opacity-0 shadow group-hover:opacity-100 dark:bg-gray-800"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
