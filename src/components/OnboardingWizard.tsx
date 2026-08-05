import { useNavigate } from "react-router-dom";
import { FilePlus, Upload, LayoutTemplate } from "lucide-react";
import { TemplatePicker } from "./TemplatePicker";
import { CV_TEMPLATES } from "../types/cv";

interface Props {
  onComplete: (action: "blank" | "import", template?: string) => void;
}

export function OnboardingWizard({ onComplete }: Props) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-2xl font-bold">Welcome to Local CV Builder</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Build, import, and tailor your CV — everything stays on your machine.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => onComplete("blank", CV_TEMPLATES[0].id)}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-blue-400 dark:border-gray-700"
          >
            <FilePlus className="text-blue-600" />
            <span className="text-sm font-medium">Start blank</span>
          </button>
          <button
            onClick={() => {
              onComplete("import");
              navigate("/");
            }}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-indigo-400 dark:border-gray-700"
          >
            <Upload className="text-indigo-600" />
            <span className="text-sm font-medium">Import PDF</span>
          </button>
          <button
            onClick={() => onComplete("blank", "modern-professional")}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-green-400 dark:border-gray-700"
          >
            <LayoutTemplate className="text-green-600" />
            <span className="text-sm font-medium">Pick template below</span>
          </button>
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">Choose a default template</h3>
          <TemplatePicker
            value="modern-professional"
            onChange={(id) => onComplete("blank", id)}
          />
        </div>
      </div>
    </div>
  );
}
