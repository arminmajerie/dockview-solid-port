import { JSX } from 'solid-js';
import type { IDockviewPanelHeaderProps } from 'dockview-core';
export type IDockviewDefaultTabProps = IDockviewPanelHeaderProps & JSX.HTMLAttributes<HTMLDivElement> & {
    hideClose?: boolean;
    closeActionOverride?: () => void;
};
export declare function DockviewDefaultTab(props: IDockviewDefaultTabProps): JSX.Element;
