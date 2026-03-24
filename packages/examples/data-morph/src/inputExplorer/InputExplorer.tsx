/**
 * InputExplorer — standalone panel for the INPUT list + editor.
 * Extracted from LeftExplorer so it can live as an independent DockviewSolid panel.
 */
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { KeyboardManager } from "@arminmajerie/keyboard-manager";

import AddIcon from "@suid/icons-material/Add";
import ArrowBackIcon from "@suid/icons-material/ArrowBack";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";
import DeleteOutlineIcon from "@suid/icons-material/DeleteOutline";
import ExpandMoreIcon from "@suid/icons-material/ExpandMore";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  TextField,
} from "@suid/material";

import { BasicCodeMirrorEditor } from "../codemirror/BasicCodeMirrorEditor";
import { isReservedInputId, type InputFormat, type PipelineInputItem } from "./inputModel";

export interface InputExplorerProps {
  inputs: () => PipelineInputItem[];
  setInputs: (setter: (prev: PipelineInputItem[]) => PipelineInputItem[]) => void;
  selectedInputId: () => string;
  setSelectedInputId: (id: string) => void;
  editingInputId: () => string | null;
  setEditingInputId: (id: string | null) => void;
  /** Called by parent to register a callback for triggering the create dialog */
  onRegisterCreate?: (trigger: () => void) => void;
}

export function InputExplorer(props: InputExplorerProps): JSX.Element {
  const [isCreateOpen, setIsCreateOpen] = createSignal(false);
  const [newIdentifier, setNewIdentifier] = createSignal("");
  const [varsExpanded, setVarsExpanded] = createSignal(true);
  const [createScope, setCreateScope] = createSignal<"top" | "vars">("top");

  let listRoot!: HTMLDivElement;

  // Expose the create trigger to the parent via callback registration
  onMount(() => {
    props.onRegisterCreate?.(() => {
      setCreateScope("top");
      setIsCreateOpen(true);
    });
  });

  const editingItem = createMemo<PipelineInputItem | null>(() => {
    const id = props.editingInputId();
    if (!id) return null;
    return props.inputs().find((i) => i.id === id) ?? null;
  });

  const languageForFormat = (fmt: InputFormat): string => {
    switch (fmt) {
      case "JSON":
        return "json";
      case "XML":
        return "xml";
      case "YAML":
        return "yaml";
      case "DML":
        return "datamorph";
      case "TEXT":
      default:
        return "plaintext";
    }
  };

  const canRemove = (id: string): boolean => !isReservedInputId(id);

  const removeInput = (id: string) => {
    if (!canRemove(id)) return;
    props.setInputs((prev) => {
      const nextList = prev.filter((i) => i.id !== id);
      if (props.selectedInputId() === id) {
        props.setSelectedInputId("payload");
      }
      return nextList;
    });
  };

  const normalizeJsonIfPossible = (text: string): string => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  };

  onMount(() => {
    KeyboardManager.registerShortcut({
      id: "inputExplorer.delete",
      command: "Delete Input",
      defaultKey: "Delete",
      when: "inputExplorer",
      handler: (e) => {
        e?.preventDefault();
        if (props.editingInputId()) return;
        removeInput(props.selectedInputId());
      },
    });

    const onPointerDown = (ev: PointerEvent) => {
      const t = ev.target as Node | null;
      if (!t) return;
      if (listRoot && listRoot.contains(t) && !props.editingInputId()) {
        KeyboardManager.setContext("inputExplorer");
      } else {
        KeyboardManager.clearContext("inputExplorer");
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown);
      KeyboardManager.clearContext("inputExplorer");
    });
  });

  createEffect(() => {
    if (props.editingInputId()) {
      KeyboardManager.clearContext("inputExplorer");
    }
  });

  const openEditor = (id: string) => {
    props.setSelectedInputId(id);
    props.setEditingInputId(id);
    props.setInputs((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (i.format !== "JSON") return i;
        return { ...i, value: normalizeJsonIfPossible(i.value) };
      })
    );
  };

  const selectItem = (id: string) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    props.setSelectedInputId(id);
  };

  const openEditorOnDblClick = (id: string) => (_e: MouseEvent) => {
    openEditor(id);
  };

  const handleVarsRowPointerUp = (e: PointerEvent) => {
    if (e.button !== 0) return;
    props.setSelectedInputId("vars");
    setVarsExpanded((v) => !v);
  };

  const closeEditor = () => {
    const id = props.editingInputId();
    if (!id) return;
    props.setInputs((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (i.format !== "JSON") return i;
        return { ...i, value: normalizeJsonIfPossible(i.value) };
      })
    );
    props.setEditingInputId(null);
  };

  const canCreate = createMemo(() => {
    const id = newIdentifier().trim();
    if (!id) return false;
    if (!id.match(/^[A-Za-z_][\w]*$/)) return false;
    return !props.inputs().some((i) => i.id === id);
  });

  const createNewInput = () => {
    if (!canCreate()) return;
    const id = newIdentifier().trim();
    props.setInputs((prev) => [...prev, { id, format: "JSON", value: "{}", scope: createScope() }]);
    setNewIdentifier("");
    setIsCreateOpen(false);
    setVarsExpanded(true);
    openEditor(id);
  };

  const inputList = (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/*<Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", px: 0.5, py: 0, minHeight: 24, flex: "0 0 auto" }}>*/}
      {/*  <IconButton*/}
      {/*    size="small"*/}
      {/*    sx={{ padding: "2px" }}*/}
      {/*    onClick={() => { setCreateScope("top"); setIsCreateOpen(true); }}*/}
      {/*    title="Add input"*/}
      {/*  >*/}
      {/*    <AddIcon sx={{ fontSize: 16, color: "#dcdce1" }} />*/}
      {/*  </IconButton>*/}
      {/*</Box>*/}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1 }}>
      <Box ref={listRoot} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {/* Top-scope reserved inputs (payload, attributes, correlationId) */}
        {props
          .inputs()
          .filter((item) => isReservedInputId(item.id) && item.id !== "vars")
          .map((item) => (
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
                py: 0.75,
                borderRadius: 1,
                cursor: "pointer",
                bgcolor: props.selectedInputId() === item.id ? "#0971f3" : "transparent",
                "&:hover": { bgcolor: "rgba(109,0,250,0.33)" },
              }}
              onPointerUp={selectItem(item.id)}
              onDblClick={openEditorOnDblClick(item.id)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.2, whiteSpace: "nowrap" }}>
                  {item.id}
                </Box>
                <Box sx={{ fontSize: 12, color: "#85ea3f", whiteSpace: "nowrap" }}>
                  {item.format}
                </Box>
              </Box>
              <Show when={canRemove(item.id)}>
                <IconButton
                  size="small"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeInput(item.id);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" sx={{ color: "#dcdce1", }}  />
                </IconButton>
              </Show>
            </Box>
          ))}

        {/* Vars folder row */}
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
            py: 0.75,
            borderRadius: 1,
            cursor: "pointer",
            bgcolor: props.selectedInputId() === "vars" ? "#0971f3" : "transparent",
            "&:hover": { bgcolor: "rgba(109,0,250,0.33)" },
          }}
          onPointerUp={handleVarsRowPointerUp}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <IconButton
              size="small"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setVarsExpanded((v) => !v);
              }}
            >
              <Show when={varsExpanded()} fallback={<ChevronRightIcon fontSize="small" sx={{ color: "#dcdce1" }} />}>
                <ExpandMoreIcon fontSize="small" sx={{ color: "#dcdce1" }}/>
              </Show>
            </IconButton>
            <Box sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.2, whiteSpace: "nowrap" }}>
              vars
            </Box>
          </Box>
          <IconButton
            size="small"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setCreateScope("vars");
              setIsCreateOpen(true);
            }}
          >
            <AddIcon fontSize="small" sx={{ color: "#dcdce1" }}/>
          </IconButton>
        </Box>

        {/* Vars children */}
        <Show when={varsExpanded()}>
          <Box sx={{ pl: 3, display: "flex", flexDirection: "column", gap: 0.5 }}>
            {props
              .inputs()
              .filter((i) => !isReservedInputId(i.id))
              .filter((i) => (i.scope ?? "top") === "vars")
              .map((item) => (
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
                    bgcolor: props.selectedInputId() === item.id ? "#0971f3" : "transparent",
                    "&:hover": { bgcolor: "rgba(109,0,250,0.33)" },
                  }}
                  onPointerUp={selectItem(item.id)}
                  onDblClick={openEditorOnDblClick(item.id)}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Box sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{item.id}</Box>
                    <Box sx={{ fontSize: 12, color: "#583ddc", whiteSpace: "nowrap" }}>
                      {item.format}
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeInput(item.id);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" sx={{ color: "#dcdce1", }}  />
                  </IconButton>
                </Box>
              ))}
          </Box>
        </Show>

        {/* Top-scope custom inputs */}
        {props
          .inputs()
          .filter((i) => !isReservedInputId(i.id))
          .filter((i) => (i.scope ?? "top") === "top")
          .map((item) => (
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
                py: 0.75,
                borderRadius: 1,
                cursor: "pointer",
                bgcolor: props.selectedInputId() === item.id ? "#0971f3" : "transparent",
                "&:hover": { bgcolor: "rgba(109,0,250,0.33)" },
              }}
              onPointerUp={selectItem(item.id)}
              onDblClick={openEditorOnDblClick(item.id)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{item.id}</Box>
                <Box sx={{ fontSize: 12, color: "#52a4ed", whiteSpace: "nowrap" }}>
                  {item.format}
                </Box>
              </Box>
              <IconButton
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  removeInput(item.id);
                }}
              >
                <DeleteOutlineIcon fontSize="small" sx={{ color: "#dcdce1" }} />
              </IconButton>
            </Box>
          ))}
      </Box>

      <Dialog open={isCreateOpen()} onClose={() => setIsCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create new input</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Identifier"
              value={newIdentifier()}
              onChange={(e) => setNewIdentifier(e.target.value)}
              helperText={canCreate() ? "" : "Use letters/numbers/underscore; must be unique"}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setIsCreateOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!canCreate()} onClick={createNewInput}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <Show when={editingItem()} fallback={inputList}>
        {(item) => {
          if (!item()) {
            props.setEditingInputId(null);
            return inputList;
          }
          const editingId = item()!.id;
          return (
            <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <Box sx={{
                height: 28,
                px: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: 1,
                borderColor: "divider",
                flex: "0 0 auto",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <IconButton size="small" onPointerDown={(e) => e.stopPropagation()} onClick={closeEditor}>
                    <ArrowBackIcon fontSize="small" sx={{ color: "#dcdce1" }}/>
                  </IconButton>
                  <Box sx={{ fontSize: 12, fontWeight: 600 }}>{String(editingId)}</Box>
                </Box>
                <Select
                  size="small"
                  value={item()!.format}
                  sx={{
                    minWidth: 80,
                    height: 20,
                    fontSize: 11,
                    backgroundColor: "background.paper",
                    borderRadius: 0.5,
                    "& .MuiSelect-select": { py: 0, display: "flex", alignItems: "center" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const fmt = e.target.value as InputFormat;
                    props.setInputs((prev) =>
                      prev.map((i) => (i.id === editingId ? { ...i, format: fmt } : i))
                    );
                  }}
                  MenuProps={{ disablePortal: false, disableScrollLock: true }}
                >
                  <MenuItem value="JSON">JSON</MenuItem>
                  <MenuItem value="XML">XML</MenuItem>
                  <MenuItem value="YAML">YAML</MenuItem>
                  <MenuItem value="TEXT">TEXT</MenuItem>
                  <MenuItem value="DML">DML</MenuItem>
                </Select>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <BasicCodeMirrorEditor
                  value={() => (editingItem() ? editingItem()!.value : "")}
                  onChange={(val) => {
                    const editing = editingItem();
                    if (!editing) return;
                    props.setInputs((prev) =>
                      prev.map((i) => (i.id === editing.id ? { ...i, value: val } : i))
                    );
                  }}
                  language={() => languageForFormat(editingItem()?.format ?? "TEXT")}
                  options={{ fontSize: 13, wordWrap: "on", tabSize: 2 }}
                />
              </Box>
            </Box>
          );
        }}
      </Show>
    </Box>
  );
}
