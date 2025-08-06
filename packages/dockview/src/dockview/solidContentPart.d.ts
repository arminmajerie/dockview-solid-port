import { SolidPortalStore } from '../solid';
import { DockviewEvent, PanelUpdateEvent, IContentRenderer, GroupPanelPartInitParameters, IDockviewPanelProps } from 'dockview-core';
import { JSX } from 'solid-js';
export declare class SolidPanelContentPart implements IContentRenderer {
    readonly id: string;
    private readonly component;
    private readonly solidPortalStore;
    private readonly _element;
    private part?;
    private readonly _onDidFocus;
    readonly onDidFocus: DockviewEvent<void>;
    private readonly _onDidBlur;
    readonly onDidBlur: DockviewEvent<void>;
    get element(): HTMLElement;
    constructor(id: string, component: (props: IDockviewPanelProps) => JSX.Element, solidPortalStore: SolidPortalStore);
    focus(): void;
    init(parameters: GroupPanelPartInitParameters): void;
    update(event: PanelUpdateEvent): void;
    layout(_width: number, _height: number): void;
    dispose(): void;
}
