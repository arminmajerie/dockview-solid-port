import { addTestId, toggleClass } from '../dom';
import { DockviewEvent, Emitter, Event } from '../events';
import { CompositeDisposable } from '../lifecycle';
import { DragAndDropObserver } from './dnd';
import { clamp } from '../math';
import { Direction } from '../gridview/baseComponentGridview';
import {
    DockviewDragInteraction,
    DockviewDropTargetDescriptor,
    DockviewDropZone,
    DockviewDragSessionStore,
    DockviewNativeDragEvent,
    getDragCoordinates,
    toDockviewDragInteraction,
} from './dragSession';

interface DropTargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

function setGPUOptimizedBounds(element: HTMLElement, bounds: DropTargetRect): void {
    const { top, left, width, height } = bounds;
    const topPx = `${Math.round(top)}px`;
    const leftPx = `${Math.round(left)}px`;
    const widthPx = `${Math.round(width)}px`;
    const heightPx = `${Math.round(height)}px`;

    element.style.top = topPx;
    element.style.left = leftPx;
    element.style.width = widthPx;
    element.style.height = heightPx;
    element.style.visibility = 'visible';

    if (!element.style.transform || element.style.transform === '') {
        element.style.transform = 'translate3d(0, 0, 0)';
    }
}

function setGPUOptimizedBoundsFromStrings(
    element: HTMLElement,
    bounds: {
        top: string;
        left: string;
        width: string;
        height: string;
    }
): void {
    const { top, left, width, height } = bounds;

    element.style.top = top;
    element.style.left = left;
    element.style.width = width;
    element.style.height = height;
    element.style.visibility = 'visible';

    if (!element.style.transform || element.style.transform === '') {
        element.style.transform = 'translate3d(0, 0, 0)';
    }
}

function checkBoundsChanged(element: HTMLElement, bounds: DropTargetRect): boolean {
    const { top, left, width, height } = bounds;
    const topPx = `${Math.round(top)}px`;
    const leftPx = `${Math.round(left)}px`;
    const widthPx = `${Math.round(width)}px`;
    const heightPx = `${Math.round(height)}px`;

    return (
        element.style.top !== topPx ||
        element.style.left !== leftPx ||
        element.style.width !== widthPx ||
        element.style.height !== heightPx
    );
}

export interface DroptargetEvent {
    readonly position: Position;
    readonly nativeEvent: DockviewNativeDragEvent;
    readonly descriptor: DockviewDropTargetDescriptor;
}

export class WillShowOverlayEvent
    extends DockviewEvent
    implements DroptargetEvent
{
    get nativeEvent(): DockviewNativeDragEvent {
        return this.options.nativeEvent;
    }

    get position(): Position {
        return this.options.position;
    }

    get descriptor(): DockviewDropTargetDescriptor {
        return this.options.descriptor;
    }

    constructor(
        private readonly options: {
            nativeEvent: DockviewNativeDragEvent;
            position: Position;
            descriptor: DockviewDropTargetDescriptor;
        }
    ) {
        super();
    }
}

export function directionToPosition(direction: Direction): Position {
    switch (direction) {
        case 'above':
            return 'top';
        case 'below':
            return 'bottom';
        case 'left':
            return 'left';
        case 'right':
            return 'right';
        case 'within':
            return 'center';
        default:
            throw new Error(`invalid direction '${direction}'`);
    }
}

export function positionToDirection(position: Position): Direction {
    switch (position) {
        case 'top':
            return 'above';
        case 'bottom':
            return 'below';
        case 'left':
            return 'left';
        case 'right':
            return 'right';
        case 'center':
            return 'within';
        default:
            throw new Error(`invalid position '${position}'`);
    }
}

export type Position = DockviewDropZone;

export type CanDisplayOverlay = (
    dragEvent: DockviewDragInteraction,
    state: Position
) => boolean;

export type MeasuredValue = { value: number; type: 'pixels' | 'percentage' };

export type DroptargetOverlayModel = {
    size?: MeasuredValue;
    activationSize?: MeasuredValue;
};

const DEFAULT_ACTIVATION_SIZE: MeasuredValue = {
    value: 20,
    type: 'percentage',
};

const DEFAULT_SIZE: MeasuredValue = {
    value: 50,
    type: 'percentage',
};

const SMALL_WIDTH_BOUNDARY = 100;
const SMALL_HEIGHT_BOUNDARY = 100;

export interface DropTargetTargetModel {
    getElements(
        event?: DockviewDragInteraction,
        outline?: HTMLElement
    ): {
        root: HTMLElement;
        overlay: HTMLElement;
        changed: boolean;
    };
    exists(): boolean;
    clear(): void;
}

export interface DroptargetOptions {
    canDisplayOverlay: CanDisplayOverlay;
    acceptedTargetZones: Position[];
    overlayModel?: DroptargetOverlayModel;
    getOverrideTarget?: () => DropTargetTargetModel | undefined;
    className?: string;
    getOverlayOutline?: () => HTMLElement | null;
    targetDescriptor?: Omit<DockviewDropTargetDescriptor, 'id'>;
    dragSessionStore?: DockviewDragSessionStore;
}

let dropTargetCounter = 0;

export class Droptarget extends CompositeDisposable {
    private static readonly REGISTRY = new WeakMap<HTMLElement, Droptarget>();
    private static readonly USED_EVENT_ID = '__dockview_droptarget_event_is_used__';
    private static ACTUAL_TARGET: Droptarget | undefined;

    private targetElement: HTMLElement | undefined;
    private overlayElement: HTMLElement | undefined;
    private _state: Position | undefined;
    private _acceptedTargetZonesSet: Set<Position>;
    private readonly descriptorValue: DockviewDropTargetDescriptor;

    private readonly _onDrop = new Emitter<DroptargetEvent>();
    readonly onDrop: Event<DroptargetEvent> = this._onDrop.event;

    private readonly _onWillShowOverlay = new Emitter<WillShowOverlayEvent>();
    readonly onWillShowOverlay: Event<WillShowOverlayEvent> =
        this._onWillShowOverlay.event;

    readonly dnd: DragAndDropObserver;

    private _disabled: boolean;

    get disabled(): boolean {
        return this._disabled;
    }

    set disabled(value: boolean) {
        this._disabled = value;
    }

    get state(): Position | undefined {
        return this._state;
    }

    get element(): HTMLElement {
        return this.elementRef;
    }

    get descriptor(): DockviewDropTargetDescriptor {
        return this.descriptorValue;
    }

    constructor(
        private readonly elementRef: HTMLElement,
        private readonly options: DroptargetOptions
    ) {
        super();

        this._disabled = false;
        this._acceptedTargetZonesSet = new Set(this.options.acceptedTargetZones);
        this.descriptorValue = {
            id: `dockview-drop-target-${dropTargetCounter++}`,
            kind: this.options.targetDescriptor?.kind ?? 'generic',
            groupId: this.options.targetDescriptor?.groupId,
            panelId: this.options.targetDescriptor?.panelId,
        };

        Droptarget.REGISTRY.set(this.elementRef, this);

        this.dnd = new DragAndDropObserver(this.elementRef, {
            onDragEnter: () => {
                this.options.getOverrideTarget?.()?.getElements();
            },
            onDragOver: (e) => {
                const interaction = toDockviewDragInteraction({
                    nativeEvent: e,
                    currentTarget: this.elementRef,
                    backend: 'desktop',
                    session:
                        this.options.dragSessionStore?.value ?? {
                            sessionId: null,
                            backend: null,
                            state: 'idle',
                        },
                });

                this.handleExternalDragOver(interaction);
            },
            onDragLeave: () => {
                this.removeDropTarget();
            },
            onDragEnd: (e) => {
                const target = this.options.getOverrideTarget?.();

                if (target && Droptarget.ACTUAL_TARGET === this && this._state) {
                    const interaction = toDockviewDragInteraction({
                        nativeEvent: e,
                        currentTarget: this.elementRef,
                        backend: 'desktop',
                        session:
                            this.options.dragSessionStore?.value ?? {
                                sessionId: null,
                                backend: null,
                                state: 'idle',
                            },
                    });

                    this.handleExternalDrop(interaction);
                    return;
                }

                this.removeDropTarget();
                target?.clear();
            },
            onDrop: (e) => {
                const interaction = toDockviewDragInteraction({
                    nativeEvent: e,
                    currentTarget: this.elementRef,
                    backend: 'desktop',
                    session:
                        this.options.dragSessionStore?.value ?? {
                            sessionId: null,
                            backend: null,
                            state: 'idle',
                        },
                });

                this.handleExternalDrop(interaction);
            },
        });

        this.addDisposables(this._onDrop, this._onWillShowOverlay, this.dnd);
    }

    static getActiveTarget(): Droptarget | undefined {
        return Droptarget.ACTUAL_TARGET;
    }

    static clearActiveTarget(): void {
        Droptarget.ACTUAL_TARGET?.removeDropTarget();
    }

    static findTargetsAtPoint(
        clientX: number,
        clientY: number,
        root?: HTMLElement
    ): Droptarget[] {
        const ownerDocument = root?.ownerDocument ?? document;

        if (typeof ownerDocument.elementFromPoint !== 'function') {
            return [];
        }

        const hitElement = ownerDocument.elementFromPoint(clientX, clientY);

        if (!(hitElement instanceof HTMLElement)) {
            return [];
        }

        const targets: Droptarget[] = [];
        let current: HTMLElement | null = hitElement;

        while (current) {
            const target = Droptarget.REGISTRY.get(current);

            if (target) {
                targets.push(target);
            }

            if (root && current === root) {
                break;
            }

            current = current.parentElement;
        }

        return targets.reverse();
    }

    setTargetZones(acceptedTargetZones: Position[]): void {
        this._acceptedTargetZonesSet = new Set(acceptedTargetZones);
    }

    setOverlayModel(model: DroptargetOverlayModel): void {
        this.options.overlayModel = model;
    }

    handleExternalDragOver(input: DockviewDragInteraction): boolean {
        return this.renderDropTarget(input) !== null;
    }

    handleExternalDrop(input: DockviewDragInteraction): boolean {
        input.preventDefault();

        const state = this._state;

        this.removeDropTarget();
        this.options.getOverrideTarget?.()?.clear();

        if (!state) {
            return false;
        }

        input.stopPropagation();

        this.options.dragSessionStore?.markDropped({
            coordinates: getDragCoordinates(input.nativeEvent),
            nativeEvent: input.nativeEvent,
            activeDropTarget: this.descriptorValue,
            activeDropZone: state,
        });

        this._onDrop.fire({
            position: state,
            nativeEvent: input.nativeEvent,
            descriptor: this.descriptorValue,
        });

        if (input.backend === 'desktop') {
            this.options.dragSessionStore?.reset();
        }

        return true;
    }

    dispose(): void {
        this.removeDropTarget();
        Droptarget.REGISTRY.delete(this.elementRef);
        super.dispose();
    }

    private markAsUsed(event: DockviewDragInteraction): void {
        (event as unknown as Record<string, unknown>)[Droptarget.USED_EVENT_ID] =
            true;
    }

    private isAlreadyUsed(event: DockviewDragInteraction): boolean {
        const value = (
            event as unknown as Record<string, unknown>
        )[Droptarget.USED_EVENT_ID];
        return typeof value === 'boolean' && value;
    }

    private renderDropTarget(input: DockviewDragInteraction): Position | null {
        if (this.disabled) {
            this.removeDropTarget();
            return null;
        }

        const overrideTarget = this.options.getOverrideTarget?.();

        if (this._acceptedTargetZonesSet.size === 0) {
            this.removeDropTarget();
            return null;
        }

        const target = this.options.getOverlayOutline?.() ?? this.elementRef;
        const width = target.offsetWidth;
        const height = target.offsetHeight;

        if (width === 0 || height === 0) {
            this.removeDropTarget();
            return null;
        }

        const rect = this.elementRef.getBoundingClientRect();
        const x = input.clientX - rect.left;
        const y = input.clientY - rect.top;

        const quadrant = this.calculateQuadrant(
            this._acceptedTargetZonesSet,
            x,
            y,
            width,
            height
        );

        if (this.isAlreadyUsed(input) || quadrant === null) {
            this.removeDropTarget();
            return null;
        }

        if (!this.options.canDisplayOverlay(input, quadrant)) {
            this.removeDropTarget();
            overrideTarget?.clear();
            return null;
        }

        const willShowOverlayEvent = new WillShowOverlayEvent({
            nativeEvent: input.nativeEvent,
            position: quadrant,
            descriptor: this.descriptorValue,
        });

        this._onWillShowOverlay.fire(willShowOverlayEvent);

        if (willShowOverlayEvent.defaultPrevented) {
            this.removeDropTarget();
            overrideTarget?.clear();
            return null;
        }

        this.markAsUsed(input);

        if (Droptarget.ACTUAL_TARGET && Droptarget.ACTUAL_TARGET !== this) {
            Droptarget.ACTUAL_TARGET.removeDropTarget();
        }

        Droptarget.ACTUAL_TARGET = this;

        if (!overrideTarget && !this.targetElement) {
            this.targetElement = document.createElement('div');
            this.targetElement.className = 'dv-drop-target-dropzone';
            this.overlayElement = document.createElement('div');
            this.overlayElement.className = 'dv-drop-target-selection';
            addTestId(this.overlayElement, 'dockview-drop-overlay');
            this.targetElement.appendChild(this.overlayElement);
            target.classList.add('dv-drop-target');
            target.append(this.targetElement);
        }

        this.toggleClasses(quadrant, width, height);
        this._state = quadrant;

        this.options.dragSessionStore?.setActiveDropTarget(
            this.descriptorValue,
            quadrant,
            {
                clientX: input.clientX,
                clientY: input.clientY,
            },
            input.nativeEvent
        );

        return quadrant;
    }

    private toggleClasses(
        quadrant: Position,
        width: number,
        height: number
    ): void {
        const target = this.options.getOverrideTarget?.();

        if (!target && !this.overlayElement) {
            return;
        }

        const isSmallX = width < SMALL_WIDTH_BOUNDARY;
        const isSmallY = height < SMALL_HEIGHT_BOUNDARY;

        const isLeft = quadrant === 'left';
        const isRight = quadrant === 'right';
        const isTop = quadrant === 'top';
        const isBottom = quadrant === 'bottom';

        const rightClass = !isSmallX && isRight;
        const leftClass = !isSmallX && isLeft;
        const topClass = !isSmallY && isTop;
        const bottomClass = !isSmallY && isBottom;

        let size = 1;
        const sizeOptions = this.options.overlayModel?.size ?? DEFAULT_SIZE;

        if (sizeOptions.type === 'percentage') {
            size = clamp(sizeOptions.value, 0, 100) / 100;
        } else {
            if (rightClass || leftClass) {
                size = clamp(0, sizeOptions.value, width) / width;
            }
            if (topClass || bottomClass) {
                size = clamp(0, sizeOptions.value, height) / height;
            }
        }

        if (target) {
            const outlineEl =
                this.options.getOverlayOutline?.() ?? this.elementRef;
            const elBox = outlineEl.getBoundingClientRect();
            const ta = target.getElements(undefined, outlineEl);
            const el = ta.root;
            const overlay = ta.overlay;
            const bigbox = el.getBoundingClientRect();

            const rootTop = elBox.top - bigbox.top;
            const rootLeft = elBox.left - bigbox.left;

            const box = {
                top: rootTop,
                left: rootLeft,
                width,
                height,
            };

            if (rightClass) {
                box.left = rootLeft + width * (1 - size);
                box.width = width * size;
            } else if (leftClass) {
                box.width = width * size;
            } else if (topClass) {
                box.height = height * size;
            } else if (bottomClass) {
                box.top = rootTop + height * (1 - size);
                box.height = height * size;
            }

            if (isSmallX && isLeft) {
                box.width = 4;
            }

            if (isSmallX && isRight) {
                box.left = rootLeft + width - 4;
                box.width = 4;
            }

            if (!checkBoundsChanged(overlay, box)) {
                this.applyOverlayMetadata(overlay, quadrant);
                return;
            }

            setGPUOptimizedBounds(overlay, box);

            overlay.className = `dv-drop-target-anchor${
                this.options.className ? ` ${this.options.className}` : ''
            }`;

            this.applyOverlayClasses(overlay, quadrant, isSmallX, isSmallY);

            if (ta.changed) {
                toggleClass(
                    overlay,
                    'dv-drop-target-anchor-container-changed',
                    true
                );
                setTimeout(() => {
                    toggleClass(
                        overlay,
                        'dv-drop-target-anchor-container-changed',
                        false
                    );
                }, 10);
            }

            this.applyOverlayMetadata(overlay, quadrant);

            return;
        }

        if (!this.overlayElement) {
            return;
        }

        const box = { top: '0px', left: '0px', width: '100%', height: '100%' };

        if (rightClass) {
            box.left = `${100 * (1 - size)}%`;
            box.width = `${100 * size}%`;
        } else if (leftClass) {
            box.width = `${100 * size}%`;
        } else if (topClass) {
            box.height = `${100 * size}%`;
        } else if (bottomClass) {
            box.top = `${100 * (1 - size)}%`;
            box.height = `${100 * size}%`;
        }

        setGPUOptimizedBoundsFromStrings(this.overlayElement, box);
        this.applyOverlayClasses(this.overlayElement, quadrant, isSmallX, isSmallY);
        this.applyOverlayMetadata(this.overlayElement, quadrant);
    }

    private applyOverlayClasses(
        overlay: HTMLElement,
        quadrant: Position,
        isSmallX: boolean,
        isSmallY: boolean
    ): void {
        const isLeft = quadrant === 'left';
        const isRight = quadrant === 'right';
        const isTop = quadrant === 'top';
        const isBottom = quadrant === 'bottom';

        toggleClass(overlay, 'dv-drop-target-small-vertical', isSmallY);
        toggleClass(overlay, 'dv-drop-target-small-horizontal', isSmallX);
        toggleClass(overlay, 'dv-drop-target-left', isLeft);
        toggleClass(overlay, 'dv-drop-target-right', isRight);
        toggleClass(overlay, 'dv-drop-target-top', isTop);
        toggleClass(overlay, 'dv-drop-target-bottom', isBottom);
        toggleClass(overlay, 'dv-drop-target-center', quadrant === 'center');
    }

    private applyOverlayMetadata(
        overlay: HTMLElement,
        quadrant: Position
    ): void {
        addTestId(overlay, 'dockview-drop-overlay');
        overlay.dataset.dropZone = quadrant;
        overlay.dataset.dropTargetKind = this.descriptorValue.kind;

        if (this.descriptorValue.groupId) {
            overlay.dataset.groupId = this.descriptorValue.groupId;
        } else {
            delete overlay.dataset.groupId;
        }

        if (typeof this.descriptorValue.panelId === 'string') {
            overlay.dataset.panelId = this.descriptorValue.panelId;
        } else {
            delete overlay.dataset.panelId;
        }
    }

    private calculateQuadrant(
        overlayType: Set<Position>,
        x: number,
        y: number,
        width: number,
        height: number
    ): Position | null {
        const activationSizeOptions =
            this.options.overlayModel?.activationSize ??
            DEFAULT_ACTIVATION_SIZE;

        if (activationSizeOptions.type === 'percentage') {
            return calculateQuadrantAsPercentage(
                overlayType,
                x,
                y,
                width,
                height,
                activationSizeOptions.value
            );
        }

        return calculateQuadrantAsPixels(
            overlayType,
            x,
            y,
            width,
            height,
            activationSizeOptions.value
        );
    }

    private removeDropTarget(): void {
        const activeTarget = Droptarget.ACTUAL_TARGET === this;

        this._state = undefined;
        this.options.getOverrideTarget?.()?.clear();

        if (this.targetElement) {
            this.targetElement.parentElement?.classList.remove('dv-drop-target');
            this.targetElement.remove();
            this.targetElement = undefined;
            this.overlayElement = undefined;
        }

        if (activeTarget) {
            Droptarget.ACTUAL_TARGET = undefined;
        }

        this.options.dragSessionStore?.clearActiveDropTarget(this.descriptorValue.id);
    }
}

export function calculateQuadrantAsPercentage(
    overlayType: Set<Position>,
    x: number,
    y: number,
    width: number,
    height: number,
    threshold: number
): Position | null {
    const xp = (100 * x) / width;
    const yp = (100 * y) / height;

    if (overlayType.has('left') && xp <= threshold) {
        return 'left';
    }
    if (overlayType.has('right') && xp >= 100 - threshold) {
        return 'right';
    }
    if (overlayType.has('top') && yp <= threshold) {
        return 'top';
    }
    if (overlayType.has('bottom') && yp >= 100 - threshold) {
        return 'bottom';
    }

    if (!overlayType.has('center')) {
        return null;
    }

    return 'center';
}

export function calculateQuadrantAsPixels(
    overlayType: Set<Position>,
    x: number,
    y: number,
    width: number,
    height: number,
    threshold: number
): Position | null {
    if (overlayType.has('left') && x <= threshold) {
        return 'left';
    }
    if (overlayType.has('right') && x >= width - threshold) {
        return 'right';
    }
    if (overlayType.has('top') && y <= threshold) {
        return 'top';
    }
    if (overlayType.has('bottom') && y >= height - threshold) {
        return 'bottom';
    }

    if (!overlayType.has('center')) {
        return null;
    }

    return 'center';
}
