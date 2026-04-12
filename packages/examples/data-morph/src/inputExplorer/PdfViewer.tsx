/**
 * PdfViewer — renders all pages of a base64-encoded PDF using pdf.js (pdfjs-dist).
 */
import { createEffect, createSignal, For, onCleanup, type JSX } from "solid-js";
import { Box } from "@suid/material";
import * as pdfjsLib from "pdfjs-dist";

// Read the worker source at build time and create a Blob URL.
// This inlines the worker so there is no separate .mjs file to fetch,
// avoiding dynamic-import failures on mobile browsers (iOS Safari, etc.).
import pdfjsWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?raw";
const workerBlob = new Blob([pdfjsWorkerSrc], { type: "application/javascript" });
pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);

export interface PdfViewerProps {
  /** Base64-encoded PDF binary */
  base64: string;
}

export function PdfViewer(props: PdfViewerProps): JSX.Element {
  const [pages, setPages] = createSignal<HTMLCanvasElement[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  let containerRef: HTMLDivElement | undefined;

  createEffect(() => {
    const b64 = props.base64;
    if (!b64) return;

    let cancelled = false;

    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    const loadingTask = pdfjsLib.getDocument({ data: bytes });

    loadingTask.promise
      .then(async (pdf) => {
        if (cancelled) return;

        const rendered: HTMLCanvasElement[] = [];
        const containerWidth = containerRef?.clientWidth ?? 600;

        for (let num = 1; num <= pdf.numPages; num++) {
          if (cancelled) break;
          const page = await pdf.getPage(num);
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = Math.min((containerWidth - 16) / unscaledViewport.width, 3);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push(canvas);
        }

        if (!cancelled) {
          setError(null);
          setPages(rendered);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err?.message ?? err));
        }
      });

    onCleanup(() => {
      cancelled = true;
      loadingTask.destroy();
    });
  });

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "100%",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        py: 1,
        bgcolor: "#1e1e2e",
      }}
    >
      {error() ? (
        <Box sx={{ color: "#f38ba8", fontSize: 13, p: 2 }}>Failed to render PDF: {error()}</Box>
      ) : pages().length === 0 ? (
        <Box sx={{ color: "#6c7086", fontSize: 13, p: 2 }}>Loading PDF…</Box>
      ) : (
        <For each={pages()}>
          {(canvas) => (
            <Box
              ref={(el: HTMLDivElement) => el.appendChild(canvas)}
              sx={{
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                lineHeight: 0,
              }}
            />
          )}
        </For>
      )}
    </Box>
  );
}
