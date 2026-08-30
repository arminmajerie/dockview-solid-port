// packages/dockview/src/splitview/view.ts
import { SplitviewApi, SplitviewPanel, } from '@arminmajerie/dockview-core';
import { SolidPart } from "../solid";
/**
 * Solid-backed panel view that satisfies dockview-core's SplitviewPanel contract.
 * No non-existent types/classes are used.
 */
export class SolidPanelView extends SplitviewPanel {
    solidComponent;
    solidPortalStore;
    constructor(id, component, solidComponent, solidPortalStore) {
        super(id, component);
        this.solidComponent = solidComponent;
        this.solidPortalStore = solidPortalStore;
    }
    /**
     * Called by dockview-core to obtain the framework-specific renderer.
     * We return a SolidPart that mounts the Solid component into this.element.
     */
    getComponent() {
        const paramsObj = this._params;
        return new SolidPart(this.element, this.solidPortalStore, this.solidComponent, {
            // user params
            params: paramsObj?.params ?? {},
            // panel API (already created by base class)
            api: this.api,
            // Splitview API for the container, created from accessor
            containerApi: new SplitviewApi(paramsObj.accessor),
        });
    }
}
