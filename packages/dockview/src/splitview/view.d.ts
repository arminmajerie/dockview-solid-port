import { SplitviewPanel } from '@arminmajerie/dockview-core';
import { SolidPart, SolidPortalStore } from "../solid";
import { ISplitviewPanelProps } from "./splitview";
import type { JSX } from "solid-js";
/**
 * Solid-backed panel view that satisfies dockview-core's SplitviewPanel contract.
 * No non-existent types/classes are used.
 */
export declare class SolidPanelView extends SplitviewPanel {
    private readonly solidComponent;
    private readonly solidPortalStore;
    constructor(id: string, component: string, solidComponent: (props: ISplitviewPanelProps) => JSX.Element, solidPortalStore: SolidPortalStore);
    /**
     * Called by dockview-core to obtain the framework-specific renderer.
     * We return a SolidPart that mounts the Solid component into this.element.
     */
    getComponent(): SolidPart<ISplitviewPanelProps>;
}
