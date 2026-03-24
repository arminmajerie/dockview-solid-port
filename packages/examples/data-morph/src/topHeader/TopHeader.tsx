import { For, Show, type JSX } from "solid-js";
import { Box, Button, IconButton, Typography } from "@suid/material";
import RestoreFromTrashSharpIcon from "@suid/icons-material/RestoreFromTrashSharp";
import ExportSVG from "../svg/ExportSVG";
import ImportSVG from "../svg/ImportSVG";

interface TopHeaderProps {
  height?: number;
  onImport: () => void;
  onExport: () => void;
  onReset: () => void;
  collapsedPanels?: ReadonlyArray<{
    groupId: string;
    title: string;
  }>;
  onRestorePanel?: (groupId: string) => void;
}

export function TopHeader(props: TopHeaderProps): JSX.Element {
  const height = props.height ?? 30;

  return (
    <Box
      class="topHeaderRoot"
      sx={{
        height: `calc(${height}px + env(safe-area-inset-top, 0px))`,
        "min-height": `calc(${height}px + env(safe-area-inset-top, 0px))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        pt: "env(safe-area-inset-top, 0px)",
        borderBottom: "1px solid #2a2d44",
        flex: "0 0 auto",
        flexDirection: "row",
        backgroundColor: "#0d0f1a",
        color: "#c8ccd8",
        gap: 1.5,
        overflow: "hidden",
        position: "relative",
        "z-index": 20,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "0 1 auto", "min-width": 0 }}>
        <IconButton
          size="small"
          onClick={props.onReset}
          title="Reset workspace"
          aria-label="Reset workspace"
          sx={{ color: "#c8ccd8" }}
        >
          <RestoreFromTrashSharpIcon fontSize="small" />
        </IconButton>
        <Box class="topHeaderBrand" sx={{ fontWeight: 600, letterSpacing: 0.3, color: "#e0e3ef", "white-space": "nowrap" }}>
          DataMorph Studio
        </Box>
      </Box>

      <Show when={(props.collapsedPanels?.length ?? 0) > 0}>
        <Box
          class="topHeaderCollapsedTray"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: "1 1 auto",
            "min-width": 0,
            overflow: "auto hidden",
            "scrollbar-width": "thin",
          }}
        >
          <For each={props.collapsedPanels}>
            {(panel) => (
              <Button
                variant="outlined"
                size="small"
                onClick={() => props.onRestorePanel?.(panel.groupId)}
                sx={{
                  flex: "0 0 auto",
                  color: "#e0e3ef",
                  borderColor: "#3a3d54",
                  backgroundColor: "rgba(30,32,53,0.85)",
                  "text-transform": "none",
                  "font-size": "11px",
                  "line-height": 1.1,
                  "min-width": "unset",
                  px: 1.2,
                  py: 0.4,
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: "#6c5ce7",
                    backgroundColor: "rgba(108,92,231,0.16)",
                  },
                }}
              >
                {panel.title}
              </Button>
            )}
          </For>
        </Box>
      </Show>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          height: "100%",
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingRight: "1ch",
          flex: "0 0 auto",
          "min-width": 0,
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: "transparent",
            whiteSpace: "nowrap",
            flex: "1 1 fit-content",
            minWidth: 20,
            cursor: "pointer",
            "&:hover": { opacity: 0.7 },
          }}
          onClick={props.onImport}
        >
          <IconButton sx={{ marginLeft: "5px", color: "#c8ccd8" }}>
            <ImportSVG width={20} height={20} color={"#a9ed8e"}/>
          </IconButton>

          <Typography align="left" variant="inherit" noWrap={true} class="textareaName topHeaderActionLabel" sx={{ color: "#c8ccd8" }}>
            {"Import"}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: "transparent",
            whiteSpace: "nowrap",
            minWidth: 20,
            cursor: "pointer",
            "&:hover": { opacity: 0.7 },
          }}
          onClick={props.onExport}
        >
          <IconButton sx={{ marginLeft: "5px", marginRight: "-2px", color: "#c8ccd8" }}>
            <ExportSVG width={27} height={20} color={"#5889f8"}/>
          </IconButton>

          <Typography align="right" variant="inherit" noWrap={true} class="textareaName topHeaderActionLabel" sx={{ color: "#c8ccd8" }}>
            {"Export"}
          </Typography>
        </Box>

        <Box
          class="topHeaderDivider"
          sx={{
            mx: 2,
            alignSelf: "center",
            width: "1px",
            height: "60%",
            backgroundColor: "#2a2d44",
            flex: "0 0 auto",
          }}
        />
      </Box>
    </Box>
  );
}
