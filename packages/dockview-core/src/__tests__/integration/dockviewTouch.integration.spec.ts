import {
    createDockviewScenario,
    createPointerEvent,
} from '../__test_utils__/dockviewHarness';

describe('dockview touch drag integration', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps normal tap activation and starts dragging only after a long press', () => {
        const scenario = createDockviewScenario('touch');
        const alphaTab = scenario.getTab('alpha');
        const betaTab = scenario.getTab('beta');

        alphaTab.dispatchEvent(
            createPointerEvent('pointerdown', {
                clientX: 10,
                clientY: 20,
                pointerType: 'touch',
            })
        );

        alphaTab.dispatchEvent(
            createPointerEvent('pointerup', {
                clientX: 10,
                clientY: 20,
                pointerType: 'touch',
            })
        );

        expect(scenario.api.activePanel?.id).toBe('alpha');
        expect(scenario.root.dataset.dragState).toBe('idle');

        betaTab.dispatchEvent(
            createPointerEvent('pointerdown', {
                clientX: 150,
                clientY: 20,
                pointerType: 'touch',
            })
        );

        window.dispatchEvent(
            createPointerEvent('pointermove', {
                clientX: 165,
                clientY: 28,
                pointerType: 'touch',
            })
        );

        vi.advanceTimersByTime(321);

        expect(scenario.root.dataset.dragState).toBe('dragging');
        expect(
            document.querySelector('[data-testid="dockview-drag-ghost"]')
        ).not.toBeNull();

        scenario.dispose();
    });

    it('moves a tab after long press, updates the shared session, and cleans up on drop', () => {
        const scenario = createDockviewScenario('touch');
        const betaTab = scenario.getTab('beta');
        const gammaGroup = scenario.api.getPanel('gamma')!.group;
        const gammaContent = scenario.getContent(gammaGroup.id);

        betaTab.dispatchEvent(
            createPointerEvent('pointerdown', {
                clientX: 150,
                clientY: 20,
                pointerType: 'touch',
            })
        );

        vi.advanceTimersByTime(321);

        window.dispatchEvent(
            createPointerEvent('pointermove', {
                clientX: 740,
                clientY: 260,
                pointerType: 'touch',
            })
        );

        expect(scenario.root.dataset.activeDropZone).toBe('center');
        expect(
            scenario.container.querySelector('[data-testid="dockview-drop-overlay"]')
        ).not.toBeNull();

        window.dispatchEvent(
            createPointerEvent('pointerup', {
                clientX: 740,
                clientY: 260,
                pointerType: 'touch',
            })
        );

        expect(
            scenario
                .getGroup(gammaGroup.id)
                .querySelector(
                    '[data-testid="dockview-tab"][data-panel-id="beta"]'
                )
        ).not.toBeNull();
        expect(
            scenario.api.getPanel('gamma')!.group.panels.map((panel) => panel.id)
        ).toEqual(['gamma', 'beta']);
        expect(
            document.querySelector('[data-testid="dockview-drag-ghost"]')
        ).toBeNull();
        expect(
            scenario.container.querySelector('[data-testid="dockview-drop-overlay"]')
        ).toBeNull();
        expect(scenario.root.dataset.dragState).toBe('idle');

        scenario.dispose();
    });

    it('cancels cleanly on pointercancel and ignores quick swipe gestures', () => {
        const scenario = createDockviewScenario('touch');
        const betaTab = scenario.getTab('beta');

        betaTab.dispatchEvent(
            createPointerEvent('pointerdown', {
                clientX: 150,
                clientY: 20,
                pointerType: 'touch',
            })
        );

        window.dispatchEvent(
            createPointerEvent('pointermove', {
                clientX: 220,
                clientY: 24,
                pointerType: 'touch',
            })
        );

        vi.advanceTimersByTime(321);

        expect(
            document.querySelector('[data-testid="dockview-drag-ghost"]')
        ).toBeNull();
        expect(scenario.root.dataset.dragState).toBe('idle');

        betaTab.dispatchEvent(
            createPointerEvent('pointerdown', {
                clientX: 150,
                clientY: 20,
                pointerType: 'touch',
            })
        );

        vi.advanceTimersByTime(321);

        window.dispatchEvent(
            createPointerEvent('pointercancel', {
                clientX: 150,
                clientY: 20,
                pointerType: 'touch',
            })
        );

        expect(
            document.querySelector('[data-testid="dockview-drag-ghost"]')
        ).toBeNull();
        expect(
            scenario.container.querySelector('[data-testid="dockview-drop-overlay"]')
        ).toBeNull();
        expect(scenario.root.dataset.dragState).toBe('idle');
        expect(
            scenario.api.getPanel('alpha')!.group.panels.map((panel) => panel.id)
        ).toEqual(['alpha', 'beta']);

        scenario.dispose();
    });
});
