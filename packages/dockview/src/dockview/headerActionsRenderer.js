import { SolidPart } from '../solid';
import { DockviewCompositeDisposable, DockviewMutableDisposable, } from '@arminmajerie/dockview-core';
export class SolidHeaderActionsRendererPart {
    component;
    solidPortalStore;
    _group;
    mutableDisposable = new DockviewMutableDisposable();
    _element;
    _part;
    get element() {
        return this._element;
    }
    get part() {
        return this._part;
    }
    constructor(component, solidPortalStore, _group) {
        this.component = component;
        this.solidPortalStore = solidPortalStore;
        this._group = _group;
        this._element = document.createElement('div');
        this._element.className = 'dv-solid-part';
        this._element.style.height = '100%';
        this._element.style.display = 'flex';
        this._element.style.alignItems = 'center';
    }
    init(parameters) {
        this.mutableDisposable.value = new DockviewCompositeDisposable(this._group.model.onDidAddPanel(() => {
            this.updatePanels();
        }), this._group.model.onDidRemovePanel(() => {
            this.updatePanels();
        }), this._group.model.onDidActivePanelChange(() => {
            this.updateActivePanel();
        }), parameters.api.onDidActiveChange(() => {
            this.updateGroupActive();
        }));
        this._part = new SolidPart(this.element, this.solidPortalStore, this.component, {
            api: parameters.api,
            containerApi: parameters.containerApi,
            panels: this._group.model.panels,
            activePanel: this._group.model.activePanel,
            isGroupActive: this._group.api.isActive,
            group: this._group,
        });
    }
    dispose() {
        this.mutableDisposable.dispose();
        this._part?.dispose();
    }
    update(event) {
        this._part?.update(event.params);
    }
    updatePanels() {
        this.update({ params: { panels: this._group.model.panels } });
    }
    updateActivePanel() {
        this.update({
            params: {
                activePanel: this._group.model.activePanel,
            },
        });
    }
    updateGroupActive() {
        this.update({
            params: {
                isGroupActive: this._group.api.isActive,
            },
        });
    }
}
