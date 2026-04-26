/**
 * Excel utilities for the DataMorphPlayground.
 * Uses the WASM `read_value` function to parse Excel files (no external library needed).
 */
import { loadDataMorphWasm, parseWasmEnvelope } from "../util/dataMorphWasmLoader";

/**
 * Read a File object and return its contents as a base64 string.
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      resolve(btoa(binary));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse a base64-encoded Excel file into an array of row objects using WASM.
 * Uses evaluate_script as the primary approach (known to work in both browser and Node).
 * 
 * @param base64Data  Base64-encoded .xls or .xlsx bytes
 * @param format      "XLSX" or "XLS"
 * @returns Parsed data (typically array of objects), or empty array if parsing fails
 */
export async function parseExcelViaWasm(
  base64Data: string,
  format: "XLSX" | "XLS",
): Promise<Record<string, unknown>[]> {
  try {
    const wasm = await loadDataMorphWasm();
    if (!wasm) return [];

    // Use evaluate_script — the same path used by the main app, known to work.
    const script = `output application/json\n---\npayload`;
    const contextJson = JSON.stringify({
      payloadFormat: format,
      payload: base64Data,
    });

    const result = wasm.evaluate_script(script, contextJson);
    const env = parseWasmEnvelope<unknown>(result);
    if (!env.ok) {
      console.warn("[ExcelUtils] WASM parse failed:", env.error);
      return [];
    }

    // The value could be: an array directly, a string of JSON, or an object wrapping arrays
    return extractRows(env.value);
  } catch (err) {
    console.error("[ExcelUtils] parseExcelViaWasm error:", err);
    return [];
  }
}

/** Extract row array from various WASM output shapes */
function extractRows(value: unknown): Record<string, unknown>[] {
  // Direct array
  if (Array.isArray(value)) return value as Record<string, unknown>[];

  // String containing JSON array
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
      // Could be an object with sheet names as keys (e.g. {"Sheet1": [...]})
      if (parsed && typeof parsed === "object") {
        return extractFromSheetObject(parsed);
      }
    } catch { /* not JSON */ }
  }

  // Object with sheet names as keys (e.g. {"Sheet1": [...]})
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return extractFromSheetObject(value as Record<string, unknown>);
  }

  return [];
}

/** Pull the first array value from an object (e.g. sheet-name keyed result) */
function extractFromSheetObject(obj: Record<string, unknown>): Record<string, unknown>[] {
  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
  }
  return [];
}

/**
 * Download a base64-encoded XLSX as a file.
 */
export function downloadBase64AsFile(base64Data: string, fileName: string): void {
  const byteChars = atob(base64Data);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if a string looks like it's a base64-encoded Excel file.
 */
export function isExcelBase64(value: string): boolean {
  if (!value || value.length < 20) return false;
  // XLSX files (ZIP) start with PK (UEs= in base64)
  // XLS files start with D0CF11E0 (0M8R in base64)
  return value.startsWith("UEs") || value.startsWith("0M8R");
}
