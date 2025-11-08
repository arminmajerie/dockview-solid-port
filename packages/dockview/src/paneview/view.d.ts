// dockview-solid-port\packages\dockview\src\paneview\view.d.ts
import { PanelUpdateEvent, IPanePart, PanePanelComponentInitParameter } from 'dockview-core';
import { SolidPortalStore } from '../solid';
import { IPaneviewPanelProps } from './paneview';
import { JSX } from 'solid-js';
export declare class PanePanelSection implements IPanePart {
    readonly id: string;
    private readonly component;
    private readonly solidPortalStore;
    private readonly _element;
    private part?;
    get element(): HTMLElement;
    constructor(id: string, component: (props: IPaneviewPanelProps) => JSX.Element, solidPortalStore: SolidPortalStore);
    init(parameters: PanePanelComponentInitParameter): void;
    toJSON(): {
        id: string;
    };
    update(params: PanelUpdateEvent): void;
    dispose(): void;
}
