// packages/dockview/src/splitview/splitview.tsx
import { createEffect, onCleanup, onMount, type JSX } from "solid-js";
import {
  createSplitview,
  SplitviewApi,
  SplitviewOptions,
  SplitviewFrameworkOptions,
  SplitviewComponentOptions,
  PROPERTY_KEYS_SPLITVIEW,
} from '@arminmajerie/dockview-core';
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

  /** Prefer Solid's `class`; `className` remains as an alias during migration */
  class?: string;
  className?: string;

  /** Inline styles for the host element */
  style?: JSX.CSSProperties | string;

  /** Disable ResizeObserver-based relayout */
  disableAutoResizing?: boolean;

  /** Enable automatic persistence of split ratios to localStorage */
  persistRatio?: boolean;

  /**
   * Storage key for persisting split ratios.
   * If not provided and persistRatio is true, generates a key from component id.
   * Format: `splitview_ratio_${storageKey}`
   */
  storageKey?: string;

  /**
   * Custom storage interface. Defaults to localStorage.
   * Useful for custom storage backends or SSR environments.
   */
  storage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
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

/* ---------- Ratio Persistence Logic ---------- */

interface RatioPersistence {
  load: () => number | null;
  save: (ratio: number) => void;
  shouldPersist: () => boolean;
}

function createRatioPersistence(
  props: ISplitviewSolidProps,
  hostEl: () => HTMLDivElement | undefined
): RatioPersistence {
  if (!props.persistRatio) {
    return {
      load: () => null,
      save: () => {},
      shouldPersist: () => false,
    };
  }

  const storage = props.storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!storage) {
    console.warn('Splitview: persistRatio enabled but no storage available');
    return {
      load: () => null,
      save: () => {},
      shouldPersist: () => false,
    };
  }

  // Generate storage key
  const getStorageKey = () => {
    if (props.storageKey) {
      return `splitview_ratio_${props.storageKey}`;
    }
    // Fallback: try to generate from host element id or use a hash of component names
    const el = hostEl();
    if (el?.id) {
      return `splitview_ratio_${el.id}`;
    }
    // Last resort: hash component names (stable if components don't change)
    const componentHash = Object.keys(props.components).sort().join('_');
    return `splitview_ratio_${componentHash}`;
  };

  const load = (): number | null => {
    try {
      const key = getStorageKey();
      const stored = storage.getItem(key);
      if (!stored) return null;

      const ratio = Number(stored);
      if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
        return null;
      }

      // Ignore suspicious extremes
      if (ratio <= 0.05 || ratio >= 0.95) {
        return null;
      }

      return ratio;
    } catch (e) {
      console.error('Splitview: Failed to load persisted ratio', e);
      return null;
    }
  };

  const save = (ratio: number) => {
    try {
      const clamped = Math.max(0.05, Math.min(0.95, ratio));
      const key = getStorageKey();
      storage.setItem(key, String(clamped));
    } catch (e) {
      console.error('Splitview: Failed to save ratio', e);
    }
  };

  return {
    load,
    save,
    shouldPersist: () => true,
  };
}

/* ---------- Component ---------- */

export function SplitviewSolid(props: ISplitviewSolidProps) {
  let hostEl: HTMLDivElement | undefined;
  let api: SplitviewApi | undefined;
  let ro: ResizeObserver | undefined;

  const [portals, addPortal] = usePortalsLifecycle();

  // Track last seen SplitviewOptions to send only changes
  let prevOptions: Partial<SplitviewOptions> = {};

  // Ratio persistence state
  let saveEnabled = false;
  let userAdjusting = false;
  let wrapResizeSettled = true;
  let adjustResetTimer: number | undefined;
  let wrapSettleTimer: number | undefined;
  let firstPanelEl: HTMLElement | undefined;
  let panelRO: ResizeObserver | undefined;

  // Store cleanup function at component level
  let persistenceCleanup: (() => void) | undefined;

  const persistence = createRatioPersistence(props, () => hostEl);

  const attachPersistenceHandlers = () => {
    if (!persistence.shouldPersist() || !hostEl || !api) return;

    // Track user mouse interactions
    const onMouseDown = () => {
      userAdjusting = true;
      if (adjustResetTimer) window.clearTimeout(adjustResetTimer);
      adjustResetTimer = window.setTimeout(() => {
        userAdjusting = false;
      }, 1500);
    };

    const onMouseUp = () => {
      userAdjusting = false;
      if (adjustResetTimer) window.clearTimeout(adjustResetTimer);
    };

    try {
      hostEl.addEventListener('mousedown', onMouseDown, { passive: true });
      window.addEventListener('mouseup', onMouseUp, { passive: true });
    } catch (e) {
      console.error('Splitview: Failed to attach mouse handlers', e);
    }

    // Track wrapper resize to avoid persisting during layout thrash
    const onWrapResize = () => {
      wrapResizeSettled = false;
      if (wrapSettleTimer) window.clearTimeout(wrapSettleTimer);
      wrapSettleTimer = window.setTimeout(() => {
        wrapResizeSettled = true;
      }, 300);
    };

    if (ro) {
      // Enhance existing ResizeObserver callback
      const originalCallback = ro;
      ro.disconnect();
      ro = new ResizeObserver((entries) => {
        // Original resize logic
        if (api && hostEl) {
          api.layout(hostEl.clientWidth, hostEl.clientHeight);
        }
        // Persistence resize tracking
        onWrapResize();
      });
      ro.observe(hostEl);
    }

    // Observe first panel to detect ratio changes
    const observeFirstPanel = () => {
      try {
        panelRO?.disconnect();
      } catch (e) {
        console.error('Splitview: Failed to disconnect panel observer', e);
      }

      // Get first panel element from API
      const panels = (api as any).panels;
      if (!panels || panels.length === 0) return;

      firstPanelEl = panels[0]?.view?.element;
      if (!firstPanelEl || !hostEl) return;

      panelRO = new ResizeObserver(() => {
        if (!saveEnabled || !wrapResizeSettled || !userAdjusting) return;
        if (!hostEl || !firstPanelEl) return;

        const total = props.orientation === 'VERTICAL'
          ? hostEl.clientHeight
          : hostEl.clientWidth;
        const first = props.orientation === 'VERTICAL'
          ? firstPanelEl.clientHeight
          : firstPanelEl.clientWidth;

        if (total <= 1) return;
        const ratio = first / total;
        persistence.save(ratio);
      });

      panelRO.observe(firstPanelEl);
    };

    // Listen for panel changes
    api.onDidAddView(() => {
      observeFirstPanel();
    });

    api.onDidRemoveView(() => {
      observeFirstPanel();
    });

    observeFirstPanel();

    return () => {
      try {
        hostEl?.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        panelRO?.disconnect();
        if (adjustResetTimer) window.clearTimeout(adjustResetTimer);
        if (wrapSettleTimer) window.clearTimeout(wrapSettleTimer);
      } catch (e) {
        console.error('Splitview: Failed to cleanup persistence handlers', e);
      }
    };
  };

  onMount(() => {
    if (!hostEl) return;

    const frameworkOptions: SplitviewFrameworkOptions = {
      createComponent: (options) =>
        new SolidPanelView(
          options.id,
          options.name,
          props.components[options.name],
          { addPortal }
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

        // Setup persistence after initial layout - store cleanup
        persistenceCleanup = attachPersistenceHandlers();

        // Enable saving only after layout stabilizes
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            saveEnabled = true;
          });
        });

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
    panelRO?.disconnect();
    panelRO = undefined;
    api?.dispose();
    api = undefined;
    if (adjustResetTimer) window.clearTimeout(adjustResetTimer);
    if (wrapSettleTimer) window.clearTimeout(wrapSettleTimer);

    // Call persistence cleanup if it was set
    if (persistenceCleanup) {
      persistenceCleanup();
      persistenceCleanup = undefined;
    }
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

/* ---------- Export helper for programmatic ratio restoration ---------- */

/**
 * Helper to load a saved split ratio.
 * Returns the ratio (0-1) if found, or null if not found/invalid.
 * Use this when you need to manually set panel sizes in onReady.
 *
 * @example
 * ```tsx
 * <SplitviewSolid
 *   persistRatio={true}
 *   storageKey="my-split"
 *   onReady={({ api }) => {
 *     const ratio = loadSplitRatio('my-split');
 *     const totalWidth = containerEl.clientWidth;
 *
 *     api.addPanel({
 *       id: 'left',
 *       component: 'left',
 *       size: ratio ? totalWidth * ratio : 300
 *     });
 *     api.addPanel({ id: 'right', component: 'right' });
 *   }}
 * />
 * ```
 */
export function loadSplitRatio(
  storageKey: string,
  storage?: { getItem: (key: string) => string | null }
): number | null {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return null;

  try {
    const key = `splitview_ratio_${storageKey}`;
    const stored = store.getItem(key);
    if (!stored) return null;

    const ratio = Number(stored);
    if (!Number.isFinite(ratio) || ratio <= 0.05 || ratio >= 0.95) return null;

    return ratio;
  } catch (e) {
    console.error('Splitview: Failed to load ratio', e);
    return null;
  }
}
