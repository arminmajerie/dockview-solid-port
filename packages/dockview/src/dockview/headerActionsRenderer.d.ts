import { SolidPart, SolidPortalStore } from '../solid';
import { DockviewApi, DockviewGroupPanel, DockviewGroupPanelApi, PanelUpdateEvent, IHeaderActionsRenderer, IDockviewHeaderActionsProps } from 'dockview-core';
import { JSX } from 'solid-js';
export declare class SolidHeaderActionsRendererPart implements IHeaderActionsRenderer {
    private readonly component;
    private readonly solidPortalStore;
    private readonly _group;
    private readonly mutableDisposable;
    private readonly _element;
    private _part?;
    get element(): HTMLElement;
    get part(): SolidPart<IDockviewHeaderActionsProps> | undefined;
    constructor(component: (props: IDockviewHeaderActionsProps) => JSX.Element, solidPortalStore: SolidPortalStore, _group: DockviewGroupPanel);
    init(parameters: {
        containerApi: DockviewApi;
        api: DockviewGroupPanelApi;
    }): void;
    dispose(): void;
    update(event: PanelUpdateEvent): void;
    private updatePanels;
    private updateActivePanel;
    private updateGroupActive;
}
