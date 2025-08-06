import { JSX, Accessor } from 'solid-js';
import { DockviewIDisposable } from 'dockview-core';
export interface SolidPanelWrapperProps {
    component: (props: Record<string, any>) => JSX.Element;
    componentProps: Record<string, any>;
    ref?: (api: SolidPanelWrapperRef) => void;
}
export interface SolidPanelWrapperRef {
    update: (props: Record<string, any>) => void;
}
export declare function SolidComponentBridge(props: SolidPanelWrapperProps): JSX.Element;
export declare const SolidPartContext: import("solid-js").Context<{}>;
export interface SolidPortalStore {
    addPortal: (disposeFn: DockviewIDisposable) => DockviewIDisposable;
}
export declare class SolidPart<P extends object = {}, C extends object = {}> {
    private readonly parent;
    private readonly portalStore;
    private readonly component;
    private readonly parameters;
    private readonly context?;
    private _initialProps;
    private componentInstance?;
    private ref?;
    private disposed;
    constructor(parent: HTMLElement, portalStore: SolidPortalStore, component: (props: P) => JSX.Element, parameters: P, context?: C | undefined);
    update(props: Record<string, any>): void;
    private createPortal;
    dispose(): void;
}
type PortalLifecycleHook = () => [
    Accessor<DockviewIDisposable[]>,
    (cleanup: DockviewIDisposable) => DockviewIDisposable
];
/**
 * A React Hook that returns an array of portals to be rendered by the user of this hook
 * and a disposable function to add a portal. Calling dispose removes this portal from the
 * portal array
 */
export declare const usePortalsLifecycle: PortalLifecycleHook;
export declare function isSolidComponent(component: any): boolean;
export {};
