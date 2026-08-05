import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2 } from "lucide-react";
import type { JobApplication } from "../types/cv";
import { APPLICATION_STATUSES, type CvSummary } from "../types/cv";
import { FormField } from "../components/FormField";

const KANBAN_COLUMNS = ["saved", "applied", "interviewing", "offer", "rejected"];

export function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [cvs, setCvs] = useState<CvSummary[]>([]);
  const [editing, setEditing] = useState<JobApplication | null>(null);

  const load = async () => {
    const apps = await invoke<JobApplication[]>("list_applications");
    setApplications(apps);
    const cvList = await invoke<CvSummary[]>("list_cvs");
    setCvs(cvList);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    await invoke("save_application", { application: editing });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    await invoke("delete_application", { id });
    load();
  };

  const moveStatus = async (app: JobApplication, status: string) => {
    await invoke("save_application", { application: { ...app, status } });
    load();
  };

  const newApp = () =>
    setEditing({
      id: "",
      title: "",
      company: "",
      status: "saved",
      notes: "",
      created_at: "",
      updated_at: "",
    });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Application Tracker</h2>
        <button onClick={newApp} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
          <Plus size={16} /> Add Application
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Job Title" value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
            <FormField label="Company" value={editing.company} onChange={(v) => setEditing({ ...editing, company: v })} />
            <label className="block space-y-1">
              <span className="text-sm font-medium">Status</span>
              <select
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <FormField label="Applied Date" value={editing.applied_at ?? ""} onChange={(v) => setEditing({ ...editing, applied_at: v })} />
            <FormField label="Reminder Date" value={editing.reminder_at ?? ""} onChange={(v) => setEditing({ ...editing, reminder_at: v })} />
            <label className="block space-y-1">
              <span className="text-sm font-medium">Linked CV Version</span>
              <select
                value={editing.cv_version_id ?? ""}
                onChange={(e) => setEditing({ ...editing, cv_version_id: e.target.value || null })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="">— None —</option>
                {cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>{cv.name}</option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <FormField label="Notes" value={editing.notes} onChange={(v) => setEditing({ ...editing, notes: v })} multiline />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Save</button>
            <button onClick={() => setEditing(null)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm dark:bg-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => (
          <div key={status} className="min-w-[200px] flex-1 rounded-lg bg-gray-100 p-3 dark:bg-gray-800/50">
            <h3 className="mb-3 text-sm font-semibold capitalize">{status}</h3>
            <div className="space-y-2">
              {applications
                .filter((a) => a.status === status)
                .map((app) => (
                  <div key={app.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-medium">{app.title}</p>
                    <p className="text-xs text-gray-500">{app.company}</p>
                    {app.reminder_at && (
                      <p className="mt-1 text-xs text-amber-600">Reminder: {app.reminder_at}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button onClick={() => setEditing(app)} className="text-xs text-blue-600">Edit</button>
                      <button onClick={() => remove(app.id)} className="text-xs text-red-500"><Trash2 size={12} /></button>
                      {KANBAN_COLUMNS.filter((s) => s !== status).slice(0, 2).map((s) => (
                        <button key={s} onClick={() => moveStatus(app, s)} className="text-xs text-gray-500">→ {s}</button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
