import type { JSX } from "solid-js";
import { LogViewer } from "./LogViewer";

export function LogViewerPanel(): JSX.Element {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        "flex-direction": "column",
        overflow: "hidden",
        "min-height": "0px",
        "box-sizing": "border-box",
      }}
    >
      <LogViewer />
    </div>
  );
}
