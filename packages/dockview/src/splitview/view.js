import { SplitviewApi, SplitviewPanel, } from 'dockview-core';
import { SolidPart } from '../solid'; // Use your Solid version
export class SolidPanelView extends SplitviewPanel {
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
            containerApi: new SplitviewApi(this._params.accessor),
        });
    }
}
