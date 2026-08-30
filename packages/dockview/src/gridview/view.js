import { GridviewApi, GridviewPanel, } from '@arminmajerie/dockview-core';
import { SolidPart } from '../solid';
export class SolidGridPanelView extends GridviewPanel {
    solidComponent;
    solidPortalStore;
    constructor(id, component, solidComponent, solidPortalStore) {
        super(id, component);
        this.solidComponent = solidComponent;
        this.solidPortalStore = solidPortalStore;
    }
    getComponent() {
        return new SolidPart(this.element, this.solidPortalStore, this.solidComponent, {
            params: this._params?.params ?? {},
            api: this.api,
            // If containerApi type-cast is needed, keep the hack,
            // but this is a known issue in the original as well
            containerApi: new GridviewApi(this._params
                .accessor),
        });
    }
}
