import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";

import { Orientation, SplitviewSolid } from "@arminmajerie/dockview-solid";
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
import { isReservedInputId, type InputFormat, type PipelineInputItem, type ScriptItem, createUuid } from "./inputModel";

function Pane(props: { title: string; rightHeader?: JSX.Element; children: JSX.Element }) {
  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: 1,
        borderColor: "divider",
        minHeight: 0,
      }}
    >
      <div style={{ height: "4px", 'flex-wrap': 'nowrap', "flex-shrink": 0 }}>
      
      </div>
      <Box
        sx={{
          height: 20,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "nowrap",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: 0.5,
          flex: "0 0 auto",
          marginBottom: '4px',
          textTransform: 'uppercase',
        }}
      >
        <Box
          sx={{
            flex: "1 1 auto",
            minWidth: 0,          // critical for ellipsis in flex rows
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {props.title}
        </Box>
        
        <Box
          sx={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            gap: 1,
            whiteSpace: "nowrap",
          }}
        >
          {props.rightHeader}
        </Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", p: 1 }}>{props.children}</Box>
    </Box>
  );
}

export function LeftExplorer(props: {
  inputs: () => PipelineInputItem[];
  setInputs: (setter: (prev: PipelineInputItem[]) => PipelineInputItem[]) => void;
  selectedInputId: () => string;
  setSelectedInputId: (id: string) => void;
  editingInputId: () => string | null;
  setEditingInputId: (id: string | null) => void;
  // Script Explorer props
  scripts: () => ScriptItem[];
  setScripts: (setter: (prev: ScriptItem[]) => ScriptItem[]) => void;
  selectedScriptId: () => string;
  setSelectedScriptId: (id: string) => void;
}): JSX.Element {
  const [isCreateOpen, setIsCreateOpen] = createSignal(false);
  const [newIdentifier, setNewIdentifier] = createSignal("");
  const [varsExpanded, setVarsExpanded] = createSignal(true);
  const [createScope, setCreateScope] = createSignal<"top" | "vars">("top");
  
  // Script creation dialog state
  const [isScriptCreateOpen, setIsScriptCreateOpen] = createSignal(false);
  const [newScriptName, setNewScriptName] = createSignal("");

  let listRoot!: HTMLDivElement;

  const editingItem = createMemo<PipelineInputItem | null>(() => {
    const id = props.editingInputId();
    if (!id) return null;
    return props.inputs().find((i) => i.id === id) ?? null;
  });

  createEffect(() => {
    // 0&&console['log']("[InputExplorer] editingInputId:", props.editingInputId());
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

    KeyboardManager.registerShortcut({
      id: "scriptCreate.enter",
      command: "Create Script",
      defaultKey: "Enter",
      when: "scriptCreateDialog",
      worksInTextInputs: true,
      handler: (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!canCreateScript()) {return;}
        createNewScript();
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
    // 0&&console['log']("[InputExplorer] openEditor:", id);
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

  // Single click just selects, double-click opens editor
  const selectItem = (id: string) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    props.setSelectedInputId(id);
  };

  const openEditorOnDblClick = (id: string) => (e: MouseEvent) => {
    // 0&&console['log']("[InputExplorer] double-click:", { id });
    openEditor(id);
  };

  const handleVarsRowPointerUp = (e: PointerEvent) => {
    // Vars is a folder, not an editable input.
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

  // Script management functions
  const canCreateScript = createMemo(() => {
    const name = newScriptName().trim();
    if (!name) return false;
    // Must end with .dm
    if (!name.endsWith('.dm')) return false;
    // Must be a valid identifier before .dm
    const baseName = name.slice(0, -3);
    if (!baseName.match(/^[A-Za-z_][\w]*$/)) return false;
    // Must be unique
    return !props.scripts().some((s) => s.name === name);
  });

  const createNewScript = () => {
    if (!canCreateScript()) return;
    const name = newScriptName().trim();
    const id = createUuid();
    props.setScripts((prev) => [...prev, { 
      id, 
      name, 
      content: `// ${name}\n// Import this script in main.dm using:\n// import * from ${name.slice(0, -3)}\n\n`, 
      isMain: false 
    }]);
    setNewScriptName("");
    setIsScriptCreateOpen(false);
    props.setSelectedScriptId(id);
  };

  const removeScript = (id: string) => {
    const script = props.scripts().find((s) => s.id === id);
    if (!script || script.isMain) return;
    props.setScripts((prev) => {
      const nextList = prev.filter((s) => s.id !== id);
      // If we removed the selected script, select main
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

  const listAndScripts = (
    <SplitviewSolid
      style={{ width: "100%", height: "100%" }}
      orientation={Orientation.VERTICAL}
      proportionalLayout={true}
      styles={{ separatorBorder: "" }}
      components={{
        input: () => (
          <Pane
            title="INPUT"
            rightHeader={
              <IconButton
                size="small"
                onClick={() => {
                  setCreateScope("top");
                  setIsCreateOpen(true);
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            }
          >
            <Box ref={listRoot} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {props
                    .inputs()
                    .filter((item) => item.id !== "vars" && !(!varsExpanded() && !isReservedInputId(item.id)))
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
                          <Box sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.2, whiteSpace: "nowrap" }}>{item.id}</Box>
                          <Box sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>{item.format}</Box>
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
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Show>
                      </Box>
                    ))}

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
                        <Show when={varsExpanded()} fallback={<ChevronRightIcon fontSize="small" />}>
                          <ExpandMoreIcon fontSize="small" />
                        </Show>
                      </IconButton>
                      <Box sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.2, whiteSpace: "nowrap" }}>vars</Box>
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
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>

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
                              <Box sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>{item.format}</Box>
                            </Box>

                            <IconButton
                              size="small"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeInput(item.id);
                              }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                    </Box>
                  </Show>

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
                          <Box sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>{item.format}</Box>
                        </Box>

                        <IconButton
                          size="small"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeInput(item.id);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
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
          </Pane>
        ),
        scripts: () => (
          <Pane 
            title="SCRIPT"
            rightHeader={
              <IconButton size="small" onClick={() => setIsScriptCreateOpen(true)}>
                <AddIcon fontSize="small" />
              </IconButton>
            }
          >
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
                    bgcolor: props.selectedScriptId() === script.id ? "#0971f3" : "transparent",
                    "&:hover": { bgcolor: "rgba(109,0,250,0.33)" },
                  }}
                  onClick={() => selectScript(script.id)}
                >
                  <Box sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 1, 
                    minWidth: 0,
                    fontSize: 12,
                    fontWeight: script.isMain ? 600 : 400,
                  }}>
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

            <Dialog open={isScriptCreateOpen()}
                    onClose={() => {
                        setIsScriptCreateOpen(false);
                        KeyboardManager.clearContext('scriptCreateDialog');
                      }
                    }
                    fullWidth maxWidth="sm"
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
                      if (e.key === "Enter") {
                        // 0&&console['log']("[InputExplorer] Enter pressed in script name", {
                        //   context: KeyboardManager.getContext(),
                        //   canCreate: canCreateScript(),
                        //   isDialogOpen: isScriptCreateOpen(),
                        // });
                      }
                    }}
                    helperText={canCreateScript() ? "Script will be importable via: import * from " + newScriptName().slice(0, -3) : "Use format: name.dm (letters/numbers/underscore)"}
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
          </Pane>
        ),
      }}
      onReady={({ api }) => {
        api.addPanel({ id: "input", component: "input", params: {}, size: 150 });
        api.addPanel({ id: "scripts", component: "scripts", params: {}, size: 150 });
      }}
    />
  );

  // IMPORTANT: Solid components don't re-run on signal change.
  // Use <Show> for reactive branch switching.
  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <Show when={editingItem()} fallback={listAndScripts}>
        {(item) => {
          // 0&&console['log']("[InputExplorer] rendering editor for:", item()?.id);

          if (!item()) {
            props.setEditingInputId(null);
            return listAndScripts;
          }

          const editingId = item()!.id;

          return (
            <Pane
              title={String(editingId)}
              rightHeader={
                <Select
                  size="small"
                  value={item()!.format}
                  sx={{
                    minWidth: 80,
                    height: 20,
                    fontSize: 11,
                    backgroundColor: "background.paper",
                    borderRadius: 0.5,
                    "& .MuiSelect-select": {
                      py: 0,
                      display: "flex",
                      alignItems: "center",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "divider",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "divider",
                    },
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const fmt = e.target.value as InputFormat;
                    props.setInputs((prev) => prev.map((i) => (i.id === editingId ? { ...i, format: fmt } : i)));
                  }}
                  MenuProps={{ disablePortal: false, disableScrollLock: true }}
                >
                  <MenuItem value="JSON">JSON</MenuItem>
                  <MenuItem value="XML">XML</MenuItem>
                  <MenuItem value="YAML">YAML</MenuItem>
                  <MenuItem value="TEXT">TEXT</MenuItem>
                </Select>
              }
            >
              <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1, flex: "0 0 auto" }}>
                  <IconButton size="small" onPointerDown={(e) => e.stopPropagation()} onClick={closeEditor}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Box sx={{ ml: 1, fontSize: 12, color: "text.secondary" }}>Back to inputs</Box>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <BasicCodeMirrorEditor
                    value={() => (editingItem() ? editingItem()!.value : "")}
                    onChange={(val) => {
                      const editing = editingItem();
                      if (!editing) return;
                      props.setInputs((prev) => prev.map((i) => (i.id === editing.id ? { ...i, value: val } : i)));
                    }}
                    language={() => languageForFormat(editingItem()?.format ?? "TEXT")}
                    options={{
                      fontSize: 13,
                      wordWrap: "on",
                      tabSize: 2,
                    }}
                  />
                </Box>
              </Box>
            </Pane>
          );
        }}
      </Show>
    </Box>
  );
}
