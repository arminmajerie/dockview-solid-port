export {
    getPaneData,
    getPanelData,
    getPanelDataWithNativeFallback,
    hasPanelData,
    hasNativePanelData,
    isCrossWindowDrag,
    getNativePanelData,
    getNativePaneData,
    setNativePanelData,
    setNativePaneData,
    DOCKVIEW_PANEL_MIME_TYPE,
    DOCKVIEW_PANE_MIME_TYPE,
    PaneTransfer,
    PanelTransfer,
    beginPaneTransfer,
    beginPanelTransfer,
} from './dnd/dataTransfer';
export * from './dnd/dragSession';
export * from './dockview/dockviewEnvironment';

/**
 * Events, Emitters and Disposables are very common concepts that many codebases will contain, however we need
 * to export them for dockview framework packages to use.
 * To be a good citizen these are exported with a `Dockview` prefix to prevent accidental use by others.
 */
export { Emitter as DockviewEmitter } from './events';
export type { Event as DockviewEvent } from './events';
export type { IDisposable as DockviewIDisposable } from './lifecycle';
export {
    MutableDisposable as DockviewMutableDisposable,
    CompositeDisposable as DockviewCompositeDisposable,
    Disposable as DockviewDisposable,
} from './lifecycle';

export * from './panel/types';

export * from './splitview/splitview';
export type {
    SplitviewComponentOptions,
    PanelViewInitParameters,
    SplitviewOptions,
    SplitviewFrameworkOptions,
} from './splitview/options';
export { PROPERTY_KEYS_SPLITVIEW } from './splitview/options';

export * from './paneview/paneview';
export * from './gridview/gridview';
export type {
    GridviewComponentOptions,
    GridviewOptions,
    GridviewFrameworkOptions,
} from './gridview/options';
export { PROPERTY_KEYS_GRIDVIEW } from './gridview/options';
export * from './gridview/baseComponentGridview';

export { DraggablePaneviewPanel } from './paneview/draggablePaneviewPanel';
export type { PaneviewDidDropEvent as PaneviewDropEvent } from './paneview/draggablePaneviewPanel';

export * from './dockview/components/panel/content';
export * from './dockview/components/tab/tab';
export * from './dockview/dockviewGroupPanelModel';
export type {
    TabDragEvent,
    GroupDragEvent,
} from './dockview/components/titlebar/tabsContainer';
export type { TabContextMenuEvent } from './dockview/components/titlebar/tabs';
export * from './dockview/types';
export * from './dockview/dockviewGroupPanel';
export type {
    IGroupPanelBaseProps,
    IDockviewPanelHeaderProps,
    IDockviewPanelProps,
    IDockviewHeaderActionsProps,
    IGroupHeaderProps,
    IWatermarkPanelProps,
    DockviewReadyEvent,
} from './dockview/framework';

export * from './dockview/options';
export * from './dockview/theme';
export * from './dockview/dockviewPanel';
export { DefaultTab } from './dockview/components/tab/defaultTab';
export { DefaultDockviewDeserialzier } from './dockview/deserializer';
export type { IPanelDeserializer } from './dockview/deserializer';

export * from './dockview/dockviewComponent';
export * from './gridview/gridviewComponent';
export * from './splitview/splitviewComponent';
export * from './paneview/paneviewComponent';
export type {
    PaneviewComponentOptions,
    PaneviewOptions,
    PaneviewFrameworkOptions,
    PaneviewDndOverlayEvent,
} from './paneview/options';
export { PROPERTY_KEYS_PANEVIEW, PaneviewUnhandledDragOverEvent } from './paneview/options';

export * from './gridview/gridviewPanel';
export { SplitviewPanel } from './splitview/splitviewPanel';
export type { ISplitviewPanel } from './splitview/splitviewPanel';
export * from './paneview/paneviewPanel';
export * from './dockview/types';

export type { DockviewPanelRenderer } from './overlay/overlayRenderContainer';

export type {
    Position,
    MeasuredValue,
    DroptargetOverlayModel,
} from './dnd/droptarget';
export { positionToDirection, directionToPosition } from './dnd/droptarget';

export type {
    FocusEvent,
    PanelDimensionChangeEvent,
    VisibilityEvent,
    ActiveEvent,
    PanelApi,
} from './api/panelApi';
export type {
    SizeEvent,
    GridviewPanelApi,
    GridConstraintChangeEvent,
} from './api/gridviewPanelApi';
export type {
    TitleEvent,
    RendererChangedEvent,
    DockviewPanelApi,
    DockviewPanelMoveParams,
} from './api/dockviewPanelApi';
export type {
    PanelSizeEvent,
    PanelConstraintChangeEvent,
    SplitviewPanelApi,
} from './api/splitviewPanelApi';
export type { ExpansionEvent, PaneviewPanelApi } from './api/paneviewPanelApi';
export type {
    DockviewGroupPanelApi,
    DockviewGroupPanelFloatingChangeEvent,
    DockviewGroupMoveParams,
} from './api/dockviewGroupPanelApi';
export type { CommonApi } from './api/component.api';
export {
    SplitviewApi,
    PaneviewApi,
    GridviewApi,
    DockviewApi,
} from './api/component.api';
export {
    createDockview,
    createGridview,
    createPaneview,
    createSplitview,
} from './api/entryPoints';

// External detach support
export * from './dockview/externalDetach';
