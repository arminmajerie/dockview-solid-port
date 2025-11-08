// dockview-solid-port\packages\dockview\src\paneview\paneview.d.ts
import { JSX } from 'solid-js';
import { PaneviewPanelApi, PaneviewApi, PaneviewDropEvent, PaneviewOptions } from 'dockview-core';
import { PanelParameters } from '../types';
export interface PaneviewReadyEvent {
    api: PaneviewApi;
}
export interface IPaneviewPanelProps<T extends {
    [index: string]: any;
} = any> extends PanelParameters<T> {
    api: PaneviewPanelApi;
    containerApi: PaneviewApi;
    title: string;
}
export interface IPaneviewSolidProps extends PaneviewOptions {
    onReady: (event: PaneviewReadyEvent) => void;
    components: Record<string, (props: IPaneviewPanelProps) => JSX.Element>;
    headerComponents?: Record<string, (props: IPaneviewPanelProps) => JSX.Element>;
    onDidDrop?: (event: PaneviewDropEvent) => void;
}
export declare function PaneviewSolid(props: IPaneviewSolidProps): JSX.Element;
