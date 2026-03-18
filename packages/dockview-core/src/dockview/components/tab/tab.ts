import { addDisposableListener, Emitter, Event } from '../../../events';
import { CompositeDisposable, IDisposable } from '../../../lifecycle';
import {
    beginPanelTransfer,
    getPanelData,
    hasPanelData,
    isCrossWindowDrag,
    PanelTransfer,
} from '../../../dnd/dataTransfer';
import { addTestId, toggleClass } from '../../../dom';
import { DockviewComponent } from '../../dockviewComponent';
import { ITabRenderer } from '../../types';
import { DockviewGroupPanel } from '../../dockviewGroupPanel';
import {
    DroptargetEvent,
    Droptarget,
    WillShowOverlayEvent,
} from '../../../dnd/droptarget';
import { DragHandler } from '../../../dnd/abstractDragHandler';
import { IDockviewPanel } from '../../dockviewPanel';
import { addGhostImage } from '../../../dnd/ghost';
import {
    DockviewDragItemDescriptor,
    DockviewNativeDragEvent,
} from '../../../dnd/dragSession';

class TabDragHandler extends DragHandler {
    constructor(
        element: HTMLElement,
        private readonly accessor: DockviewComponent,
        private readonly group: DockviewGroupPanel,
        private readonly panel: IDockviewPanel,
        disabled?: boolean
    ) {
        super(element, disabled);
    }

    getData(event: DragEvent): IDisposable {
        const transfer = new PanelTransfer(
            this.accessor.id,
            this.group.id,
            this.panel.id
        );

        return beginPanelTransfer(transfer, event.dataTransfer);
    }
}

export class Tab extends CompositeDisposable {
    private readonly _element: HTMLElement;
    private readonly dropTarget: Droptarget;
    private content: ITabRenderer | undefined = undefined;
    private readonly dragHandler: TabDragHandler;

    private readonly _onPointDown = new Emitter<PointerEvent>();
    readonly onPointerDown: Event<PointerEvent> = this._onPointDown.event;

    private readonly _onContextMenu = new Emitter<MouseEvent>();
    readonly onContextMenu: Event<MouseEvent> = this._onContextMenu.event;

    private readonly _onDropped = new Emitter<DroptargetEvent>();
    readonly onDrop: Event<DroptargetEvent> = this._onDropped.event;

    private readonly _onDragStart = new Emitter<DockviewNativeDragEvent>();
    readonly onDragStart = this._onDragStart.event;

    readonly onWillShowOverlay: Event<WillShowOverlayEvent>;

    get element(): HTMLElement {
        return this._element;
    }

    constructor(
        public readonly panel: IDockviewPanel,
        private readonly accessor: DockviewComponent,
        private readonly group: DockviewGroupPanel
    ) {
        super();

        this._element = document.createElement('div');
        this._element.className = 'dv-tab';
        this._element.tabIndex = 0;
        this._element.draggable = !this.accessor.options.disableDnd;
        addTestId(this._element, 'dockview-tab');
        this._element.dataset.groupId = this.group.id;
        this._element.dataset.panelId = this.panel.id;

        toggleClass(this.element, 'dv-inactive-tab', true);

        this.dragHandler = new TabDragHandler(
            this._element,
            this.accessor,
            this.group,
            this.panel,
            !!this.accessor.options.disableDnd
        );

        this.dropTarget = new Droptarget(this._element, {
            acceptedTargetZones: ['left', 'right'],
            overlayModel: { activationSize: { value: 50, type: 'percentage' } },
            dragSessionStore: this.accessor.dragSessionStore,
            targetDescriptor: {
                kind: 'tab',
                groupId: this.group.id,
                panelId: this.panel.id,
            },
            canDisplayOverlay: (event, position) => {
                if (this.group.locked) {
                    return false;
                }

                const hasData = hasPanelData(event.dataTransfer);
                const localData = getPanelData();
                const crossWindow = isCrossWindowDrag(event.dataTransfer);

                if (hasData) {
                    if (localData && this.accessor.id === localData.viewId) {
                        return true;
                    }

                    if (crossWindow) {
                        return true;
                    }
                }

                return this.group.model.canDisplayOverlay(
                    event,
                    position,
                    'tab'
                );
            },
            getOverrideTarget: () => group.model.dropTargetContainer?.model,
        });

        this.onWillShowOverlay = this.dropTarget.onWillShowOverlay;

        this.addDisposables(
            this._onPointDown,
            this._onContextMenu,
            this._onDropped,
            this._onDragStart,
            this.dragHandler.onDragStart((event) => {
                this.accessor.beginNativeDragSession(
                    this.getDragDescriptor(),
                    event
                );

                if (event.dataTransfer) {
                    const style = getComputedStyle(this.element);
                    const newNode = this.element.cloneNode(true) as HTMLElement;

                    Array.from(style).forEach((key) =>
                        newNode.style.setProperty(
                            key,
                            style.getPropertyValue(key),
                            style.getPropertyPriority(key)
                        )
                    );

                    newNode.style.position = 'absolute';

                    addGhostImage(event.dataTransfer, newNode, {
                        y: -10,
                        x: 30,
                    });
                }

                this._onDragStart.fire(event);
            }),
            this.dragHandler.onDragEnd((event) => {
                this.accessor.completeNativeDragSession(event);
            }),
            this.dragHandler,
            this.accessor.touchDragManager.registerSource({
                element: this._element,
                disabled: () => !!this.accessor.options.disableDnd,
                getDescriptor: () => this.getDragDescriptor(),
                getGhostLabel: () => this.panel.title ?? this.panel.id,
                onDragStart: (event) => {
                    this._onDragStart.fire(event);

                    return beginPanelTransfer(
                        new PanelTransfer(
                            this.accessor.id,
                            this.group.id,
                            this.panel.id
                        )
                    );
                },
                setDraggingState: (isDragging) => {
                    toggleClass(this.element, 'dv-tab-dragging', isDragging);
                },
            }),
            addDisposableListener(this._element, 'pointerdown', (event) => {
                this._onPointDown.fire(event);
            }),
            addDisposableListener(this._element, 'contextmenu', (event) => {
                this._onContextMenu.fire(event);
            }),
            this.dropTarget.onDrop((event) => {
                this._onDropped.fire(event);
            }),
            this.dropTarget
        );
    }

    setActive(isActive: boolean): void {
        toggleClass(this.element, 'dv-active-tab', isActive);
        toggleClass(this.element, 'dv-inactive-tab', !isActive);
    }

    setContent(part: ITabRenderer): void {
        if (this.content) {
            this._element.removeChild(this.content.element);
        }

        this.content = part;
        this._element.appendChild(this.content.element);
    }

    updateDragAndDropState(): void {
        this._element.draggable = !this.accessor.options.disableDnd;
        this.dragHandler.setDisabled(!!this.accessor.options.disableDnd);
    }

    private getDragDescriptor(): DockviewDragItemDescriptor {
        return {
            itemType: 'tab',
            sourceGroupId: this.group.id,
            sourcePanelId: this.panel.id,
            sourceComponentId: this.accessor.id,
            viewId: this.accessor.id,
            label: this.panel.title ?? this.panel.id,
        };
    }
}
