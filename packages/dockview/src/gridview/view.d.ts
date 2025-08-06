import { GridviewPanel, IFrameworkPart } from 'dockview-core';
import { SolidPortalStore } from '../solid';
import { IGridviewPanelProps } from './gridview';
import { JSX } from 'solid-js';
export declare class SolidGridPanelView extends GridviewPanel {
    private readonly solidComponent;
    private readonly solidPortalStore;
    constructor(id: string, component: string, solidComponent: (props: IGridviewPanelProps) => JSX.Element, solidPortalStore: SolidPortalStore);
    getComponent(): IFrameworkPart;
}
