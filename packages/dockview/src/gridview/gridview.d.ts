import { GridviewPanelApi, GridviewApi, GridviewOptions } from 'dockview-core';
import { PanelParameters } from '../types';
import { JSX } from 'solid-js';
export interface GridviewReadyEvent {
    api: GridviewApi;
}
export interface IGridviewPanelProps<T extends {
    [index: string]: any;
} = any> extends PanelParameters<T> {
    api: GridviewPanelApi;
    containerApi: GridviewApi;
}
export interface IGridviewSolidProps extends GridviewOptions {
    onReady: (event: GridviewReadyEvent) => void;
    components: Record<string, (props: IGridviewPanelProps) => JSX.Element>;
}
export declare function GridviewSolid(props: IGridviewSolidProps): JSX.Element;
