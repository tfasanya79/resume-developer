import { CvPreview } from "./CvPreview";
import type { ImportResult } from "../types/cv";

interface Props {
  result: ImportResult;
  onAccept: () => void;
  onAcceptAndTailor: () => void;
  onDiscard: () => void;
}

export function CvImportReview({ result, onAccept, onAcceptAndTailor, onDiscard }: Props) {
  const scrambled = result.column_scramble_detected ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold">Review Imported CV</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Confidence: {result.confidence.toFixed(0)}%
            {result.profile.source_filename && ` · ${result.profile.source_filename}`}
          </p>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 overflow-auto border-r border-gray-200 p-4 dark:border-gray-700">
            {scrambled && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
                  Multi-column PDF detected
                </h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  Columns were merged during text extraction. Please carefully review experience and
                  certifications before accepting.
                </p>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="mb-4 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</h4>
                <ul className="mt-1 list-disc pl-5 text-sm text-yellow-700 dark:text-yellow-300">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Name:</span> {result.profile.personal.full_name || "—"}
              </div>
              <div>
                <span className="font-medium">Title:</span> {result.profile.professional_title || "—"}
              </div>
              <div>
                <span className="font-medium">Email:</span> {result.profile.personal.email || "—"}
              </div>
              <div>
                <span className="font-medium">Experience:</span> {result.profile.experience.length} roles
                {scrambled && result.profile.experience.length < 2 && (
                  <span className="ml-1 text-red-600"> (expected 2+)</span>
                )}
              </div>
              <div>
                <span className="font-medium">Education:</span> {result.profile.education.length} entries
              </div>
              <div>
                <span className="font-medium">Skills:</span> {result.profile.skills.length}
                {scrambled && result.profile.skills.length < 15 && (
                  <span className="ml-1 text-red-600"> (expected 15+)</span>
                )}
              </div>
              <div>
                <span className="font-medium">Certifications:</span> {result.profile.certifications.length}
              </div>
            </div>

            {result.raw_text_preview && (
              <div className="mt-4">
                <h4 className="text-sm font-medium">Raw text preview</h4>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
                  {result.raw_text_preview}
                </pre>
              </div>
            )}
          </div>

          <div className="w-1/2 overflow-auto">
            <CvPreview profile={result.profile} />
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            onClick={onAccept}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            Accept & Edit
          </button>
          <button
            onClick={onAcceptAndTailor}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
          >
            Accept & Tailor for Job
          </button>
          <button
            onClick={onDiscard}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm dark:bg-gray-700"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
