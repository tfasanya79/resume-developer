import { Plus, Trash2 } from "lucide-react";
import { FormField } from "./FormField";
import type { CourseItem } from "@/types/cv";
import { COURSE_FORMAT_OPTIONS, newId } from "@/types/cv";

interface Props {
  items: CourseItem[];
  onChange: (items: CourseItem[]) => void;
}

export function CoursesEditor({ items, onChange }: Props) {
  const add = () =>
    onChange([
      ...items,
      { id: newId(), name: "", provider: "", date: "", format: COURSE_FORMAT_OPTIONS[0] },
    ]);

  const update = (index: number, item: CourseItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex justify-between">
            <h4 className="font-medium">Course {i + 1}</h4>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Course name"
              value={item.name}
              onChange={(v) => update(i, { ...item, name: v })}
            />
            <FormField
              label="Provider / Institution"
              value={item.provider}
              onChange={(v) => update(i, { ...item, provider: v })}
            />
            <FormField
              label="Date"
              value={item.date}
              onChange={(v) => update(i, { ...item, date: v })}
              placeholder="e.g. May 2024"
            />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                Study format
              </span>
              <select
                value={item.format}
                onChange={(e) => update(i, { ...item, format: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                {COURSE_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 text-sm text-blue-600"
      >
        <Plus size={16} /> Add course or training
      </button>
    </div>
  );
}
