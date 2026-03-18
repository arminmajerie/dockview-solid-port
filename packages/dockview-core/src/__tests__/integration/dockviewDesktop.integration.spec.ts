import { createDockviewScenario, createDragEvent, MockDataTransfer } from '../__test_utils__/dockviewHarness';

describe('dockview desktop drag integration', () => {
    it('reorders tabs within the same group through the shared drag session', () => {
        const scenario = createDockviewScenario('desktop');
        const dataTransfer = new MockDataTransfer();

        const alphaTab = scenario.getTab('alpha');
        const betaTab = scenario.getTab('beta');

        betaTab.dispatchEvent(
            createDragEvent('dragstart', {
                clientX: 180,
                clientY: 20,
                dataTransfer,
            })
        );

        alphaTab.dispatchEvent(
            createDragEvent('dragover', {
                clientX: 10,
                clientY: 20,
                dataTransfer,
            })
        );

        expect(
            scenario.container.querySelector('[data-testid="dockview-drop-overlay"]')
        ).not.toBeNull();

        alphaTab.dispatchEvent(
            createDragEvent('drop', {
                clientX: 10,
                clientY: 20,
                dataTransfer,
            })
        );

        betaTab.dispatchEvent(
            createDragEvent('dragend', {
                clientX: 10,
                clientY: 20,
                dataTransfer,
            })
        );

        expect(scenario.api.groups[0].panels.map((panel) => panel.id)).toEqual([
            'beta',
            'alpha',
        ]);
        expect(
            scenario.container.querySelector('[data-testid="dockview-drop-overlay"]')
        ).toBeNull();
        expect(scenario.root.dataset.dragState).toBe('idle');

        scenario.dispose();
    });

    it('moves a tab into another group and keeps overlay cleanup intact', () => {
        const scenario = createDockviewScenario('desktop');
        const dataTransfer = new MockDataTransfer();

        const betaTab = scenario.getTab('beta');
        const gammaGroup = scenario.api.getPanel('gamma')!.group;
        const gammaContent = scenario.getContent(gammaGroup.id);

        betaTab.dispatchEvent(
            createDragEvent('dragstart', {
                clientX: 180,
                clientY: 20,
                dataTransfer,
            })
        );

        gammaContent.dispatchEvent(
            createDragEvent('dragover', {
                clientX: 700,
                clientY: 260,
                dataTransfer,
            })
        );

        const overlay = scenario.container.querySelector(
            '[data-testid="dockview-drop-overlay"]'
        ) as HTMLElement | null;

        expect(overlay).not.toBeNull();
        expect(overlay?.dataset.dropZone).toBe('center');

        gammaContent.dispatchEvent(
            createDragEvent('drop', {
                clientX: 700,
                clientY: 260,
                dataTransfer,
            })
        );

        betaTab.dispatchEvent(
            createDragEvent('dragend', {
                clientX: 700,
                clientY: 260,
                dataTransfer,
            })
        );

        expect(
            scenario.api.getPanel('gamma')!.group.panels.map((panel) => panel.id)
        ).toEqual(['gamma', 'beta']);
        expect(
            scenario.api.getPanel('alpha')!.group.panels.map((panel) => panel.id)
        ).toEqual(['alpha']);
        expect(
            scenario.container.querySelector('[data-testid="dockview-drop-overlay"]')
        ).toBeNull();
        expect(scenario.root.dataset.dragState).toBe('idle');

        scenario.dispose();
    });
});
