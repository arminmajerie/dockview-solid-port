import { SolidPart } from '../solid';
export class SolidWatermarkPart {
    get element() {
        return this._element;
    }
    constructor(id, component, solidPortalStore) {
        this.id = id;
        this.component = component;
        this.solidPortalStore = solidPortalStore;
        this._element = document.createElement('div');
        this._element.className = 'dv-solid-part';
        this._element.style.height = '100%';
        this._element.style.width = '100%';
    }
    init(parameters) {
        this.part = new SolidPart(this.element, this.solidPortalStore, this.component, {
            group: parameters.group, // will always be present, but can be undefined
            containerApi: parameters.containerApi,
        });
    }
    focus() {
        // noop
    }
    update(params) {
        var _a, _b, _c;
        if (this.parameters) {
            this.parameters.params = params.params;
        }
        (_a = this.part) === null || _a === void 0 ? void 0 : _a.update({ params: (_c = (_b = this.parameters) === null || _b === void 0 ? void 0 : _b.params) !== null && _c !== void 0 ? _c : {} });
    }
    layout(_width, _height) {
        // noop - retrieval from api
    }
    dispose() {
        var _a;
        (_a = this.part) === null || _a === void 0 ? void 0 : _a.dispose();
    }
}
