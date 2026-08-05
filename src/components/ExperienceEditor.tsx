import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2, Sparkles, BarChart2 } from "lucide-react";
import { FormField } from "./FormField";
import type { BulletRewriteResult, ExperienceItem } from "../types/cv";
import { newId } from "../types/cv";

interface Props {
  items: ExperienceItem[];
  onChange: (items: ExperienceItem[]) => void;
  jobContext?: string;
}

export function ExperienceEditor({ items, onChange, jobContext = "" }: Props) {
  const add = () =>
    onChange([
      ...items,
      {
        id: newId(),
        company: "",
        title: "",
        location: "",
        start_date: "",
        end_date: "",
        current: false,
        bullets: [""],
      },
    ]);

  const update = (index: number, item: ExperienceItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const rewriteBullet = async (expIndex: number, bi: number, mode: string) => {
    const item = items[expIndex];
    const bullet = item.bullets[bi];
    if (!bullet.trim()) return;
    const context = `${item.title} at ${item.company}. ${jobContext}`;
    const res = await invoke<BulletRewriteResult>("rewrite_experience_bullet_cmd", {
      bullet,
      context,
      mode,
    });
    const bullets = [...item.bullets];
    bullets[bi] = res.rewritten;
    update(expIndex, { ...item, bullets });
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-medium">Experience {i + 1}</h4>
            <button onClick={() => remove(i)} className="text-red-500 hover:text-red-700">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Job Title" value={item.title} onChange={(v) => update(i, { ...item, title: v })} />
            <FormField label="Company" value={item.company} onChange={(v) => update(i, { ...item, company: v })} />
            <FormField label="Start Date" value={item.start_date} onChange={(v) => update(i, { ...item, start_date: v })} placeholder="Jan 2020" />
            <FormField label="End Date" value={item.end_date} onChange={(v) => update(i, { ...item, end_date: v })} placeholder="Present" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={item.current} onChange={(e) => update(i, { ...item, current: e.target.checked })} />
            Currently working here
          </label>
          <div className="mt-3 space-y-2">
            <span className="text-sm font-medium">Bullet Points</span>
            {item.bullets.map((bullet, bi) => (
              <div key={bi} className="flex gap-2">
                <input
                  value={bullet}
                  onChange={(e) => {
                    const bullets = [...item.bullets];
                    bullets[bi] = e.target.value;
                    update(i, { ...item, bullets });
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  placeholder="Achievement or responsibility..."
                />
                <button onClick={() => rewriteBullet(i, bi, "star")} title="Improve" className="text-purple-500">
                  <Sparkles size={14} />
                </button>
                <button onClick={() => rewriteBullet(i, bi, "metrics")} title="Add metrics" className="text-blue-500">
                  <BarChart2 size={14} />
                </button>
                <button
                  onClick={() => {
                    const bullets = item.bullets.filter((_, idx) => idx !== bi);
                    update(i, { ...item, bullets: bullets.length ? bullets : [""] });
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => update(i, { ...item, bullets: [...item.bullets, ""] })} className="text-sm text-blue-600 hover:underline">
              + Add bullet
            </button>
          </div>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600">
        <Plus size={16} /> Add Experience
      </button>
    </div>
  );
}
