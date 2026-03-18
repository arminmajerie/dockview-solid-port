import { addTestId } from '../dom';
import { addDisposableListener } from '../events';
import {
    CompositeDisposable,
    Disposable,
    IDisposable,
    MutableDisposable,
} from '../lifecycle';
import { DockviewEnvironmentController } from '../dockview/dockviewEnvironment';
import {
    DockviewDragItemDescriptor,
    DockviewDragSessionStore,
    getDragCoordinates,
    toDockviewDragInteraction,
} from './dragSession';
import { Droptarget } from './droptarget';

const LONG_PRESS_DELAY_MS = 320;
const PENDING_CANCEL_DISTANCE_PX = 24;
const GHOST_OFFSET_X = 18;
const GHOST_OFFSET_Y = 18;

function getPointerTravelDistance(
    startX: number,
    startY: number,
    event: PointerEvent
): number {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    return Math.hypot(dx, dy);
}

interface TouchDragSourceState {
    readonly options: DockviewTouchDragSourceOptions;
    readonly pointerId: number;
    readonly cleanup: CompositeDisposable;
    readonly dragDataDisposable: MutableDisposable;
    readonly startX: number;
    readonly startY: number;
    readonly descriptor: DockviewDragItemDescriptor;
    readonly contextMenuDisposable: IDisposable;
    lastEvent: PointerEvent;
    timer: number | undefined;
    started: boolean;
    hasPointerCapture: boolean;
    ghost: TouchDragGhost | undefined;
}

export interface DockviewTouchDragSourceOptions {
    readonly element: HTMLElement;
    readonly disabled?: () => boolean;
    readonly getDescriptor: () => DockviewDragItemDescriptor;
    readonly getGhostLabel: () => string;
    readonly onDragStart: (event: PointerEvent) => IDisposable;
    readonly setDraggingState?: (isDragging: boolean) => void;
}

class TouchDragGhost {
    private readonly element: HTMLElement;

    constructor(document: Document, label: string) {
        this.element = document.createElement('div');
        this.element.className = 'dv-touch-drag-ghost';
        addTestId(this.element, 'dockview-drag-ghost');
        this.element.textContent = label;
        document.body.appendChild(this.element);
    }

    move(clientX: number, clientY: number): void {
        this.element.style.transform = `translate3d(${Math.round(
            clientX + GHOST_OFFSET_X
        )}px, ${Math.round(clientY + GHOST_OFFSET_Y)}px, 0)`;
    }

    dispose(): void {
        this.element.remove();
    }
}

export class DockviewTouchDragManager extends CompositeDisposable {
    private readonly win: Window;
    private activeSource: TouchDragSourceState | undefined;

    constructor(
        private readonly rootElement: HTMLElement,
        private readonly environment: DockviewEnvironmentController,
        private readonly dragSessionStore: DockviewDragSessionStore
    ) {
        super();

        this.win = rootElement.ownerDocument.defaultView ?? window;
    }

    registerSource(options: DockviewTouchDragSourceOptions): IDisposable {
        return addDisposableListener(
            options.element,
            'pointerdown',
            (event: PointerEvent) => {
                this.onPointerDown(event, options);
            }
        );
    }

    override dispose(): void {
        this.cleanupActiveSource();
        super.dispose();
    }

    private onPointerDown(
        event: PointerEvent,
        options: DockviewTouchDragSourceOptions
    ): void {
        if (
            options.disabled?.() ||
            this.environment.interactionMode !== 'touch' ||
            event.button !== 0 ||
            !event.isPrimary ||
            event.pointerType === 'mouse'
        ) {
            return;
        }

        this.cleanupActiveSource();

        const cleanup = new CompositeDisposable();
        const dragDataDisposable = new MutableDisposable();
        const contextMenuDisposable = addDisposableListener(
            this.win,
            'contextmenu',
            (contextEvent) => {
                if (this.activeSource?.pointerId === event.pointerId) {
                    contextEvent.preventDefault();
                }
            },
            true
        );

        const descriptor = options.getDescriptor();
        const state: TouchDragSourceState = {
            options,
            pointerId: event.pointerId,
            cleanup,
            dragDataDisposable,
            startX: event.clientX,
            startY: event.clientY,
            descriptor,
            contextMenuDisposable,
            lastEvent: event,
            timer: undefined,
            started: false,
            hasPointerCapture: false,
            ghost: undefined,
        };

        state.timer = this.win.setTimeout(() => {
            this.beginTouchDrag(state);
        }, LONG_PRESS_DELAY_MS);

        cleanup.addDisposables(
            dragDataDisposable,
            contextMenuDisposable,
            addDisposableListener(
                this.win,
                'pointermove',
                (moveEvent: PointerEvent) => {
                    this.onPointerMove(moveEvent);
                },
                { capture: true, passive: false }
            ),
            addDisposableListener(
                this.win,
                'pointerup',
                (upEvent: PointerEvent) => {
                    this.onPointerUp(upEvent);
                },
                true
            ),
            addDisposableListener(
                this.win,
                'pointercancel',
                (cancelEvent: PointerEvent) => {
                    this.onPointerCancel(cancelEvent);
                },
                true
            ),
            Disposable.from(() => {
                if (state.timer !== undefined) {
                    this.win.clearTimeout(state.timer);
                    state.timer = undefined;
                }
            })
        );

        this.activeSource = state;
        this.dragSessionStore.createPending({
            backend: 'touch',
            item: descriptor,
            coordinates: getDragCoordinates(event),
            nativeEvent: event,
        });
    }

    private onPointerMove(event: PointerEvent): void {
        const state = this.activeSource;

        if (!state || event.pointerId !== state.pointerId) {
            return;
        }

        state.lastEvent = event;

        if (!state.started) {
            const movedFarEnough =
                getPointerTravelDistance(
                    state.startX,
                    state.startY,
                    event
                ) > PENDING_CANCEL_DISTANCE_PX;

            if (movedFarEnough) {
                this.cancelTouchDrag(event, false);
            }

            return;
        }

        event.preventDefault();
        this.dragSessionStore.updateCoordinates(
            getDragCoordinates(event),
            event
        );
        state.ghost?.move(event.clientX, event.clientY);

        const candidates = Droptarget.findTargetsAtPoint(
            event.clientX,
            event.clientY,
            this.rootElement
        );

        let accepted = false;

        for (const candidate of candidates) {
            const interaction = toDockviewDragInteraction({
                nativeEvent: event,
                currentTarget: candidate.element,
                backend: 'touch',
                session: this.dragSessionStore.value,
            });

            if (candidate.handleExternalDragOver(interaction)) {
                accepted = true;
                break;
            }
        }

        if (!accepted) {
            Droptarget.clearActiveTarget();
            this.dragSessionStore.clearActiveDropTarget();
        }
    }

    private onPointerUp(event: PointerEvent): void {
        const state = this.activeSource;

        if (!state || event.pointerId !== state.pointerId) {
            return;
        }

        state.lastEvent = event;

        if (!state.started) {
            this.cancelTouchDrag(event, false);
            return;
        }

        event.preventDefault();

        const activeDropTarget = Droptarget.getActiveTarget();

        if (activeDropTarget) {
            const interaction = toDockviewDragInteraction({
                nativeEvent: event,
                currentTarget: activeDropTarget.element,
                backend: 'touch',
                session: this.dragSessionStore.value,
            });

            if (activeDropTarget.handleExternalDrop(interaction)) {
                this.cleanupActiveSource('drop');
                return;
            }
        }

        this.cancelTouchDrag(event, true);
    }

    private onPointerCancel(event: PointerEvent): void {
        const state = this.activeSource;

        if (!state || event.pointerId !== state.pointerId) {
            return;
        }

        this.cancelTouchDrag(event, true);
    }

    private beginTouchDrag(state: TouchDragSourceState): void {
        if (this.activeSource !== state || state.started) {
            return;
        }

        state.started = true;
        state.options.setDraggingState?.(true);
        state.options.element.classList.add('dv-dragged');

        state.dragDataDisposable.value = state.options.onDragStart(
            state.lastEvent
        );

        this.dragSessionStore.startDragging({
            backend: 'touch',
            item: state.descriptor,
            coordinates: getDragCoordinates(state.lastEvent),
            nativeEvent: state.lastEvent,
        });

        state.ghost = new TouchDragGhost(
            this.rootElement.ownerDocument,
            state.options.getGhostLabel()
        );
        state.ghost.move(state.lastEvent.clientX, state.lastEvent.clientY);

        try {
            state.options.element.setPointerCapture(state.pointerId);
            state.hasPointerCapture = true;
        } catch (_error) {
            state.hasPointerCapture = false;
        }

        this.onPointerMove(state.lastEvent);
    }

    private cancelTouchDrag(
        event: PointerEvent,
        markCancelled: boolean
    ): void {
        if (markCancelled || this.dragSessionStore.value.state === 'pending') {
            this.dragSessionStore.markCancelled({
                coordinates: getDragCoordinates(event),
                nativeEvent: event,
            });
        }

        this.cleanupActiveSource();
    }

    private cleanupActiveSource(reason: 'drop' | 'cancel' = 'cancel'): void {
        const state = this.activeSource;

        if (!state) {
            return;
        }

        this.activeSource = undefined;

        if (state.hasPointerCapture) {
            try {
                state.options.element.releasePointerCapture(state.pointerId);
            } catch (_error) {
                // ignored
            }
        }

        state.options.element.classList.remove('dv-dragged');
        state.options.setDraggingState?.(false);
        state.ghost?.dispose();
        state.cleanup.dispose();
        Droptarget.clearActiveTarget();
        this.dragSessionStore.clearActiveDropTarget();
        this.dragSessionStore.reset();

        if (reason === 'cancel') {
            state.dragDataDisposable.dispose();
            return;
        }

        state.dragDataDisposable.dispose();
    }
}
