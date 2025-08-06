import { DockviewWillDropEvent, DockviewDidDropEvent, IWatermarkPanelProps, IDockviewHeaderActionsProps, IDockviewPanelHeaderProps, IDockviewPanelProps, DockviewOptions, DockviewReadyEvent } from 'dockview-core';
import { JSX } from 'solid-js';
export interface IDockviewSolidProps extends DockviewOptions {
    tabComponents?: Record<string, (props: IDockviewPanelHeaderProps) => JSX.Element>;
    components: Record<string, (props: IDockviewPanelProps) => JSX.Element>;
    watermarkComponent?: (props: IWatermarkPanelProps) => JSX.Element;
    defaultTabComponent?: (props: IDockviewPanelHeaderProps) => JSX.Element;
    rightHeaderActionsComponent?: (props: IDockviewHeaderActionsProps) => JSX.Element;
    leftHeaderActionsComponent?: (props: IDockviewHeaderActionsProps) => JSX.Element;
    prefixHeaderActionsComponent?: (props: IDockviewHeaderActionsProps) => JSX.Element;
    onReady: (event: DockviewReadyEvent) => void;
    onDidDrop?: (event: DockviewDidDropEvent) => void;
    onWillDrop?: (event: DockviewWillDropEvent) => void;
}
export declare function DockviewSolid(props: IDockviewSolidProps): JSX.Element;
