/**
 * Integration tests proving that layout/resize does NOT re-render panel content.
 *
 * Bug: BasePanelView.layout() calls part.update() on every resize, which in the
 * SolidJS layer bumps a version signal and re-calls the component function,
 * recreating the entire DOM tree. This destroys scroll positions, input focus,
 * and any other transient DOM state.
 *
 * These tests catch that by tracking update() calls on the framework part.
 */
import { describe, it, expect, vi } from 'vitest';
import { SplitviewComponent } from '../../splitview/splitviewComponent';
import { SplitviewPanel } from '../../splitview/splitviewPanel';
import { Orientation } from '../../splitview/splitview';
import type { IFrameworkPart, PanelInitParameters } from '../../panel/types';

class TestPanel extends SplitviewPanel {
    public mockPart: IFrameworkPart;
    public updateCallCount = 0;

    constructor(id: string, component: string) {
        super(id, component);
        this.mockPart = {
            update: () => {
                this.updateCallCount++;
            },
            dispose: () => {},
        };
    }

    getComponent(): IFrameworkPart {
        return this.mockPart;
    }
}

function createContainer(width = 800, height = 600): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
    Object.defineProperty(el, 'offsetWidth', { value: width, configurable: true });
    Object.defineProperty(el, 'offsetHeight', { value: height, configurable: true });
    document.body.appendChild(el);
    return el;
}

describe('SplitviewComponent layout vs update', () => {
    it('layout() must NOT call part.update() — resize must not re-render panels', () => {
        const container = createContainer(800, 600);

        const component = new SplitviewComponent(container, {
            orientation: Orientation.HORIZONTAL,
            createComponent: ({ id, name }) => new TestPanel(id, name),
        });

        const panel1 = component.addPanel({
            id: 'left',
            component: 'left',
            size: 300,
            minimumSize: 100,
        }) as TestPanel;

        const panel2 = component.addPanel({
            id: 'right',
            component: 'right',
            minimumSize: 100,
        }) as TestPanel;

        // init() calls getComponent() which creates the part — that's 1 update from init
        // Reset counts after initial setup
        panel1.updateCallCount = 0;
        panel2.updateCallCount = 0;

        // Simulate multiple resizes (what happens when user drags a dockview splitter
        // or the window resizes). Each of these fires layout().
        component.layout(900, 600);
        component.layout(700, 500);
        component.layout(1000, 800);
        component.layout(400, 300);
        component.layout(800, 600);

        // The bug: each layout() call triggers part.update(), which in the Solid
        // layer recreates the entire component DOM tree, destroying scroll positions.
        // After fix: layout() should NOT call part.update() at all.
        expect(panel1.updateCallCount).toBe(0);
        expect(panel2.updateCallCount).toBe(0);

        component.dispose();
        container.remove();
    });

    it('explicit param update must still call part.update()', () => {
        const container = createContainer(800, 600);

        const component = new SplitviewComponent(container, {
            orientation: Orientation.HORIZONTAL,
            createComponent: ({ id, name }) => new TestPanel(id, name),
        });

        const panel = component.addPanel({
            id: 'panel',
            component: 'panel',
        }) as TestPanel;

        panel.updateCallCount = 0;

        // Explicit param change — this SHOULD trigger part.update()
        panel.update({ params: { foo: 'bar' } });

        expect(panel.updateCallCount).toBe(1);

        component.dispose();
        container.remove();
    });

    it('panel DOM element is stable across layout calls (same reference)', () => {
        const container = createContainer(800, 600);

        const component = new SplitviewComponent(container, {
            orientation: Orientation.HORIZONTAL,
            createComponent: ({ id, name }) => new TestPanel(id, name),
        });

        const panel = component.addPanel({
            id: 'panel',
            component: 'panel',
        }) as TestPanel;

        const elementBefore = panel.element;

        component.layout(1000, 800);
        component.layout(500, 400);

        const elementAfter = panel.element;

        // DOM element must be the same object — not recreated
        expect(elementAfter).toBe(elementBefore);

        component.dispose();
        container.remove();
    });
});
