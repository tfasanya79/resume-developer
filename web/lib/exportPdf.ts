"use client";

import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import type { CvProfile } from "@/types/cv";
import { getTemplateComponent } from "@/templates/cv/templateRegistry";

export class TemplateExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateExportError";
  }
}

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
 * real stylesheets, then triggers the browser's native print-to-PDF.
 */
export async function exportProfileToPdf(profile: CvProfile): Promise<void> {
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

  copyAppStyles(doc.head);
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

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      win.addEventListener("afterprint", finish, { once: true });
      setTimeout(finish, 1500);
      win.focus();
      win.print();
    });
  } catch (e) {
    cleanup();
    throw e;
  }

  setTimeout(cleanup, 500);
}
