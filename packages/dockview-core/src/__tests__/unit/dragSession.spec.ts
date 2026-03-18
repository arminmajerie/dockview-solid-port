import {
    DockviewDragSessionStore,
    EMPTY_DOCKVIEW_DRAG_SESSION,
} from '../../dnd/dragSession';

describe('DockviewDragSessionStore', () => {
    it('manages the drag session lifecycle from pending to reset', () => {
        const store = new DockviewDragSessionStore();

        expect(store.value).toEqual(EMPTY_DOCKVIEW_DRAG_SESSION);

        const pending = store.createPending({
            backend: 'touch',
            item: {
                itemType: 'tab',
                sourceGroupId: 'group-a',
                sourcePanelId: 'panel-a',
                sourceComponentId: 'view-a',
                viewId: 'view-a',
                label: 'Alpha',
            },
            coordinates: { clientX: 12, clientY: 18 },
        });

        expect(pending.state).toBe('pending');
        expect(pending.coordinates).toEqual({ clientX: 12, clientY: 18 });

        const dragging = store.startDragging({
            backend: 'touch',
            item: pending.item!,
            coordinates: { clientX: 20, clientY: 30 },
        });

        expect(dragging.state).toBe('dragging');
        expect(dragging.sessionId).toBe(pending.sessionId);

        const updated = store.setActiveDropTarget(
            {
                id: 'target-1',
                kind: 'content',
                groupId: 'group-b',
            },
            'center',
            { clientX: 40, clientY: 50 }
        );

        expect(updated.activeDropTarget?.id).toBe('target-1');
        expect(updated.activeDropZone).toBe('center');

        const cancelled = store.markCancelled({
            coordinates: { clientX: 44, clientY: 55 },
        });

        expect(cancelled.state).toBe('cancelled');
        expect(cancelled.activeDropTarget).toBeUndefined();

        expect(store.reset()).toEqual(EMPTY_DOCKVIEW_DRAG_SESSION);
    });

    it('marks a successful drop and clears state after reset', () => {
        const store = new DockviewDragSessionStore();

        store.startDragging({
            backend: 'desktop',
            item: {
                itemType: 'group',
                sourceGroupId: 'group-a',
                sourcePanelId: null,
                sourceComponentId: 'view-a',
                viewId: 'view-a',
                label: 'Group',
            },
            coordinates: { clientX: 10, clientY: 10 },
        });

        const dropped = store.markDropped({
            activeDropTarget: {
                id: 'target-2',
                kind: 'header_space',
                groupId: 'group-b',
            },
            activeDropZone: 'center',
            coordinates: { clientX: 88, clientY: 99 },
        });

        expect(dropped.state).toBe('dropped');
        expect(dropped.activeDropTarget?.groupId).toBe('group-b');
        expect(dropped.activeDropZone).toBe('center');

        store.clearActiveDropTarget('target-2');
        expect(store.value.activeDropTarget).toBeUndefined();

        store.reset();
        expect(store.value.state).toBe('idle');
    });
});
