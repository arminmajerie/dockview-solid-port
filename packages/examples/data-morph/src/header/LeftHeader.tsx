import { getOwner, runWithOwner, Component, createSignal, onMount, Show, onCleanup, For, createEffect, createRoot } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  IDockviewPanelHeaderProps,
} from '@arminmajerie/dockview-solid';
import {createPanelContextMenu, PanelContextMenu} from "./PanelContextMenu";
import CloseIcon from '@suid/icons-material/Close';
import {Box} from "@suid/material";

function CustomTabHeaderWithCloseButton(props: IDockviewPanelHeaderProps) {
  const [hover, setHover] = createSignal(false);
  const { menuState, showMenu, hideMenu } = createPanelContextMenu();
  
  // Determine panel type from the panel ID or params
  const getPanelType = () => {
    return 'main';
  };
  
  const handleContextMenu = (e: MouseEvent) => {
    // 0&&console['log']('[CustomTabHeader] onContextMenu triggered for panel:', props.api.id);
    showMenu(e);
  };
  
  return (
    <Box>
      <Box
        sx={{
          padding: '0 8px 0 10px',
          color: 'purple',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: '100px',
          height: '100%',
          boxSizing: 'border-box',
        }}
        onContextMenu={handleContextMenu}
      >
    <span
      style={{
        overflow: 'hidden',
        'text-overflow': 'ellipsis',
        'white-space': 'nowrap',
        'padding-right': '22px',
        width: '100%',
      }}
    >
    {props.params.title}
    </span>
        <button
          style={{
            background: hover() ? '#8ea7d6' : 'none',
            border: 'none',
            'border-radius': '70%',
            transition: 'background 0.9s',
            cursor: 'pointer',
            position: 'absolute',
            right: '-3px',
            top: '-8px',
            padding: 0,
            margin: 0,
            'margin-top': '-15px',
            'margin-right': '-8px',
            'z-index': 2,
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => props.api.close()}
          title="Close"
        >
          <CloseIcon style={{ width: '12px', height: '12px', color: '#34343a' }} />
        </button>
      </Box>
      
      <Show when={menuState().visible}>
        <Portal mount={document.body}>
          <PanelContextMenu
            panelApi={props.api}
            panelType={getPanelType()}
            panelParams={props.params}
            position={{ x: menuState().x, y: menuState().y }}
            onClose={hideMenu}
          />
        </Portal>
      </Show>
    </Box>
  );
}