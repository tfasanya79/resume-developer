import { Plus, Trash2 } from "lucide-react";
import { FormField } from "./FormField";
import type { EducationItem } from "../types/cv";
import { newId } from "../types/cv";

interface Props {
  items: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}

export function EducationEditor({ items, onChange }: Props) {
  const add = () =>
    onChange([
      ...items,
      {
        id: newId(),
        institution: "",
        degree: "",
        field: "",
        start_date: "",
        end_date: "",
        details: "",
      },
    ]);

  const update = (index: number, item: EducationItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        >
          <div className="mb-3 flex justify-between">
            <h4 className="font-medium">Education {i + 1}</h4>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Institution" value={item.institution} onChange={(v) => update(i, { ...item, institution: v })} />
            <FormField label="Degree" value={item.degree} onChange={(v) => update(i, { ...item, degree: v })} />
            <FormField label="Field of Study" value={item.field} onChange={(v) => update(i, { ...item, field: v })} />
            <FormField label="End Date" value={item.end_date} onChange={(v) => update(i, { ...item, end_date: v })} />
          </div>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-2 text-sm text-blue-600">
        <Plus size={16} /> Add Education
      </button>
    </div>
  );
}
