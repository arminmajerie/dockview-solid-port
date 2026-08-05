import { For, Match, Show, Switch, createSignal, onCleanup } from 'solid-js';

import '@arminmajerie/dockview-solid/styles/dockview.css';
import {
  DockviewApi,
  DockviewReadyEvent,
  DockviewSolid,
  DockviewTheme,
  IDockviewHeaderActionsProps,
  IDockviewPanelHeaderProps,
  IDockviewPanelProps,
  IWatermarkPanelProps,
} from '@arminmajerie/dockview-solid';
import DockviewDndHarness from './DndHarness';

type Palette = 'midnight' | 'cloud' | 'ember';
type LayoutPreset = 'balanced' | 'focus' | 'inspect';
type PanelKind =
  | 'workspace'
  | 'editor'
  | 'preview'
  | 'console'
  | 'docs'
  | 'command'
  | 'headerless';

type PanelParams = {
  title: string;
  kind: PanelKind;
  icon: string;
  accent: string;
  closable: boolean;
  headerBackground: string;
  headerColor: string;
  headerRadius: number;
  badge?: string;
  dirty?: boolean;
};

type PanelDefinition = {
  id: string;
  title: string;
  params: PanelParams;
  minimumWidth?: number;
  maximumWidth?: number;
  minimumHeight?: number;
  maximumHeight?: number;
  disableDnd?: boolean;
};

const customTheme = (gap: number): DockviewTheme => ({
  name: 'customization-lab',
  className: 'dockview-theme-custom-lab',
  gap,
  dndOverlayMounting: 'absolute',
  dndPanelOverlay: 'group',
});

const panelDefinitions: Record<string, PanelDefinition> = {
  editor: {
    id: 'editor',
    title: 'Flow editor',
    params: {
      title: 'Flow editor',
      kind: 'editor',
      icon: '◆',
      accent: '#7c5cff',
      headerBackground: '#24c45a',
      headerColor: '#d40000',
      headerRadius: 0,
      closable: false,
      badge: 'GREEN / RED',
    },
    minimumWidth: 360,
    minimumHeight: 240,
  },
  workspace: {
    id: 'workspace',
    title: 'Workspace',
    params: {
      title: 'Workspace',
      kind: 'workspace',
      icon: '⌘',
      accent: '#38bdf8',
      headerBackground: '#e21b1b',
      headerColor: '#baffc9',
      headerRadius: 0,
      closable: false,
      badge: 'RED / GREEN',
    },
    minimumWidth: 180,
    maximumWidth: 420,
  },
  preview: {
    id: 'preview',
    title: 'Live preview',
    params: {
      title: 'Live preview',
      kind: 'preview',
      icon: '◉',
      accent: '#34d399',
      headerBackground: '#17324d',
      headerColor: '#d6f4ff',
      headerRadius: 13,
      closable: false,
      badge: 'R 13',
    },
    minimumWidth: 240,
    maximumWidth: 560,
  },
  console: {
    id: 'console',
    title: 'Event stream',
    params: {
      title: 'Event stream',
      kind: 'console',
      icon: '›_',
      accent: '#f59e0b',
      headerBackground: '#503819',
      headerColor: '#fff0bd',
      headerRadius: 7,
      closable: false,
      badge: 'R 7',
    },
    minimumHeight: 120,
    maximumHeight: 360,
  },
  docs: {
    id: 'docs',
    title: 'Customization API',
    params: {
      title: 'Customization API',
      kind: 'docs',
      icon: 'Aa',
      accent: '#f472b6',
      headerBackground: '#41204c',
      headerColor: '#ffd9f4',
      headerRadius: 20,
      closable: false,
      badge: 'R 20',
    },
  },
  closeDemo: {
    id: 'closeDemo',
    title: 'Closable header',
    params: {
      title: 'Closable header',
      kind: 'docs',
      icon: '×',
      accent: '#f8fafc',
      headerBackground: '#334155',
      headerColor: '#f8fafc',
      headerRadius: 4,
      closable: true,
      badge: 'HAS ×',
    },
  },
  command: {
    id: 'command',
    title: 'Command palette',
    params: {
      title: 'Command palette',
      kind: 'command',
      icon: '⌕',
      accent: '#a78bfa',
      headerBackground: '#5b21b6',
      headerColor: '#f5f3ff',
      headerRadius: 10,
      closable: true,
      badge: 'FLOAT',
    },
    minimumWidth: 280,
    minimumHeight: 180,
  },
  headerless: {
    id: 'headerless',
    title: 'Headerless panel',
    params: {
      title: 'Headerless panel',
      kind: 'headerless',
      icon: '',
      accent: '#64748b',
      headerBackground: 'transparent',
      headerColor: '#94a3b8',
      headerRadius: 0,
      closable: false,
    },
    disableDnd: true,
    minimumHeight: 100,
  },
};

const panelOptions = (id: string) => ({
  ...panelDefinitions[id],
  component: 'panelContent',
  tabComponent: 'customTab',
});

function CustomTab(props: IDockviewPanelHeaderProps<PanelParams>) {
  return (
    <div
      class="custom-tab"
      classList={{ 'custom-tab--dirty': Boolean(props.params.dirty) }}
      style={`
        --panel-accent:${props.params.accent};
        --header-background:${props.params.headerBackground};
        --header-color:${props.params.headerColor};
        --header-radius:${props.params.headerRadius}px;
      `}
    >
      <span class="custom-tab__icon" aria-hidden="true">
        {props.params.icon}
      </span>
      <span class="custom-tab__label">{props.params.title}</span>
      <Show when={props.params.badge}>
        <span class="custom-tab__badge">{props.params.badge}</span>
      </Show>
      <Show
        when={props.params.closable}
        fallback={<span class="custom-tab__lock" title="This panel is pinned">⌁</span>}
      >
        <button
          type="button"
          class="custom-tab__close"
          title={`Close ${props.params.title}`}
          aria-label={`Close ${props.params.title}`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            props.api.close();
          }}
        >
          ×
        </button>
      </Show>
    </div>
  );
}

function HeaderActions(props: IDockviewHeaderActionsProps) {
  const toggleMaximize = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (props.api.isMaximized()) {
      props.api.exitMaximized();
    } else {
      props.api.maximize();
    }
  };

  return (
    <div class="group-actions">
      <span class="group-actions__grip" title="Custom group-level header actions">
        •••
      </span>
      <button type="button" title="Toggle maximize group" onClick={toggleMaximize}>
        ⛶
      </button>
    </div>
  );
}

function WorkspacePanel() {
  const rows = [
    ['▾', 'integration-demo', ''],
    ['  ◇', 'flows', '4'],
    ['    ◆', 'customer-sync.flow', ''],
    ['    ◆', 'order-router.flow', ''],
    ['  ◇', 'connectors', '6'],
    ['  ◇', 'schemas', '2'],
    ['  ·', 'README.md', 'M'],
  ];

  return (
    <section class="panel-surface workspace-panel">
      <div class="panel-kicker">PROJECT EXPLORER</div>
      <div class="tree">
        <For each={rows}>
          {(row, index) => (
            <div class="tree__row" classList={{ 'tree__row--active': index() === 2 }}>
              <span>{row[0]}</span>
              <span>{row[1]}</span>
              <Show when={row[2]}>
                <small>{row[2]}</small>
              </Show>
            </div>
          )}
        </For>
      </div>
      <div class="constraint-card">
        <span>WIDTH CONSTRAINT</span>
        <strong>180 — 420 px</strong>
      </div>
    </section>
  );
}

function EditorPanel() {
  const nodes = [
    { icon: '⚡', title: 'HTTP Listener', meta: 'POST /orders', x: 8, y: 10 },
    { icon: '⤨', title: 'Transform', meta: 'Map payload', x: 39, y: 39 },
    { icon: '✓', title: 'Validate', meta: 'Order schema', x: 69, y: 12 },
    { icon: '↗', title: 'Publish', meta: 'orders.created', x: 69, y: 68 },
  ];

  return (
    <section class="panel-surface editor-panel">
      <div class="editor-toolbar">
        <div class="crumbs"><span>flows</span><b>/</b><strong>order-router.flow</strong></div>
        <div class="zoom-control"><button>−</button><span>86%</span><button>+</button></div>
      </div>
      <div class="flow-canvas">
        <svg class="flow-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M22 24 C35 24 26 50 43 50" />
          <path d="M57 50 C67 50 58 27 72 27" />
          <path d="M57 52 C68 52 59 78 72 78" />
        </svg>
        <For each={nodes}>
          {(node) => (
            <article class="flow-node" style={`left:${node.x}%;top:${node.y}%`}>
              <span>{node.icon}</span>
              <div><strong>{node.title}</strong><small>{node.meta}</small></div>
              <i>⋮</i>
            </article>
          )}
        </For>
        <div class="canvas-hint"><kbd>Space</kbd> pan <kbd>⌘ K</kbd> commands</div>
      </div>
    </section>
  );
}

function PreviewPanel() {
  return (
    <section class="panel-surface preview-panel">
      <div class="preview-status"><i /> Preview connected <span>42 ms</span></div>
      <div class="phone">
        <div class="phone__island" />
        <div class="phone__hero">
          <span>Workerant</span>
          <strong>Everything is flowing.</strong>
          <p>Your order pipeline is healthy and processing events in real time.</p>
          <button>View activity →</button>
        </div>
        <div class="metric-grid">
          <div><span>Today</span><strong>12.8k</strong><small>↑ 18.4%</small></div>
          <div><span>Success</span><strong>99.98%</strong><small>Healthy</small></div>
        </div>
      </div>
      <div class="constraint-card">
        <span>WIDTH CONSTRAINT</span>
        <strong>240 — 560 px</strong>
      </div>
    </section>
  );
}

function ConsolePanel() {
  const logs = [
    ['00:42:18.041', 'INFO', 'listener', 'Received POST /orders · 2.8 KB'],
    ['00:42:18.073', 'MAP', 'transform', 'Mapped 18 fields in 31 ms'],
    ['00:42:18.089', 'PASS', 'validate', 'Payload matches OrderV4'],
    ['00:42:18.116', 'SEND', 'publish', 'orders.created · partition 03'],
  ];

  return (
    <section class="panel-surface console-panel">
      <For each={logs}>
        {(log) => (
          <div class="log-row">
            <time>{log[0]}</time><b data-level={log[1]}>{log[1]}</b>
            <span>{log[2]}</span><p>{log[3]}</p>
          </div>
        )}
      </For>
      <div class="console-prompt"><span>›</span><input placeholder="Filter events or run a command…" /></div>
    </section>
  );
}

function DocsPanel() {
  const features = [
    ['Runtime size', 'panel.api.setSize({ width, height })'],
    ['Hard constraints', 'minimumWidth / maximumHeight'],
    ['Theme geometry', 'gap + CSS custom properties'],
    ['Per-panel chrome', 'tabComponent + params'],
    ['Group controls', 'rightHeaderActionsComponent'],
    ['Window modes', 'floating / popout / maximize'],
  ];

  return (
    <section class="panel-surface docs-panel">
      <div><span class="eyebrow">DOCKVIEW SOLID</span><h1>Customization is a system,<br />not just a close button.</h1>
        <p>This example combines public APIs with targeted CSS. Drag tabs, resize every sash, maximize a group, close panels, and tune the controls above.</p>
      </div>
      <div class="feature-grid">
        <For each={features}>{(feature) => <article><span>✓</span><div><strong>{feature[0]}</strong><code>{feature[1]}</code></div></article>}</For>
      </div>
    </section>
  );
}

function CommandPanel() {
  const commands = ['Create a new integration', 'Toggle compact tabs', 'Maximize active group', 'Export current layout'];
  return (
    <section class="panel-surface command-panel">
      <div class="command-search"><span>⌕</span><input autofocus placeholder="Type a command…" /><kbd>ESC</kbd></div>
      <div class="command-list">
        <For each={commands}>{(command, index) => <button classList={{ active: index() === 0 }}><span>{command}</span><kbd>↵</kbd></button>}</For>
      </div>
    </section>
  );
}

function HeaderlessPanel() {
  return (
    <section class="panel-surface headerless-panel">
      <strong>No header. No drag source.</strong>
      <code>hideHeader: true · disableDnd: true</code>
    </section>
  );
}

function PanelContent(props: IDockviewPanelProps<PanelParams>) {
  return (
    <Switch fallback={<DocsPanel />}>
      <Match when={props.params.kind === 'workspace'}><WorkspacePanel /></Match>
      <Match when={props.params.kind === 'editor'}><EditorPanel /></Match>
      <Match when={props.params.kind === 'preview'}><PreviewPanel /></Match>
      <Match when={props.params.kind === 'console'}><ConsolePanel /></Match>
      <Match when={props.params.kind === 'docs'}><DocsPanel /></Match>
      <Match when={props.params.kind === 'command'}><CommandPanel /></Match>
      <Match when={props.params.kind === 'headerless'}><HeaderlessPanel /></Match>
    </Switch>
  );
}

function Watermark(_props: IWatermarkPanelProps) {
  return (
    <div class="custom-watermark">
      <span>◇</span>
      <strong>Your workspace is empty</strong>
      <small>Use “Reset layout” to bring the demo panels back.</small>
    </div>
  );
}

export function App() {
  if (typeof window !== 'undefined') {
    const scenario = new URLSearchParams(window.location.search).get('scenario');
    if (scenario === 'dnd') {
      return <DockviewDndHarness />;
    }
  }

  let api: DockviewApi | undefined;
  let dockHost: HTMLDivElement | undefined;
  const disposables: Array<{ dispose(): void }> = [];
  const [palette, setPalette] = createSignal<Palette>('midnight');
  const [radius, setRadius] = createSignal(16);
  const [headerHeight, setHeaderHeight] = createSignal(42);
  const [gap, setGap] = createSignal(10);
  const [railWidth, setRailWidth] = createSignal(238);
  const [inspectorWidth, setInspectorWidth] = createSignal(330);
  const [consoleHeight, setConsoleHeight] = createSignal(184);
  const [closedPanels, setClosedPanels] = createSignal<string[]>([]);
  const [activePanel, setActivePanel] = createSignal('editor');
  const [layoutPreset, setLayoutPreset] = createSignal<LayoutPreset>('balanced');

  const setPanelSize = (id: string, size: { width?: number; height?: number }) => {
    api?.getPanel(id)?.api.setSize(size);
  };

  const applyPreset = (preset: LayoutPreset) => {
    setLayoutPreset(preset);
    if (!dockHost) return;
    const width = dockHost.clientWidth;
    const height = dockHost.clientHeight;
    const sizes = {
      balanced: { rail: Math.min(250, width * 0.2), inspector: Math.min(350, width * 0.27), console: Math.min(190, height * 0.3) },
      focus: { rail: 185, inspector: 245, console: 125 },
      inspect: { rail: 290, inspector: 500, console: 260 },
    }[preset];
    setRailWidth(Math.round(sizes.rail));
    setInspectorWidth(Math.round(sizes.inspector));
    setConsoleHeight(Math.round(sizes.console));
    requestAnimationFrame(() => {
      setPanelSize('workspace', { width: sizes.rail });
      setPanelSize('preview', { width: sizes.inspector });
      setPanelSize('console', { height: sizes.console });
    });
  };

  const buildLayout = () => {
    if (!api) return;
    api.closeAllGroups();
    api.addPanel(panelOptions('editor'));
    api.addPanel({
      ...panelOptions('docs'),
      inactive: true,
      position: { referencePanel: 'editor', direction: 'within' },
    });
    api.addPanel({
      ...panelOptions('closeDemo'),
      inactive: true,
      position: { referencePanel: 'editor', direction: 'within' },
    });
    api.addPanel({
      ...panelOptions('workspace'),
      initialWidth: railWidth(),
      position: { referencePanel: 'editor', direction: 'left' },
    });
    api.addPanel({
      ...panelOptions('preview'),
      initialWidth: inspectorWidth(),
      position: { referencePanel: 'editor', direction: 'right' },
    });
    const headerlessGroup = api.addGroup({
      referencePanel: 'preview',
      direction: 'below',
      hideHeader: true,
      initialHeight: 120,
    });
    api.addPanel({
      ...panelOptions('headerless'),
      position: { referenceGroup: headerlessGroup, direction: 'within' },
    });
    api.addPanel({
      ...panelOptions('console'),
      initialHeight: consoleHeight(),
      position: { referencePanel: 'editor', direction: 'below' },
    });
    api.getPanel('editor')?.api.setActive();
    requestAnimationFrame(() => applyPreset(layoutPreset()));
  };

  const restorePanel = (id: string) => {
    if (!api || api.getPanel(id) || !panelDefinitions[id]) return;
    const preferredPositions = {
      workspace: { referencePanel: 'editor', direction: 'left' as const },
      preview: { referencePanel: 'editor', direction: 'right' as const },
      console: { referencePanel: 'editor', direction: 'below' as const },
      docs: { referencePanel: 'editor', direction: 'within' as const },
      closeDemo: { referencePanel: 'editor', direction: 'within' as const },
    };
    const preferredPosition = preferredPositions[id as keyof typeof preferredPositions];
    const fallbackReference = api.getPanel('editor')?.id ?? api.activePanel?.id;
    api.addPanel({
      ...panelOptions(id),
      position: preferredPosition && api.getPanel(preferredPosition.referencePanel)
        ? preferredPosition
        : fallbackReference
          ? { referencePanel: fallbackReference, direction: 'within' }
          : undefined,
    });
    requestAnimationFrame(() => {
      if (id === 'workspace') setPanelSize(id, { width: railWidth() });
      if (id === 'preview') setPanelSize(id, { width: inspectorWidth() });
      if (id === 'console') setPanelSize(id, { height: consoleHeight() });
    });
  };

  const openFloatingPanel = () => {
    if (!api) return;
    const existing = api.getPanel('command');
    if (existing) {
      existing.api.setActive();
      return;
    }
    api.addPanel({
      ...panelOptions('command'),
      floating: { x: 140, y: 90, width: 460, height: 290 },
    });
  };

  const updateGap = (value: number) => {
    setGap(value);
    api?.updateOptions({ theme: customTheme(value) });
  };

  const handleReady = (event: DockviewReadyEvent) => {
    api = event.api;
    disposables.push(
      api.onDidActivePanelChange((panel) => setActivePanel(panel?.id ?? '')),
      api.onDidRemovePanel((panel) =>
        setClosedPanels((current) =>
          current.includes(panel.id) ? current : [...current, panel.id]
        )
      ),
      api.onDidAddPanel((panel) =>
        setClosedPanels((current) => current.filter((id) => id !== panel.id))
      )
    );
    buildLayout();
  };

  onCleanup(() => disposables.forEach((disposable) => disposable.dispose()));

  const shellStyle = () =>
    `--lab-radius:${radius()}px;--lab-header-height:${headerHeight()}px;--lab-gap:${gap()}px`;

  return (
    <main class="customization-lab" data-palette={palette()} style={shellStyle()}>
      <header class="lab-toolbar">
        <div class="lab-brand">
          <div class="lab-brand__mark">D</div>
          <div><strong>Dockview Lab</strong><span>FULL-CHROME PLAYGROUND</span></div>
        </div>
        <div class="toolbar-section palette-picker" aria-label="Color palette">
          <span>Palette</span>
          <For each={(['midnight', 'cloud', 'ember'] as Palette[])}>
            {(value) => (
              <button
                classList={{ active: palette() === value }}
                data-color={value}
                title={`${value} palette`}
                aria-label={`${value} palette`}
                onClick={() => setPalette(value)}
              />
            )}
          </For>
        </div>
        <label class="toolbar-control">
          <span>Radius <b>{radius()}px</b></span>
          <input type="range" min="0" max="28" value={radius()} onInput={(event) => setRadius(+event.currentTarget.value)} />
        </label>
        <label class="toolbar-control">
          <span>Header <b>{headerHeight()}px</b></span>
          <input type="range" min="28" max="58" value={headerHeight()} onInput={(event) => setHeaderHeight(+event.currentTarget.value)} />
        </label>
        <label class="toolbar-control toolbar-control--small">
          <span>Gap <b>{gap()}px</b></span>
          <input type="range" min="0" max="20" value={gap()} onInput={(event) => updateGap(+event.currentTarget.value)} />
        </label>
        <div class="toolbar-section layout-switcher">
          <span>Layout</span>
          <For each={(['focus', 'balanced', 'inspect'] as LayoutPreset[])}>
            {(value) => <button classList={{ active: layoutPreset() === value }} onClick={() => applyPreset(value)}>{value}</button>}
          </For>
        </div>
        <button class="toolbar-button toolbar-button--float" onClick={openFloatingPanel}>✦ Floating panel</button>
        <button class="toolbar-button" onClick={buildLayout}>↻ Reset</button>
      </header>

      <div class="dimension-bar">
        <span class="dimension-bar__status"><i /> Active: <b>{activePanel() || 'none'}</b></span>
        <label>
          <span>Workspace width</span><b>{railWidth()}px</b>
          <input type="range" min="180" max="420" value={railWidth()} onInput={(event) => {
            const value = +event.currentTarget.value;
            setRailWidth(value);
            setPanelSize('workspace', { width: value });
          }} />
        </label>
        <label>
          <span>Preview width</span><b>{inspectorWidth()}px</b>
          <input type="range" min="240" max="560" value={inspectorWidth()} onInput={(event) => {
            const value = +event.currentTarget.value;
            setInspectorWidth(value);
            setPanelSize('preview', { width: value });
          }} />
        </label>
        <label>
          <span>Console height</span><b>{consoleHeight()}px</b>
          <input type="range" min="120" max="360" value={consoleHeight()} onInput={(event) => {
            const value = +event.currentTarget.value;
            setConsoleHeight(value);
            setPanelSize('console', { height: value });
          }} />
        </label>
        <Show when={closedPanels().length > 0}>
          <div class="restore-panels">
            <span>Restore</span>
            <For each={closedPanels().filter((id) => id !== 'command')}>
              {(id) => <button onClick={() => restorePanel(id)}>+ {panelDefinitions[id]?.title ?? id}</button>}
            </For>
          </div>
        </Show>
      </div>

      <div class="dock-host" ref={dockHost}>
        <DockviewSolid
          theme={customTheme(gap())}
          singleTabMode="fullwidth"
          components={{ panelContent: PanelContent }}
          tabComponents={{ customTab: CustomTab }}
          rightHeaderActionsComponent={HeaderActions}
          watermarkComponent={Watermark}
          onReady={handleReady}
        />
      </div>
    </main>
  );
}

export default App;
