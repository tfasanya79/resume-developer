interface Props {
  error: string;
  busy?: boolean;
  onRetry: () => void;
  onBasicExport: () => void;
  onCancel: () => void;
}

export function ExportFallbackDialog({ error, busy = false, onRetry, onBasicExport, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="pointer-events-auto w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-bold">Template export failed</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          The styled template PDF could not be generated. You can retry or use a basic text export
          (Helvetica layout, not matching preview).
        </p>
        <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onRetry}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Exporting…" : "Retry template export"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onBasicExport}
            className="rounded-lg bg-gray-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Use basic export
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm dark:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
