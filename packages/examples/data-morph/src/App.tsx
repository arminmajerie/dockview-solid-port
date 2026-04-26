import { createEffect, createMemo, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";

import "@arminmajerie/dockview-solid/styles/dockview.css";
import {
  Orientation,
  SplitviewSolid,
  DockviewSolid,
  type SplitviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewPanelHeaderProps,
  type IDockviewHeaderActionsProps,
  type DockviewApi,
  themeReplit,
} from "@arminmajerie/dockview-solid";
import { KeyboardManager } from "@arminmajerie/keyboard-manager";
import { logService, LogViewerPanel } from "./logViewer";
import ListIcon from '@suid/icons-material/List';
import ContentPasteSearchIcon from '@suid/icons-material/ContentPasteSearch';
import MenuBookIcon from '@suid/icons-material/MenuBook';

import { Box, Button, IconButton, Typography } from "@suid/material";
import { InputExplorer } from "./inputExplorer/InputExplorer";
import { ScriptExplorer } from "./inputExplorer/ScriptExplorer";
import type { PipelineInputItem, ScriptItem } from "./inputExplorer/inputModel";
import { createUuid } from "./inputExplorer/inputModel";
import { loadDataMorphWasm, parseWasmEnvelope } from "./util/dataMorphWasmLoader";
import { exportPlayground, openImportDialog } from "./util/importExport";
import { prettyPrintJson, prettyPrintXml, compactXml } from "./util/prettyPrintJson";
import { TopHeader } from "./topHeader/TopHeader";
import { OutputPane, type OutputFormatId } from "./output/OutputPane";
import { ScriptPane } from "./scriptPane/ScriptPane";
import { downloadBase64AsFile, isExcelBase64 } from "./excel/excelUtils";


function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function safeObject(text: string): Record<string, unknown> {
  const parsed = safeJsonParse(text);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  return {};
}

function payloadValue(input: PipelineInputItem | undefined): unknown {
  if (!input) return undefined;
  switch (input.format) {
    case "JSON":
      return safeJsonParse(input.value);
    case "XLSX":
    case "XLS":
    case "PDF":
      // For binary formats (Excel, PDF), return the base64-encoded binary data
      return input.binaryPayload ?? input.value;
    case "TEXT":
    case "XML":
    case "YAML":
    case "DML":
    default:
      return input.value;
  }
}

/**
 * Extract the output format from a script's `output application/xxx` directive.
 * Returns the format id (json, xml, yaml, csv, text) or null if not found.
 */
function extractOutputFormatFromScript(script: string): OutputFormatId | null {
  // Match lines like: output application/json, output application/xml, etc.
  // Also handles: output text/plain, output text/csv
  const lines = script.split('\n');
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    // Stop at --- separator (end of header)
    if (trimmed === '---') break;
    
    // Match output directive
    if (trimmed.startsWith('output ')) {
      const rest = trimmed.slice(7).trim(); // Remove "output "
      
      // Handle application/xxx formats
      if (rest.startsWith('application/')) {
        const format = rest.slice(12).split(/\s/)[0]; // Get format after "application/"
        if (format === 'json') return 'json';
        if (format === 'xml') return 'xml';
        if (format === 'yaml') return 'yaml';
        if (format === 'csv') return 'csv';
        if (format === 'dm' || format === 'dml') return 'dml';
        if (format === 'xlsx' || format === 'xls' || format === 'excel') return 'xlsx';
      }
      // Handle text formats
      if (rest.startsWith('text/')) {
        const format = rest.slice(5).split(/\s/)[0];
        if (format === 'plain') return 'text';
        if (format === 'csv') return 'csv';
        if (format === 'xml') return 'xml';
      }
      // Handle shorthand formats
      if (rest.startsWith('json')) return 'json';
      if (rest.startsWith('xml')) return 'xml';
      if (rest.startsWith('yaml')) return 'yaml';
      if (rest.startsWith('csv')) return 'csv';
      if (rest.startsWith('text')) return 'text';
      if (rest.startsWith('xlsx') || rest.startsWith('xls') || rest.startsWith('excel')) return 'xlsx';
    }
  }
  return null;
}

const STORAGE_KEY = "data-morph-playground-state-v1";

type StoredState = {
  inputs: PipelineInputItem[];
  scripts: ScriptItem[];
  selectedScriptId?: string;
  selectedInputId?: string;
};

function loadStoredState(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredState;
  } catch {
    return null;
  }
}

function saveStoredState(state: StoredState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

function normalizeModuleName(name: string): string {
  return name.endsWith(".dm") ? name.slice(0, -3) : name;
}

async function registerCustomModules(
  wasm: Awaited<ReturnType<typeof loadDataMorphWasm>>,
  scripts: ScriptItem[]
): Promise<void> {
  if (!wasm || typeof wasm.register_module !== "function") return;

  if (typeof wasm.clear_modules === "function") {
    try {
      wasm.clear_modules();
    } catch {
      // ignore
    }
  }

  for (const script of scripts) {
    if (script.isMain) continue;
    const moduleName = normalizeModuleName(script.name);
    if (!moduleName) continue;
    try {
      wasm.register_module(moduleName, script.content ?? "");
    } catch {
      // ignore registration failures; evaluation will surface errors
    }
  }
}

const DEFAULT_MAIN_SCRIPT = `output application/json
---
payload.DataMorph`;

// Managed by the DataMorphPlayground build and publish scripts.
const JAVA_SDK_DOWNLOADS = {
  version: "1.21.5",
  jarUrl: "https://repo1.maven.org/maven2/io/github/arminmajerie/data-morph-java-sdk/1.21.5/data-morph-java-sdk-1.21.5.jar",
  javadocUrl: "https://repo1.maven.org/maven2/io/github/arminmajerie/data-morph-java-sdk/1.21.5/data-morph-java-sdk-1.21.5-javadoc.jar",
  sourcesUrl: "https://repo1.maven.org/maven2/io/github/arminmajerie/data-morph-java-sdk/1.21.5/data-morph-java-sdk-1.21.5-sources.jar",
} as const;

function createDefaultState(): {
  mainScriptId: string;
  inputs: PipelineInputItem[];
  scripts: ScriptItem[];
  selectedInputId: string;
  selectedScriptId: string;
} {
  const mainScriptId = createUuid();
  return {
    mainScriptId,
    inputs: [
      { id: "payload", format: "JSON", value: "{\n  \"DataMorph\": \"Hello DataMorph!\"\n}", locked: true, scope: "top" },
      { id: "attributes", format: "JSON", value: "{}", locked: true, scope: "top" },
      { id: "vars", format: "JSON", value: "{}", locked: true, scope: "vars" },
      { id: "correlationId", format: "TEXT", value: createUuid(), locked: true, scope: "top" },
    ],
    scripts: [
      { id: mainScriptId, name: "main.dm", content: DEFAULT_MAIN_SCRIPT, isMain: true },
    ],
    selectedInputId: "payload",
    selectedScriptId: mainScriptId,
  };
}

export default function App(): JSX.Element {
  type CollapsedDockviewGroup = {
    groupId: string;
    title: string;
  };

  type TopDockviewGroup = DockviewApi["groups"][number];

  const DEFAULT_GROUP_MIN_SIZE = 100;
  const COMPACT_GROUP_MIN_SIZE = 0;
  const COLLAPSE_THRESHOLD_PX = 20;

  const [mainSplitApi, setMainSplitApi] = createSignal<SplitviewApi | null>(null);
  const defaultState = createDefaultState();
  const [inputs, setInputs] = createSignal<PipelineInputItem[]>(defaultState.inputs);
  const [collapsedPanels, setCollapsedPanels] = createSignal<CollapsedDockviewGroup[]>([]);

  let logCallbackRegistered = false;

  const [selectedInputId, setSelectedInputId] = createSignal<string>(defaultState.selectedInputId);
  const [editingInputId, setEditingInputId] = createSignal<string | null>(null);

  // Scripts state - main.dm is the default script that can't be deleted
  const [scripts, setScripts] = createSignal<ScriptItem[]>(defaultState.scripts);
  const [selectedScriptId, setSelectedScriptId] = createSignal<string>(defaultState.selectedScriptId);

  // Get the currently selected script's content
  const currentScript = () => {
    const selected = scripts().find((s) => s.id === selectedScriptId());
    return selected?.content ?? "";
  };

  // Update the selected script's content
  const updateCurrentScript = (content: string) => {
    const id = selectedScriptId();
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)));
  };

  // For backwards compatibility, keep the script signal pointing to main.dm
  const script = () => {
    const mainScript = scripts().find((s) => s.isMain);
    return mainScript?.content ?? "";
  };
  const [rawOutput, setRawOutput] = createSignal<string>("Loading wasm…");
  const [outputFormat, setOutputFormat] = createSignal<OutputFormatId>("json");
  const [isPretty, setIsPretty] = createSignal<boolean>(true);
  const [outputFoldEnabled, setOutputFoldEnabled] = createSignal(false);

  // Derived: apply pretty-printing to JSON/XML output without re-invoking the engine
  const output = createMemo(() => {
    const raw = rawOutput();
    if (outputFormat() === "json" && isPretty()) {
      // Only pretty-print if the content actually looks like JSON (starts with { [ " or is a
      // primitive literal). Plain-text error messages must be returned as-is so that spaces
      // are preserved and the message remains human-readable.
      const trimmed = raw.trimStart();
      const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[")
        || trimmed.startsWith('"') || trimmed === "null" || trimmed === "true"
        || trimmed === "false" || /^-?\d/.test(trimmed);
      if (looksLikeJson) {
        try { return prettyPrintJson(raw); } catch { return raw; }
      }
      return raw;
    }
    if (outputFormat() === "xml" && isPretty()) {
      try { return prettyPrintXml(raw); } catch { return raw; }
    }
    if (outputFormat() === "xml" && !isPretty()) {
      try { return compactXml(raw); } catch { return raw; }
    }
    return raw;
  });

  // Trigger callbacks for create dialogs — registered by child components
  let triggerCreateInput: (() => void) | undefined;
  let triggerCreateScript: (() => void) | undefined;

  // Store top DockviewApi so we can update panel titles reactively
  let topDockviewApi: DockviewApi | undefined;
  const configuredCollapsibleGroups = new Set<string>();
  const collapsingGroupIds = new Set<string>();
  const restoringGroupIds = new Set<string>();
  const topDockviewDisposables: Array<{ dispose(): void }> = [];

  const sameCollapsedPanels = (
    left: ReadonlyArray<CollapsedDockviewGroup>,
    right: ReadonlyArray<CollapsedDockviewGroup>
  ): boolean => {
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (left[i]?.groupId !== right[i]?.groupId || left[i]?.title !== right[i]?.title) {
        return false;
      }
    }
    return true;
  };

  const disposeTopDockviewSubscriptions = () => {
    while (topDockviewDisposables.length > 0) {
      topDockviewDisposables.pop()?.dispose();
    }
    configuredCollapsibleGroups.clear();
    collapsingGroupIds.clear();
    restoringGroupIds.clear();
  };

  const getCollapsedGroupTitle = (group: TopDockviewGroup): string => {
    return (
      group.activePanel?.api.title ??
      group.activePanel?.id ??
      group.panels[0]?.api.title ??
      group.panels[0]?.id ??
      "Panel"
    );
  };

  const syncCollapsedPanels = (api: DockviewApi) => {
    const next = api.groups
      .filter((group) => group.api.location.type === "grid" && !group.api.isVisible)
      .map((group) => ({
        groupId: group.api.id,
        title: getCollapsedGroupTitle(group),
      }));

    setCollapsedPanels((prev) => (sameCollapsedPanels(prev, next) ? prev : next));
  };

  const ensureGroupCanCollapse = (api: DockviewApi, group: TopDockviewGroup) => {
    if (configuredCollapsibleGroups.has(group.api.id)) return;

    group.api.setConstraints({
      minimumWidth: () => (api.layoutMode === "compact" ? COMPACT_GROUP_MIN_SIZE : DEFAULT_GROUP_MIN_SIZE),
      minimumHeight: () => (api.layoutMode === "compact" ? COMPACT_GROUP_MIN_SIZE : DEFAULT_GROUP_MIN_SIZE),
    });

    configuredCollapsibleGroups.add(group.api.id);
  };

  const maybeCollapseTinyGroups = (api: DockviewApi) => {
    if (api.layoutMode !== "compact") {
      syncCollapsedPanels(api);
      return;
    }

    for (const group of api.groups) {
      if (group.api.location.type !== "grid") continue;
      if (!group.api.isVisible) continue;
      if (collapsingGroupIds.has(group.api.id) || restoringGroupIds.has(group.api.id)) continue;

      const width = group.api.width;
      const height = group.api.height;
      const isInitialZeroSizedLayout = width === 0 && height === 0;
      const shouldCollapse = !isInitialZeroSizedLayout && (width <= COLLAPSE_THRESHOLD_PX || height <= COLLAPSE_THRESHOLD_PX);

      if (!shouldCollapse) continue;

      collapsingGroupIds.add(group.api.id);
      group.api.setVisible(false);
      collapsingGroupIds.delete(group.api.id);
    }

    syncCollapsedPanels(api);
  };

  const wireTopDockview = (api: DockviewApi) => {
    disposeTopDockviewSubscriptions();

    for (const group of api.groups) {
      ensureGroupCanCollapse(api, group);
    }

    topDockviewDisposables.push(
      api.onDidAddGroup((group) => {
        ensureGroupCanCollapse(api, group);
        maybeCollapseTinyGroups(api);
      }),
      api.onDidRemoveGroup(() => {
        syncCollapsedPanels(api);
      }),
      api.onDidLayoutChange(() => {
        maybeCollapseTinyGroups(api);
      })
    );

    syncCollapsedPanels(api);
  };

  const restoreCollapsedPanel = (groupId: string) => {
    const api = topDockviewApi;
    if (!api) return;

    const group = api.groups.find((candidate) => candidate.api.id === groupId);
    if (!group) return;

    restoringGroupIds.add(groupId);
    collapsingGroupIds.delete(groupId);
    group.api.setVisible(true);
    group.api.setActive();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetWidth = Math.max(240, Math.floor(api.width * 0.5));
        const targetHeight = Math.max(180, Math.floor(api.height * 0.5));

        group.api.setSize({
          width: targetWidth,
          height: targetHeight,
        });

        restoringGroupIds.delete(groupId);
        syncCollapsedPanels(api);
      });
    });
  };

  onCleanup(() => {
    disposeTopDockviewSubscriptions();
  });



  // Import/Export handlers
  const handleExport = async () => {
    try {
      await exportPlayground(scripts(), inputs(), {
        value: output(),
        format: outputFormat(),
      });
      // 0&&console['log']('[App] Export completed');
    } catch (error) {
      console.error('[App] Export failed:', error);
    }
  };

  const handleImport = async () => {
    try {
      const result = await openImportDialog();
      if (!result) {
        // 0&&console['log']('[App] Import cancelled');
        return;
      }

      // Update scripts
      setScripts(result.scripts);
      const mainScript = result.scripts.find(s => s.isMain);
      if (mainScript) {
        setSelectedScriptId(mainScript.id);
      }

      // Update inputs
      setInputs(result.inputs);
      setSelectedInputId('payload');
      setEditingInputId(null);

      // 0&&console['log']('[App] Import completed:', { scripts: result.scripts.length, inputs: result.inputs.length });
    } catch (error) {
      console.error('[App] Import failed:', error);
    }
  };

  const resetWorkspace = () => {
    const next = createDefaultState();
    setInputs(next.inputs);
    setScripts(next.scripts);
    setSelectedScriptId(next.selectedScriptId);
    setSelectedInputId(next.selectedInputId);
    setEditingInputId(null);
    setRawOutput("Loading wasm…");
    setOutputFormat("json");
    logService.clear();

    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore storage failures
      }
    }
  };

  const ctx = createMemo(() => {
    const all = inputs();
    const scriptResources = Object.fromEntries(
      scripts()
        .filter((script) => !!script.name && !!script.content)
        .map((script) => [script.name, script.content ?? ""])
    );
    const payload = all.find((i) => i.id === "payload");
    const attributes = all.find((i) => i.id === "attributes");
    const varsInput = all.find((i) => i.id === "vars");

    // Build variables object from:
    // 1. The base "vars" input (if it exists and has content)
    // 2. All inputs with scope === "vars" (except the "vars" input itself)
    const variablesObj: Record<string, unknown> = safeObject(varsInput?.value ?? "{}");
    const variableFormats: Record<string, string> = {};
    
    // Add all scope="vars" items into the variables object
    for (const input of all) {
      if (input.scope === "vars" && input.id !== "vars") {
        variablesObj[input.id] = input.format === "JSON" ? safeJsonParse(input.value) : input.value;
        // Track the format for each variable so WASM can parse non-JSON formats
        variableFormats[input.id] = input.format;
      }
    }
    
    // Add all "top" scope items (except payload/attributes which are handled separately)
    // as top-level scope variables accessible in scripts
    const topScopeVars: Record<string, unknown> = {};
    for (const input of all) {
      if (input.scope === "top" && input.id !== "payload" && input.id !== "attributes") {
        topScopeVars[input.id] = input.format === "JSON" ? safeJsonParse(input.value) : input.value;
      }
    }

    return {
      payloadFormat: payload?.format,
      payload: payloadValue(payload),
      attributes: safeObject(attributes?.value ?? "{}"),
      variables: variablesObj,
      variableFormats,
      error: null,
      __datamorph_classpath_resources: scriptResources,
      // Spread top-level scope variables so they're accessible directly (e.g., correlationId)
      ...topScopeVars,
      // For binary payloads (Excel, PDF), pass payloadOptions so WASM can parse binary data correctly
      ...(payload && (payload.format === "XLSX" || payload.format === "XLS" || payload.format === "PDF")
        ? { payloadOptions: {} }
        : {}),
    };
  });

  onMount(() => {
    KeyboardManager.init();
    void loadDataMorphWasm();
    const stored = loadStoredState();
    if (stored?.inputs?.length) {
      setInputs(stored.inputs);
    }
    if (stored?.scripts?.length) {
      const hasMain = stored.scripts.some((s) => s.isMain);
      const normalizedScripts = hasMain
        ? stored.scripts
        : stored.scripts.map((s, idx) => (idx === 0 ? { ...s, isMain: true } : s));
      setScripts(normalizedScripts);
      const mainScript = normalizedScripts.find((s) => s.isMain) ?? normalizedScripts[0];
      setSelectedScriptId(stored.selectedScriptId ?? mainScript?.id ?? defaultState.mainScriptId);
    }
    if (stored?.selectedInputId) {
      setSelectedInputId(stored.selectedInputId);
    }
  });

  createEffect(() => {
    saveStoredState({
      inputs: inputs(),
      scripts: scripts(),
      selectedScriptId: selectedScriptId(),
      selectedInputId: selectedInputId(),
    });
  });

  // Sync output format dropdown with script's output directive.
  // Only fires when the DETECTED format changes (not on every keystroke).
  // This lets the user manually override the format; it only resets
  // when the script's output directive actually changes.
  let _lastDetectedFormat: OutputFormatId | null = null;
  createEffect(on(script, (currentScript) => {
    const detectedFormat = extractOutputFormatFromScript(currentScript);
    if (detectedFormat && detectedFormat !== _lastDetectedFormat) {
      0&&console['log']('[App] Output directive changed, setting format to:', detectedFormat, 'was:', _lastDetectedFormat);
      _lastDetectedFormat = detectedFormat;
      setOutputFormat(detectedFormat);
    }
  }));

  // Reactively update script editor tab title when selected script changes.
  // Uses on(selectedScriptId) so it ONLY re-runs when the selected script ID changes
  // — NOT on every content keystroke (which would trigger SolidPart.update → re-render → focus loss).
  createEffect(on(selectedScriptId, (id) => {
    const selected = scripts().find((s) => s.id === id);
    const name = selected?.name ?? "main.dm";
    if (topDockviewApi) {
      const panel = topDockviewApi.getPanel("scriptEditorPanel");
      if (panel) {
        panel.api.setTitle(name);
        panel.api.updateParameters({ title: name });
      }

      syncCollapsedPanels(topDockviewApi);
    }
  }));

  createEffect(() => {
    const currentScript = script();
    const contextJson = JSON.stringify(ctx());

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        // 0&&console['log']('[App] Loading WASM...');
        const wasm = await loadDataMorphWasm();
        if (!wasm) {
          console.error('[App] WASM module is null');
          setRawOutput("[DataMorphWasm] Failed to load wasm module. See console for details.");
          return;
        }

        if (!logCallbackRegistered && typeof wasm.register_log_callback === "function") {
          wasm.register_log_callback((line: string) => {
            logService.pushLine(line, "script");
          });
          logCallbackRegistered = true;
        }

        await registerCustomModules(wasm, scripts());

        logService.clear();

        const rawResult = wasm.evaluate_script(currentScript, contextJson);
        
        // Parse the envelope - value can be any type, not just string
        const env = parseWasmEnvelope<unknown>(rawResult);
        if (cancelled) return;

        if (env.ok === false) {
          // 0&&console['log']('[App] Envelope error:', env.error);
          setRawOutput(env.error);
          return;
        }

        // Convert the value to a displayable string.
        // IMPORTANT: do NOT run JSON.parse on the raw string — DataMorph JSON can contain
        // duplicate keys (multimap semantics) which standard JSON.parse silently collapses
        // to the last value, producing incorrect output.
        // If the user wants indented output they should add `indent: true` to their
        // output directive (e.g. `output application/json indent: true`).
        let displayValue: string;
        if (typeof env.value === 'string') {
          displayValue = env.value;
        } else {
          displayValue = JSON.stringify(env.value, null, 2);
        }
        
        // 0&&console['log']('[App] Setting output:', displayValue);
        setRawOutput(displayValue);
      } catch (error) {
        console.error("[DataMorphPlayground] evaluate_script failed:", error);
        if (!cancelled) setRawOutput(String(error));
      }
    }, 150);

    onCleanup(() => {
      cancelled = true;
      clearTimeout(handle);
    });
  });

  // ──────────────────────────────────────────────
  // DockviewSolid panel content component (top)
  // ──────────────────────────────────────────────
  function TopPanelContent(props: IDockviewPanelProps) {
    const panelId = props.api.id;

    if (panelId === "inputPanel") {
      return (
        <InputExplorer
          inputs={inputs}
          setInputs={setInputs}
          selectedInputId={selectedInputId}
          setSelectedInputId={setSelectedInputId}
          editingInputId={editingInputId}
          setEditingInputId={setEditingInputId}
          onRegisterCreate={(trigger) => { triggerCreateInput = trigger; }}
        />
      );
    }

    if (panelId === "scriptExplorerPanel") {
      return (
        <ScriptExplorer
          scripts={scripts}
          setScripts={setScripts}
          selectedScriptId={selectedScriptId}
          setSelectedScriptId={setSelectedScriptId}
          onRegisterCreate={(trigger) => { triggerCreateScript = trigger; }}
        />
      );
    }

    if (panelId === "scriptEditorPanel") {
      const selectedScript = () => scripts().find((s) => s.id === selectedScriptId());
      return (
        <ScriptPane
          title={() => selectedScript()?.name ?? "SCRIPT"}
          value={currentScript}
          onChange={updateCurrentScript}
          getContext={ctx}
        />
      );
    }

    if (panelId === "outputPanel") {
      return (
        <OutputPane
          output={output}
          outputFormat={outputFormat}
          setOutputFormat={setOutputFormat}
          isPretty={isPretty}
          setIsPretty={setIsPretty}
          foldEnabled={outputFoldEnabled}
        />
      );
    }

    return <Box sx={{ p: 2 }}>Unknown panel: {panelId}</Box>;
  }

  // ──────────────────────────────────────────────
  // Simple tab header (no close button — panels stay)
  // ──────────────────────────────────────────────
  function PlaygroundTabHeader(props: IDockviewPanelHeaderProps) {
    return (
      <div style={{
        padding: "0 10px",
        "font-size": "11px",
        "font-weight": "600",
        "letter-spacing": "0.5px",
        "white-space": "nowrap",
        "user-select": "none",
        color: "#04245c",
      }}>
        {props.params.title}
      </div>
    );
  }



  function TopWorkspace(): JSX.Element {
    return (
      <div class="dockview-theme-replit" style={{ width: "100%", height: "100%" }}>
        <DockviewSolid
          theme={themeReplit}
          components={{ topPanel: TopPanelContent }}
          tabComponents={{ playgroundTab: PlaygroundTabHeader }}
          rightHeaderActionsComponent={(hProps: IDockviewHeaderActionsProps) => {
            const panelId = hProps.activePanel?.id;
            0&&console['log']('[rightHeaderActions] RENDER panelId=', panelId);
            if (panelId === "outputPanel") {
              return (
                <div style={{ display: "flex", "align-items": "center", gap: "4px" }}>
                  <Show when={outputFormat() === "xlsx" && isExcelBase64(rawOutput())}>
                    <button
                      title="Download Excel file"
                      onClick={() => downloadBase64AsFile(rawOutput(), "output.xlsx")}
                      style={{
                        cursor: "pointer",
                        background: "transparent",
                        border: "1px solid #3a3d54",
                        "border-radius": "4px",
                        color: "#a6e3a1",
                        "font-size": "11px",
                        "font-weight": "600",
                        padding: "1px 7px",
                        height: "22px",
                        "line-height": "20px",
                        "white-space": "nowrap",
                        display: "flex",
                        "align-items": "center",
                        gap: "3px",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      .xlsx
                    </button>
                  </Show>
                  <Show when={outputFormat() === "json" || outputFormat() === "xml"}>
                    <button
                      id="pretty-toggle-btn"
                      title={isPretty() ? "Switch to compact" : "Switch to pretty"}
                      aria-label={isPretty() ? "Compact output" : "Pretty-print output"}
                      aria-pressed={isPretty()}
                      onClick={() => setIsPretty(!isPretty())}
                      style={{
                        cursor: "pointer",
                        background: isPretty() ? "rgba(99,179,237,0.18)" : "transparent",
                        border: "1px solid",
                        "border-color": isPretty() ? "rgba(99,179,237,0.55)" : "#3a3d54",
                        "border-radius": "4px",
                        color: isPretty() ? "#63b3ed" : "#e0e3ef",
                        "font-size": "11px",
                        "font-family": "monospace",
                        "font-weight": "600",
                        padding: "1px 7px",
                        height: "22px",
                        "line-height": "20px",
                        "white-space": "nowrap",
                      }}
                    >
                      {isPretty() ? "{ }" : "{}"}
                    </button>
                  </Show>
                  <Show when={outputFormat() === "json" || outputFormat() === "xml"}>
                    <button
                      title={outputFoldEnabled() ? "Disable collapsing" : "Enable collapsing"}
                      aria-label={outputFoldEnabled() ? "Disable collapsing" : "Enable collapsing"}
                      aria-pressed={outputFoldEnabled()}
                      onClick={() => setOutputFoldEnabled(!outputFoldEnabled())}
                      style={{
                        cursor: "pointer",
                        background: outputFoldEnabled() ? "rgba(99,179,237,0.18)" : "transparent",
                        border: "1px solid",
                        "border-color": outputFoldEnabled() ? "rgba(99,179,237,0.55)" : "#3a3d54",
                        "border-radius": "4px",
                        color: outputFoldEnabled() ? "#63b3ed" : "#e0e3ef",
                        "font-size": "11px",
                        padding: "1px 5px",
                        height: "22px",
                        "line-height": "20px",
                        display: "flex",
                        "align-items": "center",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="4 6 4 2 20 2 20 6"/>
                        <polyline points="4 18 4 22 20 22 20 18"/>
                        <line x1="2" y1="12" x2="10" y2="12"/>
                        <line x1="14" y1="12" x2="22" y2="12"/>
                        <polyline points="7 9 10 12 7 15"/>
                        <polyline points="17 9 14 12 17 15"/>
                      </svg>
                    </button>
                  </Show>
                  <select
                    value={outputFormat()}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      0&&console['log']('[outputDropdown] onChange fired, value=', val, 'prev=', outputFormat());
                      setOutputFormat(val as OutputFormatId);
                    }}
                    style={{
                      "font-size": "11px",
                      color: "#e0e3ef",
                      background: "#1e2035",
                      border: "1px solid #3a3d54",
                      "border-radius": "4px",
                      padding: "2px 8px",
                      height: "22px",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="json"  style={{ background: "#1e2035", color: "#e0e3ef" }}>JSON</option>
                    <option value="xml"   style={{ background: "#1e2035", color: "#e0e3ef" }}>XML</option>
                    <option value="yaml"  style={{ background: "#1e2035", color: "#e0e3ef" }}>YAML</option>
                    <option value="csv"   style={{ background: "#1e2035", color: "#e0e3ef" }}>CSV</option>
                    <option value="dml"   style={{ background: "#1e2035", color: "#e0e3ef" }}>DML</option>
                    <option value="text"  style={{ background: "#1e2035", color: "#e0e3ef" }}>Text</option>
                    <option value="xlsx"  style={{ background: "#1e2035", color: "#e0e3ef" }}>Excel(XLSX)</option>
                  </select>
                </div>
              );
            }
            else if (panelId === "inputPanel") {
              return <span onClick={() => triggerCreateInput?.()} style={{ cursor: "pointer", "font-size": "15px", padding: "0 6px", color: "#eaeaef", "font-weight": "bold", "user-select": "none" }}>+</span>;
            }
            else if (panelId === "scriptExplorerPanel") {
              return <span onClick={() => triggerCreateScript?.()} style={{ cursor: "pointer", "font-size": "15px", padding: "0 6px", color: "#eaeaef", "font-weight": "bold", "user-select": "none" }}>+</span>;
            }
            return <span></span>;
          }}
          onReady={(event: DockviewReadyEvent) => {
            const api = event.api;
            topDockviewApi = api;
            setCollapsedPanels([]);

            // 1. Input explorer (leftmost) — first panel, no initialWidth needed
            api.addPanel({
              id: "inputPanel",
              component: "topPanel",
              title: "Input",
              tabComponent: "playgroundTab",
              params: { title: "Input" },
            });

            // 2. Script editor (center, right of input)
            const selectedScript = scripts().find((s) => s.id === selectedScriptId());
            const initialTitle = selectedScript?.name ?? "main.dm";
            api.addPanel({
              id: "scriptEditorPanel",
              component: "topPanel",
              title: initialTitle,
              tabComponent: "playgroundTab",
              params: { title: initialTitle },  // no rightHeader — nothing in header
              position: { referencePanel: "inputPanel", direction: "right" },
            });

            // 3. Output (right of scriptEditor — MUST be added before splitting scriptEditor below)
            api.addPanel({
              id: "outputPanel",
              component: "topPanel",
              title: "Output",
              tabComponent: "playgroundTab",
              params: { title: "Output" },
              position: { referencePanel: "scriptEditorPanel", direction: "right" },
            });

            // 4. Script explorer — below scriptEditor (splits the scriptEditor group vertically)
            api.addPanel({
              id: "scriptExplorerPanel",
              component: "topPanel",
              title: "Scripts",
              tabComponent: "playgroundTab",
              params: { title: "Scripts" },
              position: { referencePanel: "scriptEditorPanel", direction: "below" },
              initialHeight: 120,
            });

            // Set proportional widths AFTER panels exist.
            // Use rAF so the DOM has real dimensions.
            requestAnimationFrame(() => {
              const totalW = api.width;
              if (totalW > 0) {
                api.layout(totalW, api.height);

                // Resize Input to 15%, which leaves 85% for editor+output
                const inputGroup = api.getPanel("inputPanel")?.group;
                if (inputGroup) {
                  inputGroup.api.setSize({ width: Math.max(150, Math.floor(totalW * 0.15)) });
                }

                // Resize Output to ~35% of total
                const outputGroup = api.getPanel("outputPanel")?.group;
                if (outputGroup) {
                  outputGroup.api.setSize({ width: Math.max(200, Math.floor(totalW * 0.30)) });
                }
              }

              wireTopDockview(api);
              maybeCollapseTinyGroups(api);
            });
          }}
        />
      </div>
    );
  }

  type BottomTab = "log" | "api" | "docs";
  const [bottomTab, setBottomTab] = createSignal<BottomTab>("log");

  function BottomPanel(): JSX.Element {
    const adjustBottomPanelSize = () => {
      const api = mainSplitApi();
      if (!api) return;

      const bottom = api.getPanel("bottom");
      if (!bottom) return;

      const totalHeight = api.height;
      if (!totalHeight || totalHeight <= 0) return;

      const panelHeight = bottom.height;
      const minSize = bottom.minimumSize;
      const maxSize = bottom.maximumSize;
      const targetAt20 = Math.floor(totalHeight * 0.2);
      const threshold = totalHeight * 0.15;

      const desired =
        panelHeight <= threshold
          ? Math.max(minSize, targetAt20)
          : minSize;

      const capped = Number.isFinite(maxSize)
        ? Math.min(desired, maxSize)
        : desired;

      bottom.api.setSize({ size: capped });
    };

    const handleTabClick = (next: BottomTab) => {
      if (bottomTab() === next) {
        adjustBottomPanelSize();
      }
      setBottomTab(next);
    };

    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", zIndex: 100, backgroundColor: "#0d0f1a" }}>
        <Box
          id="bottom-panel-tabs"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "start",
            gap: 0,
            flexWrap: "nowrap",
            height: 32,
            borderTop: "1px solid #2a2d44",
            borderBottom: "2px solid #2a2d44",
            fontSize: 9,
            paddingTop: '-1px',
            zIndex: 90,
            backgroundColor: "#12141f",
          }}
        >
          <Box
            sx={{
              alignItems: "start",
              overflow: 'hidden',
              zIndex: 9,
              height: 30,
              flexShrink: 0,
            }}
          >
            <Box onClick={() => handleTabClick("log")}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    backgroundColor: (bottomTab() === "log" ? '#1e2035': '#12141f'),
                    border: 'solid',
                    borderBlockEndWidth: (bottomTab() === "log" ? '0px': '1px'),
                    borderBlockStartWidth: '0px',
                    borderBlockStartColor: 'transparent',
                    borderColor: (bottomTab() === "log" ? '#2a2d44': '#1e2035'),
                    borderBottomColor: 'transparent',
                    marginBottom: '2px',
                    zIndex: 8,
                  }}
            >
              <IconButton
                size="small"
                sx={{
                  backgroundColor: 'transparent',
                  color: bottomTab() === "log" ? '#c8ccd8' : '#7a7f96',
                  width: 15,
                  height: 15,
                  paddingLeft: 2,
                }}
              >
                <ListIcon width={15} height={15} />
              </IconButton>
              <Button variant="text" sx={{ fontWeight: bottomTab() === "log" ? 600 : 100, color: bottomTab() === "log" ? '#e0e3ef' : '#7a7f96', whiteSpace: 'nowrap', minWidth: 'auto', px: 1 }}>
                LOG
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              alignItems: "start",
              overflow: 'clip',
              zIndex: 9,
              height: 28,
              justifyContent: 'start',
              alignContent: 'start',
              marginLeft: '-2px',
              flexShrink: 0,
            }}
          >
            <Box onClick={() => handleTabClick("api")}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    backgroundColor: (bottomTab() === "api" ? '#1e2035': '#12141f'),
                    borderLeft: 'solid',
                    borderLeftWidth: (bottomTab() === "api" ? '2px': '0px'),
                    borderBlockEndWidth: '5px',
                    borderLeftColor: (bottomTab() === "api" ? '#6c5ce7': 'transparent'),
                    borderColor: (bottomTab() === "api" ? '#2a2d44': '#1e2035'),
                    borderBottomColor: 'transparent',
                    zIndex: 8,
                  }}
            >
              <IconButton
                size="small"
                sx={{ backgroundColor: 'transparent', color: bottomTab() === "api" ? '#c8ccd8' : '#7a7f96', width: 15, height: 15, paddingLeft: 2 }}
              >
                <ContentPasteSearchIcon width={15} height={15} />
              </IconButton>
              <Button variant="text" sx={{ fontWeight: bottomTab() === "api" ? 600 : 100, color: bottomTab() === "api" ? '#e0e3ef' : '#7a7f96', whiteSpace: 'nowrap', minWidth: 'auto', px: 1 }}>
                SDK
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              alignItems: "start",
              overflow: 'clip',
              zIndex: 9,
              height: 28,
              justifyContent: 'start',
              alignContent: 'start',
              marginLeft: '-2px',
              flexShrink: 0,
            }}
          >
            <Box onClick={() => handleTabClick("docs")}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    backgroundColor: (bottomTab() === "docs" ? '#1e2035': '#12141f'),
                    borderLeft: 'solid',
                    borderLeftWidth: (bottomTab() === "docs" ? '2px': '0px'),
                    borderBlockEndWidth: '5px',
                    borderLeftColor: (bottomTab() === "docs" ? '#6c5ce7': 'transparent'),
                    borderColor: (bottomTab() === "docs" ? '#2a2d44': '#1e2035'),
                    borderBottomColor: 'transparent',
                    zIndex: 8,
                  }}
            >
              <IconButton
                size="small"
                sx={{ backgroundColor: 'transparent', color: bottomTab() === "docs" ? '#c8ccd8' : '#7a7f96', width: 15, height: 15, paddingLeft: 2 }}
              >
                <MenuBookIcon width={15} height={15} />
              </IconButton>
              <Button variant="text" sx={{ fontWeight: bottomTab() === "docs" ? 600 : 100, color: bottomTab() === "docs" ? '#e0e3ef' : '#7a7f96', whiteSpace: 'nowrap', minWidth: 'auto', px: 1 }}>
                DOCS
              </Button>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative", backgroundColor: "#12141f" }}>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: bottomTab() === "log" ? "flex" : "none",
              minHeight: 0,
              overflow: "hidden",
              p: 2,
            }}
          >
            <LogViewerPanel />
          </Box>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: bottomTab() === "api" ? "block" : "none",
              overflow: "auto",
              p: 2,
              color: "#c8ccd8",
            }}
          >
            <Box sx={{ color: "#c8ccd8" }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "#e0e3ef" }}>Java SDK Downloads</Typography>
                <Typography variant="body2" sx={{ mb: 2, color: "#7a7f96" }}>
                  Version {JAVA_SDK_DOWNLOADS.version}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: "#9fb3d9" }}>
                  Free to use with no expiration. Paid support and implementation help are available separately.
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box
                    component="a"
                    href={JAVA_SDK_DOWNLOADS.jarUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      color: "primary.main",
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    📦 {`data-morph-java-sdk-${JAVA_SDK_DOWNLOADS.version}.jar`} (SDK)
                  </Box>
                  <Box
                    component="a"
                    href={JAVA_SDK_DOWNLOADS.javadocUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      color: "primary.main",
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    📚 {`data-morph-java-sdk-${JAVA_SDK_DOWNLOADS.version}-javadoc.jar`} (JavaDoc)
                  </Box>
                  <Box
                    component="a"
                    href={JAVA_SDK_DOWNLOADS.sourcesUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      color: "primary.main",
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    📝 {`data-morph-java-sdk-${JAVA_SDK_DOWNLOADS.version}-sources.jar`} (Java Source)
                  </Box>
                </Box>
            </Box>
          </Box>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: bottomTab() === "docs" ? "block" : "none",
              overflow: "hidden",
            }}
          >
            <iframe
              src="https://amkserver.myddns.rocks/DataMorph-Docs"
              title="DataMorph Documentation"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                "background-color": "#12141f",
              }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </Box>
        </Box>
      </Box>
    );
  }

  function MainBody(): JSX.Element {
    return (
      <Box sx={{ flex: 1, minHeight: 0, width: "100%" }}>
        <SplitviewSolid
          style={{ width: "100%", height: "100%" }}
          orientation={Orientation.VERTICAL}
          proportionalLayout={true}
          components={{
            top: TopWorkspace,
            bottom: BottomPanel,
          }}
          onReady={({ api }) => {
            setMainSplitApi(api);
            api.addPanel({ id: "top", component: "top", params: {}, size: 700, minimumSize: 48, skipLayout: true });
            api.addPanel({ id: "bottom", component: "bottom", params: {}, size: 200, minimumSize: 30, skipLayout: true });

            const bottom = api.getPanel("bottom");
            bottom?.api.setConstraints({
              minimumSize: () => 30,
              maximumSize: () => Math.max(48, Math.floor(api.height * 0.5)),
            });

            const top = api.getPanel("top");
            top?.api.setConstraints({
              minimumSize: () => 48,
              maximumSize: () => Math.max(48, api.height - 30),
            });

            // Panels are added with `skipLayout: true`, so ensure we trigger a layout pass.
            // Without this, production builds can end up with a blank Splitview until a resize occurs.
            requestAnimationFrame(() => {
              api.layout(api.width, api.height);
            });
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100dvh", width: "100vw", overflow: "hidden", display: "flex", flexDirection: "column", backgroundColor: "#0d0f1a" }}>
      <TopHeader
        height={30}
        onImport={handleImport}
        onExport={handleExport}
        onReset={resetWorkspace}
        collapsedPanels={collapsedPanels()}
        onRestorePanel={restoreCollapsedPanel}
      />
      <MainBody />
    </Box>
  );
}
