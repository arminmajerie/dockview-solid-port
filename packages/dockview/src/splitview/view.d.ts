import { SplitviewPanel } from 'dockview-core';
import { SolidPart, SolidPortalStore } from '../solid';
import { ISplitviewPanelProps } from './splitview';
import { JSX } from 'solid-js';
export declare class SolidPanelView extends SplitviewPanel {
    private readonly solidComponent;
    private readonly solidPortalStore;
    constructor(id: string, component: string, solidComponent: (props: ISplitviewPanelProps) => JSX.Element, solidPortalStore: SolidPortalStore);
    getComponent(): SolidPart<ISplitviewPanelProps>;
}
