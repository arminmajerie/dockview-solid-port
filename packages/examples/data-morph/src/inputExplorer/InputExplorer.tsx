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
import UploadFileIcon from "@suid/icons-material/UploadFile";
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
import { ExcelTableRenderer } from "../excel/ExcelTableRenderer";
import { fileToBase64, parseExcelViaWasm } from "../excel/excelUtils";
import { PdfViewer } from "./PdfViewer";
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

  let listRoot: HTMLDivElement | undefined;
  const [inputFoldEnabled, setInputFoldEnabled] = createSignal(false);

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
      case "XLSX":
      case "XLS":
      case "TEXT":
      default:
        return "plaintext";
    }
  };

  const isExcelFormat = (fmt: InputFormat): boolean => fmt === "XLSX" || fmt === "XLS";
  const isPdfFormat = (fmt: InputFormat): boolean => fmt === "PDF";
  const isBinaryFormat = (fmt: InputFormat): boolean => isExcelFormat(fmt) || isPdfFormat(fmt);

  // Excel preview data for the table renderer
  const [excelPreviewData, setExcelPreviewData] = createSignal<Record<string, unknown>[] | null>(null);

  // When the editing item changes or its format/binaryPayload changes, parse Excel for preview
  createEffect(() => {
    const item = editingItem();
    if (!item || !isExcelFormat(item.format) || !item.binaryPayload) {
      setExcelPreviewData(null);
      return;
    }
    setExcelPreviewData(null);
    parseExcelViaWasm(item.binaryPayload, item.format as "XLSX" | "XLS").then(
      (data) => setExcelPreviewData(data),
    );
  });

  const clearBinaryFile = (editingId: string) => {
    props.setInputs((prev) =>
      prev.map((i) =>
        i.id === editingId
          ? { ...i, value: "", binaryPayload: undefined, fileName: undefined }
          : i,
      ),
    );
    setExcelPreviewData(null);
  };

  const handleExcelFile = async (file: File, editingId: string) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const format: InputFormat = ext === "xls" ? "XLS" : "XLSX";
    const base64 = await fileToBase64(file);
    props.setInputs((prev) =>
      prev.map((i) =>
        i.id === editingId
          ? { ...i, format, value: `[Excel file: ${file.name}]`, binaryPayload: base64, fileName: file.name }
          : i,
      ),
    );
  };

  const handlePdfFile = async (file: File, editingId: string) => {
    const base64 = await fileToBase64(file);
    props.setInputs((prev) =>
      prev.map((i) =>
        i.id === editingId
          ? { ...i, format: "PDF" as InputFormat, value: `[PDF file: ${file.name}]`, binaryPayload: base64, fileName: file.name }
          : i,
      ),
    );
  };

  const handleBinaryFile = async (file: File, editingId: string) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") {
      await handlePdfFile(file, editingId);
    } else {
      await handleExcelFile(file, editingId);
    }
  };

  const openFilePicker = (editingId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.pdf";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleBinaryFile(file, editingId);
    };
    input.click();
  };

  const handleDrop = (e: DragEvent, editingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "pdf") return;
    handleBinaryFile(file, editingId);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
                overflow: "hidden",
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "0 0 auto" }}>
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
                  sx={{ flexShrink: 0 }}
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
            overflow: "hidden",
            px: 1,
            py: 0.75,
            borderRadius: 1,
            cursor: "pointer",
            bgcolor: props.selectedInputId() === "vars" ? "#0971f3" : "transparent",
            "&:hover": { bgcolor: "rgba(109,0,250,0.33)" },
          }}
          onPointerUp={handleVarsRowPointerUp}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "0 0 auto" }}>
            <IconButton
              size="small"
              sx={{ flexShrink: 0 }}
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
            sx={{ flexShrink: 0 }}
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
                    overflow: "hidden",
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "0 0 auto" }}>
                    <Box sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{item.id}</Box>
                    <Box sx={{ fontSize: 12, color: "#583ddc", whiteSpace: "nowrap" }}>
                      {item.format}
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    sx={{ flexShrink: 0 }}
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
                overflow: "hidden",
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "0 0 auto" }}>
                <Box sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{item.id}</Box>
                <Box sx={{ fontSize: 12, color: "#52a4ed", whiteSpace: "nowrap" }}>
                  {item.format}
                </Box>
              </Box>
              <IconButton
                size="small"
                sx={{ flexShrink: 0 }}
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
            <Box
              sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
              onDragOver={handleDragOver}
              onDrop={(e: DragEvent) => handleDrop(e, editingId)}
            >
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Show when={isExcelFormat(item()!.format)}>
                    <button
                      title="Select Excel file"
                      onClick={() => openFilePicker(editingId)}
                      style={{
                        cursor: "pointer",
                        background: "transparent",
                        border: "1px solid #3a3d54",
                        "border-radius": "4px",
                        color: "#89b4fa",
                        "font-size": "11px",
                        "font-weight": "600",
                        padding: "1px 8px",
                        height: "20px",
                        "line-height": "18px",
                        "white-space": "nowrap",
                        display: "flex",
                        "align-items": "center",
                        gap: "4px",
                      }}
                    >
                      <UploadFileIcon sx={{ fontSize: 14 }} />
                      Select File
                    </button>
                  </Show>
                  <Show when={isPdfFormat(item()!.format)}>
                    <button
                      title="Select PDF file"
                      onClick={() => openFilePicker(editingId)}
                      style={{
                        cursor: "pointer",
                        background: "transparent",
                        border: "1px solid #3a3d54",
                        "border-radius": "4px",
                        color: "#89b4fa",
                        "font-size": "11px",
                        "font-weight": "600",
                        padding: "1px 8px",
                        height: "20px",
                        "line-height": "18px",
                        "white-space": "nowrap",
                        display: "flex",
                        "align-items": "center",
                        gap: "4px",
                      }}
                    >
                      <UploadFileIcon sx={{ fontSize: 14 }} />
                      Select File
                    </button>
                  </Show>
                  <Show when={!isExcelFormat(item()!.format) && (item()!.format === "JSON" || item()!.format === "XML")}>
                    <button
                      title={inputFoldEnabled() ? "Disable collapsing" : "Enable collapsing"}
                      aria-label={inputFoldEnabled() ? "Disable collapsing" : "Enable collapsing"}
                      aria-pressed={inputFoldEnabled()}
                      onClick={() => setInputFoldEnabled(!inputFoldEnabled())}
                      style={{
                        cursor: "pointer",
                        background: inputFoldEnabled() ? "rgba(99,179,237,0.18)" : "transparent",
                        border: "1px solid",
                        "border-color": inputFoldEnabled() ? "rgba(99,179,237,0.55)" : "#3a3d54",
                        "border-radius": "4px",
                        color: inputFoldEnabled() ? "#63b3ed" : "#e0e3ef",
                        "font-size": "11px",
                        padding: "1px 5px",
                        height: "20px",
                        "line-height": "18px",
                        display: "flex",
                        "align-items": "center",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="4 6 4 2 20 2 20 6"/>
                        <polyline points="4 18 4 22 20 22 20 18"/>
                        <line x1="2" y1="12" x2="10" y2="12"/>
                        <line x1="14" y1="12" x2="22" y2="12"/>
                        <polyline points="7 9 10 12 7 15"/>
                        <polyline points="17 9 14 12 17 15"/>
                      </svg>
                    </button>
                  </Show>
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
                    <MenuItem value="XLSX">Excel(XLSX)</MenuItem>
                    <MenuItem value="XLS">Excel(XLS)</MenuItem>
                    <MenuItem value="PDF">PDF</MenuItem>
                  </Select>
                </Box>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <Show when={isBinaryFormat(item()!.format)} fallback={
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
                    foldEnabled={inputFoldEnabled}
                  />
                }>
                  <Show when={item()!.binaryPayload} fallback={
                    <Box
                      onDragOver={handleDragOver}
                      onDrop={(e: DragEvent) => handleDrop(e, editingId)}
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        color: "#6c7086",
                        background: "rgba(30,30,46,0.6)",
                        cursor: "pointer",
                        border: "2px dashed #45475a",
                        borderRadius: 2,
                        m: 1,
                        "&:hover": { borderColor: "#89b4fa", color: "#89b4fa" },
                      }}
                      onClick={() => openFilePicker(editingId)}
                    >
                      <UploadFileIcon sx={{ fontSize: 48 }} />
                      <Box sx={{ fontSize: 14, fontWeight: 600 }}>
                        Drop {isPdfFormat(item()!.format) ? "a PDF" : "an Excel"} file here
                      </Box>
                      <Box sx={{ fontSize: 12 }}>
                        or click to select a .{item()!.format.toLowerCase()} file
                      </Box>
                    </Box>
                  }>
                    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      <Box sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 1,
                        py: 0.25,
                        borderBottom: "1px solid #313244",
                        flex: "0 0 auto",
                      }}>
                        <Box sx={{ fontSize: 11, color: "#89b4fa", fontWeight: 600 }}>
                          {item()!.fileName ?? (isPdfFormat(item()!.format) ? "PDF file" : "Excel file")}
                        </Box>
                        <button
                          title="Remove file"
                          onClick={() => clearBinaryFile(editingId)}
                          style={{
                            cursor: "pointer",
                            background: "transparent",
                            border: "none",
                            color: "#f38ba8",
                            "font-size": "14px",
                            "font-weight": "bold",
                            padding: "0 4px",
                            "line-height": "1",
                          }}
                        >
                          ✕
                        </button>
                      </Box>
                      <Box sx={{ flex: 1, minHeight: 0 }}>
                        <Show when={isExcelFormat(item()!.format)} fallback={
                          <PdfViewer base64={item()!.binaryPayload!} />
                        }>
                          <ExcelTableRenderer
                            data={excelPreviewData}
                          />
                        </Show>
                      </Box>
                    </Box>
                  </Show>
                </Show>
              </Box>
            </Box>
          );
        }}
      </Show>
    </Box>
  );
}
