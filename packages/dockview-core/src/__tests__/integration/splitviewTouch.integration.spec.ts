import { createSplitview, Orientation, SplitviewPanel, type IFrameworkPart } from '../../index';
import { createPointerEvent, mockElementRect } from '../__test_utils__/dockviewHarness';

class TestFrameworkPart implements IFrameworkPart {
    update(): void {
        // noop
    }

    dispose(): void {
        // noop
    }
}

class TestSplitviewPanel extends SplitviewPanel {
    protected getComponent(): IFrameworkPart {
        return new TestFrameworkPart();
    }
}

describe('splitview touch resizing integration', () => {
    function createScenario() {
        const container = document.createElement('div');
        document.body.appendChild(container);

        mockElementRect(container, {
            left: 0,
            top: 0,
            width: 375,
            height: 720,
        });

        const api = createSplitview(container, {
            orientation: Orientation.VERTICAL,
            proportionalLayout: true,
            createComponent: ({ id, name }) => new TestSplitviewPanel(id, name),
        });

        api.addPanel({
            id: 'top',
            component: 'panel',
            size: 520,
        });

        api.addPanel({
            id: 'bottom',
            component: 'panel',
            size: 200,
        });

        api.layout(375, 720);

        const sash = container.querySelector('.dv-sash') as HTMLElement | null;
        if (!sash) {
            throw new Error('failed to locate splitview sash');
        }

        return {
            api,
            container,
            sash,
            dispose: () => {
                api.dispose();
                container.remove();
            },
        };
    }

    it('prevents default browser gesture handling and captures the touch pointer while dragging a sash', () => {
        const scenario = createScenario();

        try {
            const initialHeights = scenario.api.panels.map((panel) => panel.height);

            const setPointerCapture = vi.fn();
            const hasPointerCapture = vi.fn(() => true);
            const releasePointerCapture = vi.fn();

            Object.defineProperty(scenario.sash, 'setPointerCapture', {
                configurable: true,
                value: setPointerCapture,
            });
            Object.defineProperty(scenario.sash, 'hasPointerCapture', {
                configurable: true,
                value: hasPointerCapture,
            });
            Object.defineProperty(scenario.sash, 'releasePointerCapture', {
                configurable: true,
                value: releasePointerCapture,
            });

            const pointerDown = createPointerEvent('pointerdown', {
                clientX: 40,
                clientY: 520,
                pointerType: 'touch',
                pointerId: 7,
            });
            const pointerDownPreventDefault = vi.fn(pointerDown.preventDefault.bind(pointerDown));
            Object.defineProperty(pointerDown, 'preventDefault', {
                configurable: true,
                value: pointerDownPreventDefault,
            });

            scenario.sash.dispatchEvent(pointerDown);

            expect(pointerDownPreventDefault).toHaveBeenCalledTimes(1);
            expect(setPointerCapture).toHaveBeenCalledWith(7);

            const pointerMove = createPointerEvent('pointermove', {
                clientX: 40,
                clientY: 470,
                pointerType: 'touch',
                pointerId: 7,
            });
            const pointerMovePreventDefault = vi.fn(pointerMove.preventDefault.bind(pointerMove));
            Object.defineProperty(pointerMove, 'preventDefault', {
                configurable: true,
                value: pointerMovePreventDefault,
            });

            document.dispatchEvent(pointerMove);

            expect(pointerMovePreventDefault).toHaveBeenCalledTimes(1);
            expect(scenario.api.panels[0]!.height).not.toBe(initialHeights[0]);
            expect(scenario.api.panels[1]!.height).not.toBe(initialHeights[1]);

            document.dispatchEvent(
                createPointerEvent('pointerup', {
                    clientX: 40,
                    clientY: 470,
                    pointerType: 'touch',
                    pointerId: 7,
                })
            );

            expect(hasPointerCapture).toHaveBeenCalledWith(7);
            expect(releasePointerCapture).toHaveBeenCalledWith(7);
        } finally {
            scenario.dispose();
        }
    });
});
