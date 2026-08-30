import { SolidPart } from '../solid';
export class SolidPanelHeaderPart {
    id;
    component;
    solidPortalStore;
    _element;
    part;
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
        // noop
    }
    init(parameters) {
        this.part = new SolidPart(this.element, this.solidPortalStore, this.component, {
            params: parameters.params,
            api: parameters.api,
            containerApi: parameters.containerApi,
            tabLocation: parameters.tabLocation,
        });
    }
    update(event) {
        this.part?.update({ params: event.params });
    }
    layout(_width, _height) {
        // noop
    }
    dispose() {
        this.part?.dispose();
    }
}
