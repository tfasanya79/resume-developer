import { useEffect, useState } from "react";
import { CvPreview } from "../components/CvPreview";
import type { CvProfile } from "../types/cv";
import { createEmptyCv } from "../types/cv";

export function ExportPrintPage() {
  const [profile, setProfile] = useState<CvProfile | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("export_preview_profile");
    if (raw) {
      try {
        setProfile(JSON.parse(raw) as CvProfile);
      } catch {
        setProfile(createEmptyCv());
      }
    }
  }, []);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-8">
        <p className="text-gray-600">No CV loaded for export preview.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 p-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 max-w-[210mm] print:hidden">
        <p className="text-sm text-gray-600">
          Export preview — use your browser print dialog or return to the app to save PDF.
        </p>
        <button
          onClick={() => window.print()}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Print
        </button>
      </div>
      <div className="mx-auto max-w-[210mm] print:max-w-none">
        <CvPreview profile={profile} printMode />
      </div>
    </div>
  );
}
