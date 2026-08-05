import { Plus, Trash2 } from "lucide-react";
import { FormField } from "./FormField";
import type { CertificationItem } from "../types/cv";
import { newId } from "../types/cv";

interface Props {
  items: CertificationItem[];
  onChange: (items: CertificationItem[]) => void;
}

export function CertificationsEditor({ items, onChange }: Props) {
  const add = () =>
    onChange([
      ...items,
      { id: newId(), name: "", issuer: "", year: "" },
    ]);

  const update = (index: number, item: CertificationItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex justify-between">
            <h4 className="font-medium">Certification {i + 1}</h4>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Name" value={item.name} onChange={(v) => update(i, { ...item, name: v })} />
            <FormField label="Issuer" value={item.issuer} onChange={(v) => update(i, { ...item, issuer: v })} />
            <FormField label="Year" value={item.year} onChange={(v) => update(i, { ...item, year: v })} />
          </div>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-2 text-sm text-blue-600">
        <Plus size={16} /> Add Certification
      </button>
    </div>
  );
}
