import { createSignal, onCleanup, onMount, JSX } from 'solid-js';
import { CloseButton } from '../svg';
import type { DockviewPanelApi, IDockviewPanelHeaderProps } from 'dockview-core';

function useTitle(api: DockviewPanelApi): () => string | undefined {
  const [title, setTitle] = createSignal<string | undefined>(api.title);

  let dispose: { dispose: () => void };

  onMount(() => {
    dispose = api.onDidTitleChange((event) => {
      setTitle(event.title);
    });
  });

  onCleanup(() => {
    dispose?.dispose();
  });

  return title;
}

export type IDockviewDefaultTabProps = IDockviewPanelHeaderProps &
  JSX.HTMLAttributes<HTMLDivElement> & {
  hideClose?: boolean;
  closeActionOverride?: () => void;
};

export function DockviewDefaultTab(props: IDockviewDefaultTabProps) {
  const title = useTitle(props.api);

  // Solid doesn't have refs like React; just use a variable
  let isMiddleMouseButton = false;

  // onClose action
  function onClose(event: MouseEvent) {
    event.preventDefault();
    if (props.closeActionOverride) {
      props.closeActionOverride();
    } else {
      props.api.close();
    }
  }

  function onBtnPointerDown(event: PointerEvent) {
    event.preventDefault();
  }

  function _onPointerDown(event: PointerEvent) {
    isMiddleMouseButton = event.button === 1;
    if (typeof props.onPointerDown === "function") {
      props.onPointerDown(event as PointerEvent & { currentTarget: HTMLDivElement, target: Element });
    }

  }

  function _onPointerUp(event: PointerEvent) {
    if (isMiddleMouseButton && event.button === 1 && !props.hideClose) {
      isMiddleMouseButton = false;
      onClose(event as unknown as MouseEvent);
    }
    if (typeof props.onPointerUp === "function") {
      props.onPointerUp(event as PointerEvent & { currentTarget: HTMLDivElement; target: Element });
    }

  }

  function _onPointerLeave(event: PointerEvent) {
    isMiddleMouseButton = false;
    if (typeof props.onPointerLeave === "function") {
      props.onPointerLeave(event as PointerEvent & { currentTarget: HTMLDivElement; target: Element });
    }

  }

  // Destructure props for rest spreading (Solid uses props.children too)
  const {
    api: _api,
    containerApi: _containerApi,
    params: _params,
    hideClose,
    closeActionOverride,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    tabLocation,
    ...rest
  } = props;

  return (
    <div
      data-testid="dockview-dv-default-tab"
      {...rest}
      onPointerDown={_onPointerDown}
      onPointerUp={_onPointerUp}
      onPointerLeave={_onPointerLeave}
      class="dv-default-tab"
    >
      <span class="dv-default-tab-content">{title()}</span>
      {!hideClose && tabLocation !== 'headerOverflow' && (
        <div
          class="dv-default-tab-action"
          onPointerDown={onBtnPointerDown}
          onClick={onClose}
        >
          <CloseButton />
        </div>
      )}
    </div>
  );
}
