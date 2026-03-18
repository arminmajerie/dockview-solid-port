import { createSignal, onCleanup } from 'solid-js';
import {
  DockviewApi,
  DockviewReadyEvent,
  DockviewSolid,
  IDockviewPanelProps,
  themeReplit,
} from '@arminmajerie/dockview-solid';

type LayoutState = {
  activePanel?: string;
  groups: Array<{
    id: string;
    panels: string[];
    activePanel?: string;
  }>;
};

function HarnessPanel(props: IDockviewPanelProps) {
  return (
    <div
      data-testid={`panel-content-${props.api.id}`}
      style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        height: '100%',
        'font-size': '20px',
        color: '#203a48',
        background: 'linear-gradient(180deg, #eef6fb 0%, #dce9f4 100%)',
      }}
    >
      {props.api.title}
    </div>
  );
}

export function DockviewDndHarness() {
  let api: DockviewApi | undefined;
  const [layoutState, setLayoutState] = createSignal<LayoutState>({
    groups: [],
  });
  const [dragState, setDragState] = createSignal('{}');
  const [environmentState, setEnvironmentState] = createSignal('{}');
  const disposables: Array<{ dispose(): void }> = [];

  const syncState = () => {
    if (!api) {
      return;
    }

    setLayoutState({
      activePanel: api.activePanel?.id,
      groups: api.groups.map((group) => ({
        id: group.id,
        panels: group.panels.map((panel) => panel.id),
        activePanel: group.activePanel?.id,
      })),
    });

    setDragState(JSON.stringify(api.dragSession));
    setEnvironmentState(
      JSON.stringify({
        interactionMode: api.interactionMode,
        layoutMode: api.layoutMode,
      })
    );
  };

  const handleReady = (event: DockviewReadyEvent) => {
    api = event.api;

    event.api.addPanel({
      id: 'alpha',
      title: 'Alpha',
      component: 'panel',
    });
    event.api.addPanel({
      id: 'beta',
      title: 'Beta',
      component: 'panel',
      position: {
        referencePanel: 'alpha',
        direction: 'within',
      },
    });
    event.api.addPanel({
      id: 'gamma',
      title: 'Gamma',
      component: 'panel',
      position: {
        referencePanel: 'alpha',
        direction: 'right',
      },
    });

    disposables.push(
      event.api.onDidLayoutChange(syncState),
      event.api.onDidActivePanelChange(syncState),
      event.api.onDidInteractionModeChange(syncState),
      event.api.onDidLayoutModeChange(syncState),
      event.api.onDidDragSessionChange(syncState)
    );

    requestAnimationFrame(() => {
      syncState();
    });
  };

  onCleanup(() => {
    disposables.forEach((disposable) => disposable.dispose());
  });

  return (
    <div class="dockview-theme-replit dockview-dnd-harness" data-testid="dockview-dnd-harness">
      <div class="dockview-dnd-harness__layout">
        <DockviewSolid
          theme={themeReplit}
          components={{ panel: HarnessPanel }}
          onReady={handleReady}
        />
      </div>
      <aside class="dockview-dnd-harness__state" data-testid="dockview-dnd-state">
        <h1>Dockview DnD Harness</h1>
        <pre data-testid="layout-state">{JSON.stringify(layoutState())}</pre>
        <pre data-testid="drag-session-state">{dragState()}</pre>
        <pre data-testid="environment-state">{environmentState()}</pre>
      </aside>
    </div>
  );
}

export default DockviewDndHarness;
