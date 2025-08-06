import { createEffect, onCleanup, onMount, JSX } from 'solid-js';
import { PaneviewPanelApi, PaneviewApi, PaneviewDropEvent, createPaneview, PaneviewOptions, PROPERTY_KEYS_PANEVIEW, PaneviewComponentOptions, PaneviewFrameworkOptions } from 'dockview-core';
import { usePortalsLifecycle } from '../solid';
import { PanePanelSection } from './view';
import { PanelParameters } from '../types';

export interface PaneviewReadyEvent {
  api: PaneviewApi;
}

export interface IPaneviewPanelProps<T extends { [index: string]: any } = any> extends PanelParameters<T> {
  api: PaneviewPanelApi;
  containerApi: PaneviewApi;
  title: string;
}

export interface IPaneviewSolidProps extends PaneviewOptions {
  onReady: (event: PaneviewReadyEvent) => void;
  components: Record<string, (props: IPaneviewPanelProps) => JSX.Element>;
  headerComponents?: Record<string, (props: IPaneviewPanelProps) => JSX.Element>;
  onDidDrop?: (event: PaneviewDropEvent) => void;
}

function extractCoreOptions(props: IPaneviewSolidProps): PaneviewOptions {
  const coreOptions = PROPERTY_KEYS_PANEVIEW.reduce((obj, key) => {
    if (key in props) {
      obj[key] = props[key] as any;
    }
    return obj;
  }, {} as Partial<PaneviewComponentOptions>);

  return coreOptions as PaneviewOptions;
}

export function PaneviewSolid(props: IPaneviewSolidProps) {
  let domRef: HTMLDivElement | undefined;
  let paneviewRef: PaneviewApi | undefined;
  const [portals, addPortal] = usePortalsLifecycle();

  let prevProps: Partial<IPaneviewSolidProps> = {};

  // Handle options changes reactively
  createEffect(() => {
    const changes: Partial<PaneviewOptions> = {};
    PROPERTY_KEYS_PANEVIEW.forEach((propKey) => {
      if ((propKey as keyof IPaneviewSolidProps) in props) {
        // Only apply keys that exist in PaneviewOptions!
        changes[propKey as keyof PaneviewOptions] = props[propKey as keyof IPaneviewSolidProps] as any;
      }
    });
    if (paneviewRef) {
      paneviewRef.updateOptions(changes);
    }
    prevProps = { ...props };
  });

  // Initial mount: create Paneview instance and panels
  onMount(() => {
    if (!domRef) return;

    const headerComponents = props.headerComponents ?? {};

    const frameworkOptions: PaneviewFrameworkOptions = {
      createComponent: (options) => {
        return new PanePanelSection(
          options.id,
          props.components[options.name],
          { addPortal }
        );
      },
      createHeaderComponent: (options) => {
        return new PanePanelSection(
          options.id,
          headerComponents[options.name],
          { addPortal }
        );
      },
    };

    const api = createPaneview(domRef, {
      ...extractCoreOptions(props),
      ...frameworkOptions,
    });

    api.layout(domRef.clientWidth, domRef.clientHeight);

    if (props.onReady) {
      props.onReady({ api });
    }

    paneviewRef = api;

    onCleanup(() => {
      paneviewRef = undefined;
      api.dispose();
    });
  });

  // Watch for components prop changes
  createEffect(() => {
    if (!paneviewRef) return;
    paneviewRef.updateOptions({
      createComponent: (options) => {
        return new PanePanelSection(
          options.id,
          props.components[options.name],
          { addPortal }
        );
      },
    });
  });

  // Watch for headerComponents prop changes
  createEffect(() => {
    if (!paneviewRef) return;
    const headerComponents = props.headerComponents ?? {};
    paneviewRef.updateOptions({
      createHeaderComponent: (options) => {
        return new PanePanelSection(
          options.id,
          headerComponents[options.name],
          { addPortal }
        );
      },
    });
  });

  // Listen for onDidDrop event
  createEffect(() => {
    if (!paneviewRef) return;
    const disposable = paneviewRef.onDidDrop((event) => {
      if (props.onDidDrop) props.onDidDrop(event);
    });
    onCleanup(() => disposable.dispose());
  });

  return (
    <div style={{ height: '100%', width: '100%' }} ref={el => domRef = el}>
      {/*{portals()}*/}
    </div>
  );
}
