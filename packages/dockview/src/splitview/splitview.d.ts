import { SplitviewApi, SplitviewPanelApi, SplitviewOptions } from "dockview-core";
import { PanelParameters } from "../types";
export interface SplitviewReadyEvent {
    api: SplitviewApi;
}
export interface ISplitviewPanelProps<T extends {
    [index: string]: any;
} = any> extends PanelParameters<T> {
    api: SplitviewPanelApi;
    containerApi: SplitviewApi;
}
export interface ISplitviewSolidProps extends SplitviewOptions {
    onReady: (event: SplitviewReadyEvent) => void;
    components: Record<string, (props: ISplitviewPanelProps) => any>;
}
export declare function SplitviewSolid(props: ISplitviewSolidProps): import("solid-js").JSX.Element;
