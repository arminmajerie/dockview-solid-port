import { DockviewDragSessionStore } from '../../dnd/dragSession';
import {
    calculateQuadrantAsPercentage,
    calculateQuadrantAsPixels,
    Droptarget,
} from '../../dnd/droptarget';
import {
    createPointerEvent,
    createSyntheticInteraction,
    mockElementRect,
} from '../__test_utils__/dockviewHarness';

describe('Droptarget', () => {
    it('resolves quadrants from coordinates without native drag events', () => {
        const overlayType = new Set(['left', 'right', 'center'] as const);

        expect(
            calculateQuadrantAsPercentage(overlayType, 5, 20, 100, 40, 20)
        ).toBe('left');
        expect(
            calculateQuadrantAsPercentage(overlayType, 95, 20, 100, 40, 20)
        ).toBe('right');
        expect(
            calculateQuadrantAsPixels(overlayType, 50, 20, 100, 40, 20)
        ).toBe('center');
    });

    it('treats midpoint boundary coordinates as valid edge drops', () => {
        const horizontalOnly = new Set(['left', 'right'] as const);
        const verticalOnly = new Set(['top', 'bottom'] as const);

        expect(
            calculateQuadrantAsPercentage(
                horizontalOnly,
                50,
                10,
                100,
                20,
                50
            )
        ).toBe('left');
        expect(
            calculateQuadrantAsPixels(horizontalOnly, 50, 10, 100, 20, 50)
        ).toBe('left');
        expect(
            calculateQuadrantAsPercentage(verticalOnly, 10, 50, 20, 100, 50)
        ).toBe('top');
        expect(
            calculateQuadrantAsPixels(verticalOnly, 10, 50, 20, 100, 50)
        ).toBe('top');
    });

    it('rejects invalid targets and clears overlay state on cancel', () => {
        const sessionStore = new DockviewDragSessionStore();
        const element = document.createElement('div');
        document.body.appendChild(element);
        mockElementRect(element, {
            left: 100,
            top: 100,
            width: 200,
            height: 100,
        });

        const target = new Droptarget(element, {
            acceptedTargetZones: ['left', 'right', 'center'],
            dragSessionStore: sessionStore,
            targetDescriptor: {
                kind: 'content',
                groupId: 'group-b',
            },
            canDisplayOverlay: (_event, position) => position !== 'right',
        });

        sessionStore.startDragging({
            backend: 'touch',
            item: {
                itemType: 'tab',
                sourceGroupId: 'group-a',
                sourcePanelId: 'panel-a',
                sourceComponentId: 'view-a',
                viewId: 'view-a',
                label: 'Alpha',
            },
            coordinates: { clientX: 0, clientY: 0 },
        });

        const invalid = createSyntheticInteraction({
            nativeEvent: createPointerEvent('pointermove', {
                clientX: 290,
                clientY: 130,
            }),
            currentTarget: element,
            sessionStore,
        });

        expect(target.handleExternalDragOver(invalid)).toBe(false);
        expect(target.state).toBeUndefined();
        expect(sessionStore.value.activeDropTarget).toBeUndefined();

        const valid = createSyntheticInteraction({
            nativeEvent: createPointerEvent('pointermove', {
                clientX: 120,
                clientY: 130,
            }),
            currentTarget: element,
            sessionStore,
        });

        expect(target.handleExternalDragOver(valid)).toBe(true);
        expect(target.state).toBe('left');
        expect(sessionStore.value.activeDropZone).toBe('left');

        Droptarget.clearActiveTarget();
        expect(target.state).toBeUndefined();
        expect(sessionStore.value.activeDropTarget).toBeUndefined();

        target.dispose();
        element.remove();
    });
});
