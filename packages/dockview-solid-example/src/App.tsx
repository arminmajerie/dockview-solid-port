// packages/dockview-solid-example/src/App.tsx
import { onMount, onCleanup, createSignal, Show } from "solid-js";

import "@arminmajerie/dockview-solid/styles/dockview.css";
import {
  DockviewSolid,
  DockviewApi,
  IDockviewPanelProps,
  IDockviewPanelHeaderProps,
  IWatermarkPanelProps,
  DockviewReadyEvent,
  IDockviewPanel,
  themeReplit,
  SplitviewSolid, // <-- use the Solid Splitview
} from "@arminmajerie/dockview-solid";
import { Orientation } from "dockview-core";

import CloseIcon from "@suid/icons-material/Close";

let resizeObserver: ResizeObserver | undefined;

// Panel content component
export function App() {
  console.log("DockView Solid Example");
  let dockViewContainer: HTMLDivElement | undefined = undefined;
  let dockViewApi: DockviewApi | undefined;

  function CustomTabHeaderNoClosing(props: IDockviewPanelHeaderProps) {
    return (
      <div style="padding:0 10px; color:blue;">
        {props.params.title}
      </div>
    );
  }

  function CustomTabHeaderWithCloseButton(props: IDockviewPanelHeaderProps) {
    const [hover, setHover] = createSignal(false);
    return (
      <div
        style={{
          padding: "0 8px 0 10px",
          color: "purple",
          position: "relative",
          display: "flex",
          "align-items": "flex-start",
          "min-width": "100px",
          height: "100%",
          "box-sizing": "border-box",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
            "padding-right": "22px",
            width: "100%",
          }}
        >
          {props.params.title}
        </span>
        <button
          style={{
            background: hover() ? "#8ea7d6" : "none",
            border: "none",
            "border-radius": "45%",
            transition: "background 0.9s",
            cursor: "pointer",
            position: "absolute",
            right: "0px",
            top: "0px",
            padding: 0,
            margin: 0,
            "margin-top": "-8px",
            "margin-right": "-8px",
            "z-index": 2,
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => props.api.close()}
          title="Close"
        >
          <CloseIcon style={{ width: "12px", height: "12px", color: "#34343a" }} />
        </button>
      </div>
    );
  }

  // Watermark component (optional)
  function MyWatermark(_props: IWatermarkPanelProps) {
    return (
      <div style="padding:5px; font-size:1.1rem; color:#2ec4b6; opacity:0.4;">
        This is a custom watermark! WTF is this?
      </div>
    );
  }

  const [activePanelId, setActivePanelId] = createSignal<string | undefined>(undefined);
  const [closedPanels, setClosedPanels] = createSignal<string[]>([]);

  const [containerWidth, setContainerWidth] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);

  const allPanelConfigs: Record<string, any> = {
    canvasPanel: {
      id: "canvasPanel",
      component: "panelContent",
      params: { title: "Canvas" },
      tabComponent: "customTabHeaderCanvas",
      initialWidth: containerWidth() * 0.9,
      initialHeight: containerHeight() * 0.85,
    },
    componentPanel: {
      id: "componentPanel",
      component: "panelContent",
      params: { title: "Components" },
      tabComponent: "customTabHeaderComponent",
      initialWidth: containerWidth() * 0.15,
    },
    configurationPanel: {
      id: "configurationPanel",
      component: "panelContent",
      params: { title: "Configuration" },
      tabComponent: "customTabHeaderConfig",
      initialHeight: containerHeight() * 0.15,
    },
    workspacePanel: {
      id: "workspacePanel",
      component: "panelContent",
      params: { title: "Workspace" },
      tabComponent: "customTabHeaderWorkspace",
      initialWidth: containerWidth() * 0.1,
      initialHeight: containerHeight(),
    },
  };

  function handleAddPanel(panelId: string) {
    if (!dockViewApi) return;

    const currentPanel = dockViewApi.getPanel(activePanelId());
    if (!currentPanel) return;

    const config = allPanelConfigs[panelId];
    if (!config) return;

    let direction = "within";
    if (currentPanel.id === "canvasPanel") {
      if (panelId === "componentPanel") {
        direction = "right";
      } else if (panelId === "configurationPanel") {
        direction = "below";
      } else if (panelId === "workspacePanel") {
        direction = "left";
      }
    }
    if (currentPanel.id === "componentPanel") {
      if (panelId === "canvasPanel") {
        direction = "left";
      } else if (panelId === "configurationPanel") {
        direction = "below";
      }
    }
    if (currentPanel.id === "configurationPanel") {
      if (panelId === "canvasPanel") {
        direction = "above";
      } else if (panelId === "componentPanel") {
        direction = "right";
      }
    }

    const addedPanel = dockViewApi.addPanel({
      ...allPanelConfigs[panelId],
      position: { referencePanel: currentPanel.id, direction },
    });

    if (currentPanel.id === "canvasPanel") {
      if (panelId === "componentPanel") {
        currentPanel.api.setSize({ height: Math.floor(containerWidth() * 0.85) });
        addedPanel.api.setSize({ width: Math.floor(containerWidth() * 0.15) });
      } else if (panelId === "configurationPanel") {
        currentPanel.api.setSize({ height: Math.floor(containerHeight() * 0.85) });
        addedPanel.api.setSize({ height: Math.floor(containerHeight() * 0.21) });
      }
    }
    return addedPanel;
  }

  function AddPanel() {
    const [showMenu, setShowMenu] = createSignal(false);
    let dropdownRef: HTMLDivElement | undefined;

    onMount(() => {
      function handleDocumentClick(e: MouseEvent) {
        if (showMenu() && dropdownRef && !dropdownRef.contains(e.target as Node)) {
          setShowMenu(false);
        }
      }
      document.addEventListener("mousedown", handleDocumentClick);
      onCleanup(() => {
        document.removeEventListener("mousedown", handleDocumentClick);
      });
    });

    return (
      <div ref={(el) => (dropdownRef = el)} style="position:relative;display:inline-block;">
        <button
          style="margin:0 8px;"
          onClick={() => setShowMenu(!showMenu())}
          title="Add panel"
        >
          +
        </button>
        {showMenu() && (
          <div
            style="
              position:absolute;top:110%;right:0;z-index:99;
              background:white;border:1px solid #bbb;border-radius:4px;
              min-width:140px;box-shadow:0 2px 8px #0002;"
          >
            {closedPanels().length === 0 && (
              <div style="color:#999;padding:8px 14px;">No panels to add</div>
            )}
            {closedPanels().map((id) => (
              <div
                style="padding:8px 14px;cursor:pointer;font-size:1rem;white-space:nowrap;"
                onClick={(e) => {
                  e.preventDefault();
                  handleAddPanel(id);
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {allPanelConfigs[id].params.title}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Only observe after mount
  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      setContainerWidth(dockViewContainer!.offsetWidth);
      setContainerHeight(dockViewContainer!.offsetHeight);
    });
    resizeObserver.observe(dockViewContainer!);
    setContainerWidth(dockViewContainer!.offsetWidth);
    setContainerHeight(dockViewContainer!.offsetHeight);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
  });

  /** A small Splitview demo embedded inside the Canvas panel */
  function CanvasSplitview() {
    const [activeTab, setActiveTab] = createSignal<"input" | "output">("input");

    return (
      <div style="display:flex; flex-direction:column; width:100%; height:100%;">
        <div style="padding:6px; border-bottom:1px solid #ddd; display:flex; gap:8px;">
          <button onClick={() => setActiveTab("input")}>Show Input</button>
          <button onClick={() => setActiveTab("output")}>Show Output</button>
        </div>

        <div style="flex:1; min-height:0; width:100%;">
          <SplitviewSolid
            class="w-full h-full"
            orientation={Orientation.VERTICAL}
            proportionalLayout={true}
            disableAutoResizing={false}
            components={{
              input: (_p) => (
                <div style="padding:8px; font-size:12px; height:100%; box-sizing:border-box;">
                  <div style="font-weight:600; margin-bottom:6px;">Input</div>
                  <Show when={activeTab() === "input"} fallback={<div>Hidden</div>}>
                    <textarea
                      style="width:100%; height:100%; box-sizing:border-box;"
                      placeholder="Type something here..."
                    />
                  </Show>
                </div>
              ),
              output: (_p) => (
                <div style="padding:8px; font-size:12px; height:100%; box-sizing:border-box;">
                  <div style="font-weight:600; margin-bottom:6px;">Output</div>
                  <Show when={activeTab() === "output"} fallback={<div>Hidden</div>}>
                    <pre style="margin:0;">
{`{
  "result": "Hello from Splitview!"
}`}
                    </pre>
                  </Show>
                </div>
              ),
            }}
            onReady={({ api }) => {
              api.addPanel({ id: "inputPane", component: "input", params: {} });
              api.addPanel({ id: "outputPane", component: "output", params: {} });
            }}
          />
        </div>
      </div>
    );
  }

  function PanelContent(props: IDockviewPanelProps & { dockViewApi: DockviewApi }) {
    // If this is the Canvas panel, render the Splitview demo inside it.
    if (props.api.id === "canvasPanel") {
      return <CanvasSplitview />;
    }

    const openPanel = (panelId: string) => {
      handleAddPanel(panelId);
    };

    // Reactive: panel is considered "closed" if its id is in closedPanels()
    const isClosed = (panelId: string) => closedPanels().includes(panelId);

    const panels = [
      { id: "workspacePanel", label: "Workspace" },
      { id: "canvasPanel", label: "Canvas" },
      { id: "componentPanel", label: "Components" },
      { id: "configurationPanel", label: "Configuration" },
    ];

    const currentId = props.api.id;

    return (
      <div
        style="padding:0; font-size:1.3rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; width:100%; height:100%;"
      >
        <div>Panel: {props.api.title}</div>
        <h3>close other panels and you should be able to open the other panels here</h3>
        <h3>use the + button in the top right corner to open the panel</h3>
        <div style="display:flex; gap:8px;">
          {panels
            .filter((p) => p.id !== currentId)
            .map((p) => {
              const closed = isClosed(p.id);
              return (
                <button
                  onClick={() => openPanel(p.id)}
                  disabled={!closed}
                  style={`
                    padding:7px 18px;
                    background:${closed ? "#b7ffb7" : "#eee"};
                    border:1px solid ${closed ? "#4caf50" : "#aaa"};
                    color:${closed ? "#333" : "#666"};
                    border-radius:6px;
                    transition: background 0.2s, border 0.2s;
                    cursor: ${closed ? "pointer" : "not-allowed"};
                    opacity: ${closed ? 1 : 0.6};
                  `}
                >
                  Open {p.label}
                </button>
              );
            })}
        </div>
      </div>
    );
  }

  // Called when DockViewSolid is ready
  function handleReady(event: DockviewReadyEvent) {
    console.log("Ready", event);
    dockViewApi = event.api;
    if (containerWidth() < 100 || containerHeight() < 100) {
      return;
    }
    let workspacePanel: IDockviewPanel | undefined;
    let canvasPanel: IDockviewPanel | undefined;
    let componentPanel: IDockviewPanel | undefined;
    let configurationPanel: IDockviewPanel | undefined;

    // 1. Canvas
    canvasPanel = dockViewApi.addPanel({
      ...allPanelConfigs["canvasPanel"],
    });

    workspacePanel = dockViewApi.addPanel({
      ...allPanelConfigs["workspacePanel"],
      position: { referencePanel: "canvasPanel", direction: "left" },
    });

    configurationPanel = dockViewApi.addPanel({
      ...allPanelConfigs["configurationPanel"],
      position: { referencePanel: "canvasPanel", direction: "below" },
    });

    componentPanel = dockViewApi.addPanel({
      ...allPanelConfigs["componentPanel"],
      position: { referencePanel: "canvasPanel", direction: "right" },
    });

    setTimeout(() => {
      // Set mainPanel group as active (or whichever you want)
      const group = dockViewApi!.groups.find((g) => g.panels.some((p) => p.id === "canvasPanel"));
      if (group) group.api.setActive();
    }, 1);

    setTimeout(() => {
      // Set group heights
      const topGroup = dockViewApi!.groups.find((g) =>
        g.panels.some((p) => p.id === "canvasPanel")
      );
      const bottomGroup = dockViewApi!.groups.find((g) =>
        g.panels.some((p) => p.id === "configurationPanel")
      );

      if (topGroup && bottomGroup) {
        topGroup.api.setSize({ height: Math.floor(containerHeight() * 0.85) });
        bottomGroup.api.setSize({ height: Math.floor(containerHeight() * 0.15) });
      }

      // Set widths (split horizontally: workspace | canvas | components)
      if (canvasPanel && componentPanel && workspacePanel) {
        canvasPanel.group.api.setSize({ width: Math.floor(containerWidth() * 0.75) });
        componentPanel.group.api.setSize({ width: Math.floor(containerWidth() * 0.15) });
        workspacePanel.group.api.setSize({ width: Math.floor(containerWidth() * 0.1) });
      }
    }, 1);

    dockViewApi!.onDidActivePanelChange((panel) => {
      setActivePanelId(panel?.id);
    });
    // When a panel is removed, add it to the closedPanels array
    dockViewApi!.onDidRemovePanel((panel) => {
      setClosedPanels((prev) => [...prev, panel.id]);
    });

    // (Optional) Remove from closedPanels when re-added (to keep in sync)
    dockViewApi!.onDidAddPanel((panel) => {
      setClosedPanels((prev) => prev.filter((id) => id !== panel.id));
    });
  }

  return (
    <div
      ref={dockViewContainer!}
      class="dockview-theme-replit"
      style={{
        margin: 0,
        padding: 0,
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        "box-sizing": "border-box",
      }}
    >
      <div
        style={{
          height: `100%`,
          width: `100%`,
          "min-height": "200px",
          "min-width": "200px",
        }}
      >
        <DockviewSolid
          theme={themeReplit}
          components={{ panelContent: (p) => <PanelContent {...p} dockViewApi={dockViewApi!} /> }}
          tabComponents={{
            customTabHeaderWorkspace: CustomTabHeaderWithCloseButton,
            customTabHeaderConfig: CustomTabHeaderWithCloseButton,
            customTabHeaderComponent: CustomTabHeaderWithCloseButton,
            customTabHeaderCanvas: CustomTabHeaderNoClosing,
          }}
          rightHeaderActionsComponent={AddPanel}
          watermarkComponent={MyWatermark}
          onReady={handleReady}
        />
      </div>
    </div>
  );
}

export default App;
