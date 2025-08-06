import { SolidPart } from '../solid';
import { DockviewEmitter, } from 'dockview-core';
export class SolidPanelContentPart {
    get element() {
        return this._element;
    }
    constructor(id, component, solidPortalStore) {
        this.id = id;
        this.component = component;
        this.solidPortalStore = solidPortalStore;
        this._onDidFocus = new DockviewEmitter();
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = new DockviewEmitter();
        this.onDidBlur = this._onDidBlur.event;
        this._element = document.createElement('div');
        this._element.className = 'dv-solid-part';
        this._element.style.height = '100%';
        this._element.style.width = '100%';
    }
    focus() {
        // TODO: implement focus logic if needed
    }
    init(parameters) {
        this.part = new SolidPart(this.element, this.solidPortalStore, this.component, {
            params: parameters.params,
            api: parameters.api,
            containerApi: parameters.containerApi,
        });
    }
    update(event) {
        var _a;
        (_a = this.part) === null || _a === void 0 ? void 0 : _a.update({ params: event.params });
    }
    layout(_width, _height) {
        // noop
    }
    dispose() {
        var _a;
        this._onDidFocus.dispose();
        this._onDidBlur.dispose();
        (_a = this.part) === null || _a === void 0 ? void 0 : _a.dispose();
    }
}
