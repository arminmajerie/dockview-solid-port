import { SolidPortalStore } from '../solid';
import { PanelUpdateEvent, ITabRenderer, TabPartInitParameters, IDockviewPanelHeaderProps } from 'dockview-core';
import { JSX } from 'solid-js';
export declare class SolidPanelHeaderPart implements ITabRenderer {
    readonly id: string;
    private readonly component;
    private readonly solidPortalStore;
    private readonly _element;
    private part?;
    get element(): HTMLElement;
    constructor(id: string, component: (props: IDockviewPanelHeaderProps) => JSX.Element, solidPortalStore: SolidPortalStore);
    focus(): void;
    init(parameters: TabPartInitParameters): void;
    update(event: PanelUpdateEvent): void;
    layout(_width: number, _height: number): void;
    dispose(): void;
}
