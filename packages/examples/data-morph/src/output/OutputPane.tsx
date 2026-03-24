import type { JSX } from "solid-js";
import { Box } from "@suid/material";
import { BasicCodeMirrorEditor } from "../codemirror/BasicCodeMirrorEditor";

export const OUTPUT_FORMATS = [
  { id: "json", label: "JSON", language: "json" },
  { id: "xml", label: "XML", language: "xml" },
  { id: "yaml", label: "YAML", language: "yaml" },
  { id: "csv", label: "CSV", language: "plaintext" },
  { id: "text", label: "Plain Text", language: "plaintext" },
  { id: "dml", label: "DML", language: "datamorph" },
] as const;

export type OutputFormatId = typeof OUTPUT_FORMATS[number]["id"];

interface OutputPaneProps {
  output: () => string;
  outputFormat: () => OutputFormatId;
  setOutputFormat: (value: OutputFormatId) => void;
  isPretty: () => boolean;
  setIsPretty: (v: boolean) => void;
}

export function OutputPane(props: OutputPaneProps): JSX.Element {
  return (
    <Box
      id="output-pane"
      sx={{ height: "100%", width: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <BasicCodeMirrorEditor
          value={() => props.output()}
          onChange={() => {}}
          language={() => OUTPUT_FORMATS.find((f) => f.id === props.outputFormat())?.language ?? "plaintext"}
          options={{ fontSize: 12, wordWrap: "on", readOnly: true }}
        />
      </Box>
    </Box>
  );
}
