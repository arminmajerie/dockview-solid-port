// packages/dockview/src/splitview/splitview.tsx
import { createEffect, onCleanup, onMount, type JSX } from "solid-js";
import {
  createSplitview,
  SplitviewApi,
  SplitviewOptions,
  SplitviewFrameworkOptions,
  SplitviewComponentOptions,
  PROPERTY_KEYS_SPLITVIEW,
} from "dockview-core";
import { usePortalsLifecycle } from "../solid";
import type { PanelParameters } from "../types";
import { SolidPanelView } from "./view";

/* ---------- Events & Props ---------- */

export interface SplitviewReadyEvent {
  api: SplitviewApi;
}

export interface ISplitviewPanelProps<T extends Record<string, any> = any>
  extends PanelParameters<T> {
  api: any;             // panel API from dockview-core (kept as `any` to avoid value/type mixups)
  containerApi: SplitviewApi;
}

export interface ISplitviewSolidProps extends SplitviewOptions {
  /** Registry of Solid components, referenced by name in api.addPanel({ component }) */
  components: Record<string, (props: ISplitviewPanelProps) => JSX.Element>;

  /** Called after the first layout when the host has a real size */
  onReady?: (event: SplitviewReadyEvent) => void;

  /** Prefer Solid’s `class`; `className` remains as an alias during migration */
  class?: string;
  className?: string;

  /** Inline styles for the host element */
  style?: JSX.CSSProperties | string;

  /** Disable ResizeObserver-based relayout */
  disableAutoResizing?: boolean;
}

/* ---------- Helpers ---------- */

function extractCoreOptions(props: ISplitviewSolidProps): SplitviewOptions {
  const core = PROPERTY_KEYS_SPLITVIEW.reduce((acc, key) => {
    if (key in props) {
      (acc as any)[key] = (props as any)[key];
    }
    return acc;
  }, {} as Partial<SplitviewComponentOptions>);
  return core as SplitviewOptions;
}

/* ---------- Component ---------- */

export function SplitviewSolid(props: ISplitviewSolidProps) {
  let hostEl: HTMLDivElement | undefined;
  let api: SplitviewApi | undefined;
  let ro: ResizeObserver | undefined;

  const [portals, addPortal] = usePortalsLifecycle();

  // Track last seen SplitviewOptions to send only changes
  let prevOptions: Partial<SplitviewOptions> = {};

  onMount(() => {
    if (!hostEl) return;

    const frameworkOptions: SplitviewFrameworkOptions = {
      createComponent: (options) =>
        new SolidPanelView(
          options.id,
          options.name,
          props.components[options.name],
          { addPortal } // SolidPortalStore shape in your code
        ),
    };

    api = createSplitview(hostEl, {
      ...extractCoreOptions(props),
      ...frameworkOptions,
    });

    // Ensure first layout when element has real size (double rAF)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!api || !hostEl) return;
        api.layout(hostEl.clientWidth, hostEl.clientHeight);
        props.onReady?.({ api });
      });
    });

    if (!props.disableAutoResizing && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => {
        if (!api || !hostEl) return;
        api.layout(hostEl.clientWidth, hostEl.clientHeight);
      });
      ro.observe(hostEl);
    }
  });

  // Update createComponent if components registry identity changes
  createEffect(() => {
    if (!api) return;
    api.updateOptions({
      createComponent: (options) =>
        new SolidPanelView(
          options.id,
          options.name,
          props.components[options.name],
          { addPortal }
        ),
    });
  });

  // Reactively update SplitviewOptions (orientation, margin, proportionalLayout, styles, descriptor, ...)
  createEffect(() => {
    if (!api) return;

    const changes: Partial<SplitviewOptions> = {};
    for (const k of PROPERTY_KEYS_SPLITVIEW) {
      const nextVal = (props as any)[k];
      if (nextVal !== (prevOptions as any)[k]) {
        (changes as any)[k] = nextVal;
      }
    }

    if (Object.keys(changes).length > 0) {
      api.updateOptions(changes);
      prevOptions = { ...prevOptions, ...changes };
      if (hostEl) api.layout(hostEl.clientWidth, hostEl.clientHeight);
    }
  });

  onCleanup(() => {
    ro?.disconnect();
    ro = undefined;
    api?.dispose();
    api = undefined;
  });

  const hostClass = () => props.class ?? props.className ?? undefined;

  return (
    <div
      ref={(el) => (hostEl = el)}
      class={hostClass()}
      style={props.style}
    >
      {/*{portals()}*/}
    </div>
  );
}
