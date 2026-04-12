import { createEffect, createSignal, Show, type JSX } from "solid-js";
import { Box } from "@suid/material";
import { BasicCodeMirrorEditor } from "../codemirror/BasicCodeMirrorEditor";
import { ExcelTableRenderer } from "../excel/ExcelTableRenderer";
import { isExcelBase64, parseExcelViaWasm } from "../excel/excelUtils";

export const OUTPUT_FORMATS = [
  { id: "json", label: "JSON", language: "json" },
  { id: "xml", label: "XML", language: "xml" },
  { id: "yaml", label: "YAML", language: "yaml" },
  { id: "csv", label: "CSV", language: "plaintext" },
  { id: "text", label: "Plain Text", language: "plaintext" },
  { id: "dml", label: "DML", language: "datamorph" },
  { id: "xlsx", label: "Excel(XLSX)", language: "plaintext" },
] as const;

export type OutputFormatId = typeof OUTPUT_FORMATS[number]["id"];

interface OutputPaneProps {
  output: () => string;
  outputFormat: () => OutputFormatId;
  setOutputFormat: (value: OutputFormatId) => void;
  isPretty: () => boolean;
  setIsPretty: (v: boolean) => void;
  foldEnabled?: () => boolean;
}

export function OutputPane(props: OutputPaneProps): JSX.Element {
  const [excelOutputData, setExcelOutputData] = createSignal<Record<string, unknown>[] | null>(null);

  // Parse Excel output when format is xlsx and output looks like base64
  createEffect(() => {
    const raw = props.output();
    if (props.outputFormat() === "xlsx" && isExcelBase64(raw)) {
      setExcelOutputData(null);
      parseExcelViaWasm(raw, "XLSX").then(
        (data) => setExcelOutputData(data),
      );
    } else {
      setExcelOutputData(null);
    }
  });

  const isExcelOutput = () => props.outputFormat() === "xlsx" && isExcelBase64(props.output());

  return (
    <Box
      id="output-pane"
      sx={{ height: "100%", width: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Show when={isExcelOutput()} fallback={
          <BasicCodeMirrorEditor
            value={() => props.output()}
            onChange={() => {}}
            language={() => OUTPUT_FORMATS.find((f) => f.id === props.outputFormat())?.language ?? "plaintext"}
            options={{ fontSize: 12, wordWrap: "on", readOnly: true }}
            foldEnabled={props.foldEnabled}
          />
        }>
          <ExcelTableRenderer
            data={excelOutputData}
          />
        </Show>
      </Box>
    </Box>
  );
}
