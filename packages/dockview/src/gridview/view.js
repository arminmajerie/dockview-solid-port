import { GridviewApi, GridviewPanel, } from 'dockview-core';
import { SolidPart } from '../solid';
export class SolidGridPanelView extends GridviewPanel {
    constructor(id, component, solidComponent, solidPortalStore) {
        super(id, component);
        this.solidComponent = solidComponent;
        this.solidPortalStore = solidPortalStore;
    }
    getComponent() {
        var _a, _b;
        return new SolidPart(this.element, this.solidPortalStore, this.solidComponent, {
            params: (_b = (_a = this._params) === null || _a === void 0 ? void 0 : _a.params) !== null && _b !== void 0 ? _b : {},
            api: this.api,
            // If containerApi type-cast is needed, keep the hack,
            // but this is a known issue in the original as well
            containerApi: new GridviewApi(this._params
                .accessor),
        });
    }
}
