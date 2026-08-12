import { Plus, Trash2 } from "lucide-react";
import { FormField } from "./FormField";
import type { LanguageItem } from "@/types/cv";
import { newId } from "@/types/cv";

interface Props {
  items: LanguageItem[];
  onChange: (items: LanguageItem[]) => void;
}

export function LanguagesEditor({ items, onChange }: Props) {
  const add = () =>
    onChange([...items, { id: newId(), language: "", level: "" }]);

  const update = (index: number, item: LanguageItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="flex gap-2">
          <FormField label="Language" value={item.language} onChange={(v) => update(i, { ...item, language: v })} />
          <FormField label="Level" value={item.level} onChange={(v) => update(i, { ...item, level: v })} placeholder="Fluent" />
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="mt-6 text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-2 text-sm text-blue-600">
        <Plus size={16} /> Add Language
      </button>
    </div>
  );
}
