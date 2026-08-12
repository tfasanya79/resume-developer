"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus } from "lucide-react";
import type { JobApplicationRecord, NewJobApplication, ApplicationStatus, CvSummary } from "@/types/cv";
import {
  createApplication,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
} from "@/lib/applicationsDb";
import { ApplicationBoard } from "@/components/applications/ApplicationBoard";
import { ApplicationFormModal } from "@/components/applications/ApplicationFormModal";

export function ApplicationsClient({
  initialApplications,
  cvs,
}: {
  initialApplications: JobApplicationRecord[];
  cvs: CvSummary[];
}) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [editing, setEditing] = useState<JobApplicationRecord | null | "new">(null);

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    const current = applications.find((a) => a.id === id);
    if (!current) return;
    const updated = await updateApplicationStatus(id, status, current);
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    await deleteApplication(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async (data: NewJobApplication) => {
    if (editing && editing !== "new") {
      const updated = await updateApplication(editing.id, data);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } else {
      const created = await createApplication(data);
      setApplications((prev) => [created, ...prev]);
    }
    setEditing(null);
  };

  const handlePractice = (app: JobApplicationRecord) => {
    const params = new URLSearchParams();
    if (app.cv_id) params.set("cvId", app.cv_id);
    params.set("applicationId", app.id);
    router.push(`/interview?${params.toString()}`);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Application Tracker</h1>
          <p className="text-sm text-gray-500">
            {applications.length === 0 ? "Track your job search here." : `${applications.length} tracked`}
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <FilePlus size={16} /> Add Application
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <p className="text-gray-500">
            No applications yet. Add one manually, or use &ldquo;Track This Application&rdquo; from the CV
            editor after pasting a job description.
          </p>
        </div>
      ) : (
        <ApplicationBoard
          applications={applications}
          onStatusChange={handleStatusChange}
          onEdit={(app) => setEditing(app)}
          onDelete={handleDelete}
          onPractice={handlePractice}
        />
      )}

      {editing && (
        <ApplicationFormModal
          initial={editing === "new" ? null : editing}
          cvs={cvs}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}

