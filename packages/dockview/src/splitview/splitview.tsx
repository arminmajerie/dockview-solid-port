import { createEffect, onCleanup, createSignal, onMount } from 'solid-js';
import { SplitviewApi, SplitviewPanelApi, createSplitview, SplitviewOptions, PROPERTY_KEYS_SPLITVIEW, SplitviewFrameworkOptions, SplitviewComponentOptions } from "dockview-core";
import { usePortalsLifecycle } from "../solid"; // <-- your Solid version
import { PanelParameters } from "../types";
import { SolidPanelView } from "./view";       // <-- your Solid version

export interface SplitviewReadyEvent {
  api: SplitviewApi;
}

export interface ISplitviewPanelProps<T extends { [index: string]: any } = any> extends PanelParameters<T> {
  api: SplitviewPanelApi;
  containerApi: SplitviewApi;
}

export interface ISplitviewSolidProps extends SplitviewOptions {
  onReady: (event: SplitviewReadyEvent) => void;
  components: Record<string, (props: ISplitviewPanelProps) => any>;
}

function extractCoreOptions(props: ISplitviewSolidProps): SplitviewOptions {
  const coreOptions = PROPERTY_KEYS_SPLITVIEW.reduce((obj, key) => {
    if (key in props) {
      obj[key] = props[key] as any;
    }
    return obj;
  }, {} as Partial<SplitviewComponentOptions>);
  return coreOptions as SplitviewOptions;
}

export function SplitviewSolid(props: ISplitviewSolidProps) {
  let domRef: HTMLDivElement | undefined;
  let splitviewRef: SplitviewApi | undefined;
  const [portals, addPortal] = usePortalsLifecycle();
  let prevProps: Partial<ISplitviewSolidProps> = {};

  // Handle SplitviewOptions changes reactively
  createEffect(() => {
    const changes: Partial<SplitviewOptions> = {};
    PROPERTY_KEYS_SPLITVIEW.forEach((propKey) => {
      // this is always a valid key for SplitviewOptions!
      const key = propKey as keyof SplitviewOptions;
      const propValue = props[key as keyof ISplitviewSolidProps];
      if (key in props && propValue !== prevProps[key]) {
        changes[key] = propValue as any;
      }
    });
    if (splitviewRef) {
      splitviewRef.updateOptions(changes);
    }
    prevProps = { ...props };
  });

  onCleanup(() => {
    splitviewRef?.dispose();
    splitviewRef = undefined;
  });

  // Initialization
  onMount(() => {
    if (!domRef) return;

    const frameworkOptions: SplitviewFrameworkOptions = {
      createComponent: (options) => {
        return new SolidPanelView(
          options.id,
          options.name,
          props.components[options.name],
          { addPortal }
        );
      }
    };

    splitviewRef = createSplitview(domRef, {
      ...extractCoreOptions(props),
      ...frameworkOptions,
    });

    const { clientWidth, clientHeight } = domRef;
    splitviewRef.layout(clientWidth, clientHeight);

    if (props.onReady) {
      props.onReady({ api: splitviewRef });
    }
  });

  // Update createComponent if props.components changes
  createEffect(() => {
    if (!splitviewRef) return;
    splitviewRef.updateOptions({
      createComponent: (options) => {
        return new SolidPanelView(
          options.id,
          options.name,
          props.components[options.name],
          { addPortal }
        );
      }
    });
  });

  return (
    <div ref={el => domRef = el} style={{ height: "100%", width: "100%" }}>
      {/*{portals()}*/}
    </div>
  );
}
