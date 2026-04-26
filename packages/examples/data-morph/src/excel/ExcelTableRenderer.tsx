/**
 * ExcelTableRenderer — renders parsed Excel data (array-of-objects) as an HTML table.
 */
import { createMemo, For, Show, type JSX } from "solid-js";

export interface ExcelTableRendererProps {
  /** Parsed Excel data: null = loading, [] = empty/error, [...] = data rows */
  data: () => Record<string, unknown>[] | null;
}

export function ExcelTableRenderer(props: ExcelTableRendererProps): JSX.Element {
  const columns = createMemo(() => {
    const rows = props.data();
    if (!rows || rows.length === 0) return [];
    const colSet = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        colSet.add(key);
      }
    }
    return Array.from(colSet);
  });

  return (
    <div style={{
      height: "100%",
      width: "100%",
      overflow: "auto",
      background: "var(--app-bg-elevated)",
      color: "var(--app-text-secondary)",
      "font-size": "12px",
      "font-family": "'Menlo', 'Monaco', 'Consolas', monospace",
    }}>
      <Show when={props.data() !== null} fallback={
        <div style={{ padding: "20px", "text-align": "center", color: "var(--app-text-dimmed)" }}>
          Parsing Excel…
        </div>
      }>
        <Show when={props.data()!.length > 0} fallback={
          <div style={{ padding: "20px", "text-align": "center", color: "var(--app-text-dimmed)" }}>
            No data found in file
          </div>
        }>
        <table style={{
          width: "100%",
          "border-collapse": "collapse",
          "table-layout": "auto",
        }}>
          <thead>
            <tr>
              <th style={{
                position: "sticky",
                top: 0,
                background: "var(--app-table-header-bg)",
                padding: "4px 8px",
                "text-align": "center",
                "border-bottom": "2px solid var(--app-table-border)",
                color: "var(--app-text-dimmed)",
                "font-size": "10px",
                "font-weight": "normal",
                "min-width": "30px",
              }}>#</th>
              <For each={columns()}>
                {(col) => (
                  <th style={{
                    position: "sticky",
                    top: 0,
                    background: "var(--app-table-header-bg)",
                    padding: "4px 8px",
                    "text-align": "left",
                    "border-bottom": "2px solid var(--app-table-border)",
                    color: "var(--app-accent-link)",
                    "font-weight": "600",
                    "white-space": "nowrap",
                  }}>{col}</th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={props.data()!}>
              {(row, idx) => (
                <tr style={{
                  background: idx() % 2 === 0 ? "transparent" : "var(--app-table-alt-row)",
                }}>
                  <td style={{
                    padding: "3px 8px",
                    "border-bottom": "1px solid var(--app-table-cell-border)",
                    color: "var(--app-text-dimmed)",
                    "text-align": "center",
                    "font-size": "10px",
                  }}>{idx() + 1}</td>
                  <For each={columns()}>
                    {(col) => (
                      <td style={{
                        padding: "3px 8px",
                        "border-bottom": "1px solid var(--app-table-cell-border)",
                        "white-space": "nowrap",
                      }}>
                        {formatCell(row[col])}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        </Show>
      </Show>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
