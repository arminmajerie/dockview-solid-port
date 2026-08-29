import {
    beginPanelTransfer,
    getPanelData,
    hasPanelData,
    isCrossWindowDrag,
    PanelTransfer,
} from '../../../dnd/dataTransfer';
import {
    Droptarget,
    DroptargetEvent,
    WillShowOverlayEvent,
} from '../../../dnd/droptarget';
import { GroupDragHandler } from '../../../dnd/groupDragHandler';
import { DockviewComponent } from '../../dockviewComponent';
import { addDisposableListener, Emitter, Event } from '../../../events';
import { CompositeDisposable } from '../../../lifecycle';
import { DockviewGroupPanel } from '../../dockviewGroupPanel';
import { DockviewGroupPanelModel } from '../../dockviewGroupPanelModel';
import { addTestId, toggleClass } from '../../../dom';
import {
    DockviewDragItemDescriptor,
    DockviewNativeDragEvent,
} from '../../../dnd/dragSession';
import {
    applyNativeHtml5Drag,
    nativeHtml5DragEnabled,
} from '../../../dnd/nativeHtml5Drag';

export class VoidContainer extends CompositeDisposable {
    private readonly _element: HTMLElement;
    private readonly dropTarget: Droptarget;
    private readonly handler: GroupDragHandler;

    private readonly _onDrop = new Emitter<DroptargetEvent>();
    readonly onDrop: Event<DroptargetEvent> = this._onDrop.event;

    private readonly _onDragStart = new Emitter<DockviewNativeDragEvent>();
    readonly onDragStart = this._onDragStart.event;

    readonly onWillShowOverlay: Event<WillShowOverlayEvent>;

    get element(): HTMLElement {
        return this._element;
    }

    constructor(
        private readonly accessor: DockviewComponent,
        private readonly group: DockviewGroupPanel
    ) {
        super();

        this._element = document.createElement('div');
        this._element.className = 'dv-void-container';
        applyNativeHtml5Drag(
            this._element,
            nativeHtml5DragEnabled(
                this.accessor.interactionMode,
                !!this.accessor.options.disableDnd
            )
        );
        addTestId(this._element, 'dockview-group-handle');
        this._element.dataset.groupId = this.group.id;

        toggleClass(
            this._element,
            'dv-draggable',
            !this.accessor.options.disableDnd
        );

        this.addDisposables(
            this._onDrop,
            this._onDragStart,
            addDisposableListener(this._element, 'pointerdown', () => {
                this.accessor.doSetGroupActive(this.group);
            })
        );

        this.handler = new GroupDragHandler(
            this._element,
            accessor,
            group,
            !nativeHtml5DragEnabled(
                this.accessor.interactionMode,
                !!this.accessor.options.disableDnd
            )
        );

        this.dropTarget = new Droptarget(this._element, {
            acceptedTargetZones: ['center'],
            dragSessionStore: this.accessor.dragSessionStore,
            targetDescriptor: {
                kind: 'header_space',
                groupId: this.group.id,
            },
            canDisplayOverlay: (event, position) => {
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

                return group.model.canDisplayOverlay(
                    event,
                    position,
                    'header_space'
                );
            },
            getOverrideTarget: () => group.model.dropTargetContainer?.model,
        });

        this.onWillShowOverlay = this.dropTarget.onWillShowOverlay;

        this.addDisposables(
            this.handler,
            this.handler.onDragStart((event) => {
                this.accessor.beginNativeDragSession(
                    this.getDragDescriptor(),
                    event
                );
                this._onDragStart.fire(event);
            }),
            this.handler.onDragEnd((event) => {
                this.accessor.completeNativeDragSession(event);
            }),
            this.accessor.touchDragManager.registerSource({
                element: this._element,
                disabled: () => !!this.accessor.options.disableDnd,
                getDescriptor: () => this.getDragDescriptor(),
                getGhostLabel: () => `Multiple Panels (${this.group.size})`,
                onDragStart: (event) => {
                    this._onDragStart.fire(event);

                    return beginPanelTransfer(
                        new PanelTransfer(this.accessor.id, this.group.id, null)
                    );
                },
            }),
            this.dropTarget.onDrop((event) => {
                this._onDrop.fire(event);
            }),
            this.dropTarget
        );
    }

    updateDragAndDropState(): void {
        const useNative = nativeHtml5DragEnabled(
            this.accessor.interactionMode,
            !!this.accessor.options.disableDnd
        );
        applyNativeHtml5Drag(this._element, useNative);
        toggleClass(
            this._element,
            'dv-draggable',
            !this.accessor.options.disableDnd
        );
        this.handler.setDisabled(!useNative);
    }

    private getDragDescriptor(): DockviewDragItemDescriptor {
        return {
            itemType: 'group',
            sourceGroupId: this.group.id,
            sourcePanelId: null,
            sourceComponentId: this.accessor.id,
            viewId: this.accessor.id,
            label: `Multiple Panels (${this.group.size})`,
        };
    }
}
