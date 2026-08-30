import { SolidPart } from '../solid';
export class SolidWatermarkPart {
    id;
    component;
    solidPortalStore;
    _element;
    part;
    parameters;
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
        if (this.parameters) {
            this.parameters.params = params.params;
        }
        this.part?.update({ params: this.parameters?.params ?? {} });
    }
    layout(_width, _height) {
        // noop - retrieval from api
    }
    dispose() {
        this.part?.dispose();
    }
}
