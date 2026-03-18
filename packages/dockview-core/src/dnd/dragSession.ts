import { Emitter, Event } from '../events';

export type DockviewInteractionBackend = 'desktop' | 'touch';
export type DockviewDragLifecycleState =
    | 'idle'
    | 'pending'
    | 'dragging'
    | 'dropped'
    | 'cancelled';
export type DockviewDragItemType = 'tab' | 'group' | 'panel';
export type DockviewDropZone = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type DockviewNativeDragEvent = DragEvent | PointerEvent;

export interface DockviewDragCoordinates {
    readonly clientX: number;
    readonly clientY: number;
}

export interface DockviewDragItemDescriptor {
    readonly itemType: DockviewDragItemType;
    readonly sourceGroupId: string;
    readonly sourcePanelId: string | null;
    readonly sourceComponentId: string;
    readonly viewId: string;
    readonly label: string;
}

export interface DockviewDropTargetDescriptor {
    readonly id: string;
    readonly kind: string;
    readonly groupId?: string;
    readonly panelId?: string | null;
}

export interface DockviewDragSessionSnapshot {
    readonly sessionId: string | null;
    readonly backend: DockviewInteractionBackend | null;
    readonly state: DockviewDragLifecycleState;
    readonly item?: DockviewDragItemDescriptor;
    readonly coordinates?: DockviewDragCoordinates;
    readonly activeDropTarget?: DockviewDropTargetDescriptor;
    readonly activeDropZone?: DockviewDropZone;
    readonly lastNativeEventType?: string;
}

export interface DockviewDragInteraction {
    readonly nativeEvent: DockviewNativeDragEvent;
    readonly currentTarget: HTMLElement;
    readonly target: EventTarget | null;
    readonly backend: DockviewInteractionBackend;
    readonly session: DockviewDragSessionSnapshot;
    readonly clientX: number;
    readonly clientY: number;
    readonly dataTransfer?: DataTransfer | null;
    readonly shiftKey: boolean;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    preventDefault(): void;
    stopPropagation(): void;
}

export const EMPTY_DOCKVIEW_DRAG_SESSION: DockviewDragSessionSnapshot = {
    sessionId: null,
    backend: null,
    state: 'idle',
};

function cloneSession(
    current: DockviewDragSessionSnapshot,
    changes: Partial<DockviewDragSessionSnapshot>
): DockviewDragSessionSnapshot {
    return {
        ...current,
        ...changes,
    };
}

export function getDragCoordinates(
    event: DockviewNativeDragEvent
): DockviewDragCoordinates {
    return {
        clientX: event.clientX ?? 0,
        clientY: event.clientY ?? 0,
    };
}

export function getDataTransferFromNativeEvent(
    event: DockviewNativeDragEvent | undefined | null
): DataTransfer | undefined {
    if (!event) {
        return undefined;
    }

    if ('dataTransfer' in event) {
        return event.dataTransfer ?? undefined;
    }

    return undefined;
}

export function toDockviewDragInteraction(options: {
    nativeEvent: DockviewNativeDragEvent;
    currentTarget: HTMLElement;
    backend: DockviewInteractionBackend;
    session: DockviewDragSessionSnapshot;
}): DockviewDragInteraction {
    const { nativeEvent } = options;

    return {
        nativeEvent,
        currentTarget: options.currentTarget,
        target: nativeEvent.target,
        backend: options.backend,
        session: options.session,
        clientX: nativeEvent.clientX ?? 0,
        clientY: nativeEvent.clientY ?? 0,
        dataTransfer: getDataTransferFromNativeEvent(nativeEvent),
        shiftKey: nativeEvent.shiftKey ?? false,
        altKey: nativeEvent.altKey ?? false,
        ctrlKey: nativeEvent.ctrlKey ?? false,
        metaKey: nativeEvent.metaKey ?? false,
        preventDefault: () => nativeEvent.preventDefault(),
        stopPropagation: () => nativeEvent.stopPropagation(),
    };
}

export class DockviewDragSessionStore {
    private static nextId = 0;

    private _value: DockviewDragSessionSnapshot = EMPTY_DOCKVIEW_DRAG_SESSION;
    private readonly _onDidChange =
        new Emitter<DockviewDragSessionSnapshot>({ replay: true });

    readonly onDidChange: Event<DockviewDragSessionSnapshot> =
        this._onDidChange.event;

    get value(): DockviewDragSessionSnapshot {
        return this._value;
    }

    createPending(options: {
        backend: DockviewInteractionBackend;
        item: DockviewDragItemDescriptor;
        coordinates: DockviewDragCoordinates;
        nativeEvent?: DockviewNativeDragEvent;
    }): DockviewDragSessionSnapshot {
        return this.update({
            sessionId: `drag-session-${DockviewDragSessionStore.nextId++}`,
            backend: options.backend,
            state: 'pending',
            item: options.item,
            coordinates: options.coordinates,
            activeDropTarget: undefined,
            activeDropZone: undefined,
            lastNativeEventType: options.nativeEvent?.type,
        });
    }

    startDragging(options: {
        backend: DockviewInteractionBackend;
        item: DockviewDragItemDescriptor;
        coordinates: DockviewDragCoordinates;
        nativeEvent?: DockviewNativeDragEvent;
    }): DockviewDragSessionSnapshot {
        const sessionId =
            this._value.sessionId ??
            `drag-session-${DockviewDragSessionStore.nextId++}`;

        return this.update({
            sessionId,
            backend: options.backend,
            state: 'dragging',
            item: options.item,
            coordinates: options.coordinates,
            activeDropTarget: undefined,
            activeDropZone: undefined,
            lastNativeEventType: options.nativeEvent?.type,
        });
    }

    updateCoordinates(
        coordinates: DockviewDragCoordinates,
        nativeEvent?: DockviewNativeDragEvent
    ): DockviewDragSessionSnapshot {
        return this.update({
            coordinates,
            lastNativeEventType: nativeEvent?.type ?? this._value.lastNativeEventType,
        });
    }

    setActiveDropTarget(
        activeDropTarget: DockviewDropTargetDescriptor,
        activeDropZone: DockviewDropZone,
        coordinates?: DockviewDragCoordinates,
        nativeEvent?: DockviewNativeDragEvent
    ): DockviewDragSessionSnapshot {
        return this.update({
            state:
                this._value.state === 'idle'
                    ? 'dragging'
                    : this._value.state,
            activeDropTarget,
            activeDropZone,
            coordinates: coordinates ?? this._value.coordinates,
            lastNativeEventType: nativeEvent?.type ?? this._value.lastNativeEventType,
        });
    }

    clearActiveDropTarget(targetId?: string): DockviewDragSessionSnapshot {
        if (
            targetId &&
            this._value.activeDropTarget &&
            this._value.activeDropTarget.id !== targetId
        ) {
            return this._value;
        }

        return this.update({
            activeDropTarget: undefined,
            activeDropZone: undefined,
        });
    }

    markDropped(options: {
        coordinates?: DockviewDragCoordinates;
        nativeEvent?: DockviewNativeDragEvent;
        activeDropTarget?: DockviewDropTargetDescriptor;
        activeDropZone?: DockviewDropZone;
    }): DockviewDragSessionSnapshot {
        return this.update({
            state: 'dropped',
            coordinates: options.coordinates ?? this._value.coordinates,
            activeDropTarget:
                options.activeDropTarget ?? this._value.activeDropTarget,
            activeDropZone: options.activeDropZone ?? this._value.activeDropZone,
            lastNativeEventType: options.nativeEvent?.type ?? this._value.lastNativeEventType,
        });
    }

    markCancelled(options: {
        coordinates?: DockviewDragCoordinates;
        nativeEvent?: DockviewNativeDragEvent;
    } = {}): DockviewDragSessionSnapshot {
        return this.update({
            state: 'cancelled',
            coordinates: options.coordinates ?? this._value.coordinates,
            activeDropTarget: undefined,
            activeDropZone: undefined,
            lastNativeEventType: options.nativeEvent?.type ?? this._value.lastNativeEventType,
        });
    }

    reset(): DockviewDragSessionSnapshot {
        this._value = EMPTY_DOCKVIEW_DRAG_SESSION;
        this._onDidChange.fire(this._value);
        return this._value;
    }

    dispose(): void {
        this._onDidChange.dispose();
    }

    private update(
        changes: Partial<DockviewDragSessionSnapshot>
    ): DockviewDragSessionSnapshot {
        this._value = cloneSession(this._value, changes);
        this._onDidChange.fire(this._value);
        return this._value;
    }
}
