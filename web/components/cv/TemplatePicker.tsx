import { CV_TEMPLATES } from "@/types/cv";

interface Props {
  value: string;
  onChange: (templateId: string) => void;
}

export function TemplatePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {CV_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-lg border p-3 text-left text-xs transition ${
            value === t.id
              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-400 dark:bg-blue-900/30"
              : "border-gray-200 hover:border-blue-300 dark:border-gray-700"
          }`}
        >
          <div className="mb-2 h-16 rounded bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700" />
          <span className="font-medium">{t.name}</span>
        </button>
      ))}
    </div>
  );
}
