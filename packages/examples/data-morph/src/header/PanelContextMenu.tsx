// src/core/services/broker/PanelContextMenu.tsx
/**
 * Context menu component for dockview panel tabs.
 * Provides "Detach to Window" option for panels that support it.
 */
import { Component, createSignal, Show, onCleanup, onMount } from 'solid-js';
import type { DockviewPanelApi } from '@arminmajerie/dockview-solid';
import {Box} from "@suid/material";

export interface PanelContextMenuProps {
  /** The panel API from dockview */
  panelApi: DockviewPanelApi;
  /** Panel type identifier (e.g., 'logViewer', 'textEditor') */
  panelType: string;
  /** Panel parameters (optional, but required for canvas/textEditor panels) */
  panelParams?: Record<string, any>;
  /** Whether this panel supports detaching (default: true) */
  canDetach?: boolean;
  /** Callback when detach is requested */
  onDetach?: () => void;
  /** Position for the context menu */
  position: { x: number; y: number };
  /** Callback when menu should close */
  onClose: () => void;
}

// Map panel types to their HTML paths
// Only textEditor supports detachment - canvas and component DnD doesn't work cross-window
const PANEL_HTML_PATHS: Record<string, string> = {
  logViewer: 'src/features/logViewer/popups/DetachedLogViewer/DetachedLogViewer.html',
  pipeline: 'src/features/pipeline/popups/DetachedPipeline/DetachedPipeline.html',
  runManager: 'src/features/runManager/popups/DetachedRunManager/DetachedRunManager.html',
  workspace: 'src/features/projectExplorer/popups/DetachedWorkspace/DetachedWorkspace.html',
  textEditor: 'src/components/_shared/FileEditor/popups/DetachedTextEditor/DetachedTextEditor.html',
};

// Map panel types to window labels
const PANEL_WINDOW_LABELS: Record<string, string> = {
  logViewer: 'logviewer_detached',
  pipeline: 'pipeline_detached',
  runManager: 'runmanager_detached',
  workspace: 'workspace_detached',
  textEditor: 'texteditor_detached',
};

// Storage key for text editor parameters (used by DetachedTextEditor)
const TEXTEDITOR_PARAMS_KEY = 'ib_detached_texteditor_params';



export const PanelContextMenu: Component<PanelContextMenuProps> = (props) => {
  let menuRef: HTMLDivElement | undefined;
  
  // Close menu when clicking outside - use setTimeout to avoid closing immediately
  // The right-click that opens the menu also fires mousedown, so we delay the listener
  const handleClickOutside = (e: MouseEvent) => {
    0&&console['log']('[PanelContextMenu] handleClickOutside called, menuRef:', !!menuRef, 'contains:', menuRef?.contains(e.target as Node));
    if (menuRef && !menuRef.contains(e.target as Node)) {
      props.onClose();
    }
  };
  
  // Close menu on Escape
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.onClose();
    }
  };
  
  onMount(() => {
    // Delay adding listener to avoid the opening right-click from closing the menu
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 100);
  });
  
  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  });
  
  const canDetach = props.canDetach !== false;
  
  return (
    <Box
      ref={menuRef}
      sx={{
        position: 'fixed',
        left: `${props.position.x}px`,
        top: `${props.position.y}px`,
        minWidth: '150px',
        background: '#2d2d2d',
        border: '1px solid transparent',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: '10000',
        padding: '4px 0',
        fontSize: '13px',
      }}
    >
      <button
        onClick={() => {
          props.onClose();
          props.panelApi.close();
        }}
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
          width: '100%',
          padding: '6px 12px',
          background: 'transparent',
          border: 'none',
          color: '#cccccc',
          cursor: 'pointer',
          'text-align': 'left',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#dc2626';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Close Panel
      </button>
    </Box>
  );
};

/**
 * Hook to manage context menu state for a panel tab.
 */
export function createPanelContextMenu() {
  const [menuState, setMenuState] = createSignal<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  
  const showMenu = (e: MouseEvent) => {
    0&&console['log']('[PanelContextMenu] showMenu called - right-click detected at:', e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
    setMenuState({ visible: true, x: e.clientX, y: e.clientY });
  };
  
  const hideMenu = () => {
    0&&console['log']('[PanelContextMenu] hideMenu called');
    setMenuState((prev) => ({ ...prev, visible: false }));
  };
  
  return {
    menuState,
    showMenu,
    hideMenu,
    onContextMenu: showMenu,
  };
}
