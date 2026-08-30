import { SolidPart } from '../solid';
export class PanePanelSection {
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
        this._element.style.height = '100%';
        this._element.style.width = '100%';
    }
    init(parameters) {
        this.part = new SolidPart(this.element, this.solidPortalStore, this.component, {
            params: parameters.params,
            api: parameters.api,
            title: parameters.title,
            containerApi: parameters.containerApi
        });
    }
    toJSON() {
        return {
            id: this.id,
        };
    }
    update(params) {
        this.part?.update(params.params);
    }
    dispose() {
        this.part?.dispose();
    }
}
