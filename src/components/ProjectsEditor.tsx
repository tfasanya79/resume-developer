import { Plus, Trash2 } from "lucide-react";
import { FormField } from "./FormField";
import type { ProjectItem } from "../types/cv";
import { newId } from "../types/cv";

interface Props {
  items: ProjectItem[];
  onChange: (items: ProjectItem[]) => void;
}

export function ProjectsEditor({ items, onChange }: Props) {
  const add = () =>
    onChange([
      ...items,
      { id: newId(), name: "", description: "", technologies: [], url: "" },
    ]);

  const update = (index: number, item: ProjectItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex justify-between">
            <h4 className="font-medium">Project {i + 1}</h4>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
          <div className="grid gap-3">
            <FormField label="Name" value={item.name} onChange={(v) => update(i, { ...item, name: v })} />
            <FormField label="Description" value={item.description} onChange={(v) => update(i, { ...item, description: v })} multiline />
            <FormField
              label="Technologies"
              value={item.technologies.join(", ")}
              onChange={(v) =>
                update(i, {
                  ...item,
                  technologies: v.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
            />
            <FormField label="URL" value={item.url} onChange={(v) => update(i, { ...item, url: v })} />
          </div>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-2 text-sm text-blue-600">
        <Plus size={16} /> Add Project
      </button>
    </div>
  );
}
