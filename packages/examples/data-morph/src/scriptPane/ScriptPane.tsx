import type { JSX, Accessor } from "solid-js";
import { Box } from "@suid/material";
import { DataMorphCodeMirrorEditor } from "../codemirror/DataMorphCodeMirrorEditor";

type DataMorphContext = {
  payloadFormat?: string;
  payload?: unknown;
  attributes?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  error?: unknown;
  [key: string]: unknown;
};

interface ScriptPaneProps {
  title: Accessor<string>;
  value: Accessor<string>;
  onChange: (value: string) => void;
  getContext: () => DataMorphContext;
}

export function ScriptPane(props: ScriptPaneProps): JSX.Element {
  return (
    <Box
      id="script-pane"
      sx={{ height: "100%", width: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataMorphCodeMirrorEditor
          value={props.value}
          onChange={props.onChange}
          getContext={props.getContext}
          options={{ fontSize: 12, wordWrap: "on" }}
        />
      </Box>
    </Box>
  );
}
