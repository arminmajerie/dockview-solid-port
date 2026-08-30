import { SolidPart } from '../solid';
import { DockviewEmitter, } from '@arminmajerie/dockview-core';
export class SolidPanelContentPart {
    id;
    component;
    solidPortalStore;
    _element;
    part;
    _onDidFocus = new DockviewEmitter();
    onDidFocus = this._onDidFocus.event;
    _onDidBlur = new DockviewEmitter();
    onDidBlur = this._onDidBlur.event;
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
        this.part?.update({ params: event.params });
    }
    layout(_width, _height) {
        // noop
    }
    dispose() {
        this._onDidFocus.dispose();
        this._onDidBlur.dispose();
        this.part?.dispose();
    }
}
