import { type JSX } from "solid-js";
import { SplitviewApi, SplitviewOptions } from '@arminmajerie/dockview-core';
import type { PanelParameters } from "../types";
export interface SplitviewReadyEvent {
    api: SplitviewApi;
}
export interface ISplitviewPanelProps<T extends Record<string, any> = any> extends PanelParameters<T> {
    api: any;
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
export declare function SplitviewSolid(props: ISplitviewSolidProps): JSX.Element;
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
export declare function loadSplitRatio(storageKey: string, storage?: {
    getItem: (key: string) => string | null;
}): number | null;
