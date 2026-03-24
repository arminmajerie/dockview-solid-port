/**
 * ScriptExplorer — standalone panel for the SCRIPT file list + creation.
 * Extracted from LeftExplorer so it can live as an independent DockviewSolid panel.
 */
import { createMemo, createSignal, onMount, Show, type JSX } from "solid-js";
import { KeyboardManager } from "@arminmajerie/keyboard-manager";

import AddIcon from "@suid/icons-material/Add";
import DeleteOutlineIcon from "@suid/icons-material/DeleteOutline";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@suid/material";

import { type ScriptItem, createUuid } from "./inputModel";

export interface ScriptExplorerProps {
  scripts: () => ScriptItem[];
  setScripts: (setter: (prev: ScriptItem[]) => ScriptItem[]) => void;
  selectedScriptId: () => string;
  setSelectedScriptId: (id: string) => void;
  /** Called by parent to register a callback for triggering the create dialog */
  onRegisterCreate?: (trigger: () => void) => void;
}

export function ScriptExplorer(props: ScriptExplorerProps): JSX.Element {
  const [isScriptCreateOpen, setIsScriptCreateOpen] = createSignal(false);
  const [newScriptName, setNewScriptName] = createSignal("");

  // Expose the create trigger to the parent via callback registration
  onMount(() => {
    props.onRegisterCreate?.(() => {
      setIsScriptCreateOpen(true);
    });
  });

  const canCreateScript = createMemo(() => {
    const name = newScriptName().trim();
    if (!name) return false;
    if (!name.endsWith(".dm")) return false;
    const baseName = name.slice(0, -3);
    if (!baseName.match(/^[A-Za-z_][\w]*$/)) return false;
    return !props.scripts().some((s) => s.name === name);
  });

  const createNewScript = () => {
    if (!canCreateScript()) return;
    const name = newScriptName().trim();
    const id = createUuid();
    props.setScripts((prev) => [
      ...prev,
      {
        id,
        name,
        content: `// ${name}\n// Import this script in main.dm using:\n// import * from ${name.slice(0, -3)}\n\n`,
        isMain: false,
      },
    ]);
    setNewScriptName("");
    setIsScriptCreateOpen(false);
    props.setSelectedScriptId(id);
  };

  const removeScript = (id: string) => {
    const script = props.scripts().find((s) => s.id === id);
    if (!script || script.isMain) return;
    props.setScripts((prev) => {
      const nextList = prev.filter((s) => s.id !== id);
      if (props.selectedScriptId() === id) {
        const mainScript = nextList.find((s) => s.isMain);
        if (mainScript) props.setSelectedScriptId(mainScript.id);
      }
      return nextList;
    });
  };

  const selectScript = (id: string) => {
    props.setSelectedScriptId(id);
  };

  return (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/*<Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", px: 0.5, py: 0, minHeight: 24, flex: "0 0 auto" }}>*/}
      {/*  <IconButton*/}
      {/*    size="small"*/}
      {/*    sx={{ padding: "2px" }}*/}
      {/*    onClick={() => setIsScriptCreateOpen(true)}*/}
      {/*    title="Add script"*/}
      {/*  >*/}
      {/*    <AddIcon sx={{ fontSize: 16 }} />*/}
      {/*  </IconButton>*/}
      {/*</Box>*/}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {props.scripts().map((script) => (
          <Box
            component="button"
            type="button"
            sx={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1,
              py: 0.6,
              borderRadius: 1,
              cursor: "pointer",
              bgcolor: props.selectedScriptId() === script.id ? "#0971f3": "transparent",
              "&:hover": { bgcolor: "rgba(109,0,250,0.33)" },
            }}
            onClick={() => selectScript(script.id)}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                minWidth: 0,
                fontSize: 12,
                fontWeight: script.isMain ? 600 : 400,
              }}
            >
              {script.name}
            </Box>
            <Show when={!script.isMain}>
              <IconButton
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  removeScript(script.id);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Show>
          </Box>
        ))}
      </Box>

      <Dialog
        open={isScriptCreateOpen()}
        onClose={() => {
          setIsScriptCreateOpen(false);
          KeyboardManager.clearContext("scriptCreateDialog");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create new script</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Script name"
              placeholder="example.dm"
              value={newScriptName()}
              onChange={(e) => setNewScriptName(e.target.value)}
              onFocus={() => KeyboardManager.setContext("scriptCreateDialog")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreateScript()) {
                  createNewScript();
                }
              }}
              helperText={
                canCreateScript()
                  ? "Script will be importable via: import * from " + newScriptName().slice(0, -3)
                  : "Use format: name.dm (letters/numbers/underscore)"
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setIsScriptCreateOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!canCreateScript()} onClick={createNewScript}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}
