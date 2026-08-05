import { invoke } from "@tauri-apps/api/core";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import type { CvProfile } from "../types/cv";
import { getTemplateComponent } from "../templates/cv/templateRegistry";

export class TemplateExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateExportError";
  }
}

// #region agent log
function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
  runId = "post-fix",
): void {
  const payload = JSON.stringify({
    sessionId: "ad61b5",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
    runId,
  });
  fetch("http://127.0.0.1:7676/ingest/db9620c4-ca8b-488e-916e-b6c4aa31d864", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad61b5" },
    body: payload,
  }).catch(() => {});
  void invoke("debug_log_line", { line: payload }).catch(() => {});
}
// #endregion

async function waitForRender(doc: Document): Promise<void> {
  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 350));
}

function copyAppStyles(targetHead: HTMLHeadElement): number {
  let copied = 0;
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    targetHead.appendChild(node.cloneNode(true));
    copied++;
  });
  const print = targetHead.ownerDocument.createElement("style");
  print.textContent = `
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #cv-print-mount { width: 210mm; }
  `;
  targetHead.appendChild(print);
  return copied;
}

/**
 * Renders the CV template into an isolated, hidden iframe that carries the app's
 * real stylesheets, then triggers the WebView's native print-to-PDF.
 *
 * Native print fully supports Tailwind v4 oklch() colors (it draws the on-screen
 * preview), unlike html2canvas which cannot parse oklch.
 */
export async function exportProfileToPdf(profile: CvProfile): Promise<void> {
  // #region agent log
  debugLog("PRINT", "exportPdf.ts:exportProfileToPdf", "native print export started", {
    template: profile.template,
  });
  // #endregion

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;visibility:hidden;z-index:-1;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new TemplateExportError("Failed to create export frame");
  }

  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="cv-print-mount"></div></body></html>');
  doc.close();

  const copied = copyAppStyles(doc.head);
  const mount = doc.getElementById("cv-print-mount");
  if (!mount) {
    iframe.remove();
    throw new TemplateExportError("Export mount missing");
  }

  let root: Root | null = null;

  const cleanup = () => {
    try {
      root?.unmount();
    } catch {
      /* noop */
    }
    iframe.remove();
  };

  try {
    const Template = getTemplateComponent(profile.template);
    root = createRoot(mount);
    root.render(createElement(Template, { profile, printMode: true }));
    await waitForRender(doc);

    // #region agent log
    debugLog("PRINT", "exportPdf.ts:before-print", "frame rendered, invoking native print", {
      stylesheetsCopied: copied,
      mountChildren: mount.childElementCount,
      mountHeight: mount.scrollHeight,
    });
    // #endregion

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        // #region agent log
        debugLog("PRINT", "exportPdf.ts:afterprint", "native print dialog closed", {});
        // #endregion
        resolve();
      };
      win.addEventListener("afterprint", finish, { once: true });
      // Safety: resolve even if afterprint never fires (some WebView builds).
      setTimeout(finish, 1500);
      win.focus();
      win.print();
    });
  } catch (e) {
    // #region agent log
    debugLog("PRINT", "exportPdf.ts:error", "native print export failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    // #endregion
    cleanup();
    throw e;
  }

  // Defer cleanup so the print job can read the frame before teardown.
  setTimeout(cleanup, 500);
}

export function openExportPreview(profile: CvProfile): void {
  sessionStorage.setItem("export_preview_profile", JSON.stringify(profile));
  window.open("/export-print", "_blank", "noopener,noreferrer");
}
