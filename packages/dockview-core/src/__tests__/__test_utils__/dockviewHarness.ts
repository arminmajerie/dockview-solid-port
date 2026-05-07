import {
    createDockview,
    DockviewApi,
    IContentRenderer,
    DockviewDragSessionStore,
    DockviewDragInteraction,
    DockviewDragItemDescriptor,
} from '../../index';

type InteractionProfile = 'desktop' | 'touch';

type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

const rectRegistry = new WeakMap<HTMLElement, Rect>();
const trackedElements = new Set<HTMLElement>();

export class MockDataTransfer implements DataTransfer {
    dropEffect: DataTransfer['dropEffect'] = 'move';
    effectAllowed: DataTransfer['effectAllowed'] = 'all';
    files: FileList = {
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* () {
            return;
        },
    } as FileList;
    items: DataTransferItemList = [] as unknown as DataTransferItemList;

    private readonly data = new Map<string, string>();

    get types(): ReadonlyArray<string> {
        return Array.from(this.data.keys());
    }

    clearData(format?: string): void {
        if (format) {
            this.data.delete(format);
        } else {
            this.data.clear();
        }

        this.syncItems();
    }

    getData(format: string): string {
        return this.data.get(format) ?? '';
    }

    setData(format: string, data: string): void {
        this.data.set(format, data);
        this.syncItems();
    }

    setDragImage(_image: Element, _x: number, _y: number): void {
        // noop
    }

    addElement(_element: Element): void {
        // noop
    }

    private syncItems(): void {
        const items = Array.from(this.data.keys()).map((type) => ({
            kind: 'string',
            type,
            getAsFile: () => null,
            getAsString: (callback: (data: string) => void) => {
                callback(this.data.get(type) ?? '');
            },
            webkitGetAsEntry: () => null,
        }));

        this.items = items as unknown as DataTransferItemList;
    }
}

function createMediaQueryList(matches: boolean, media: string): MediaQueryList {
    return {
        matches,
        media,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
    };
}

export function setInteractionProfile(profile: InteractionProfile): void {
    const queryMap =
        profile === 'touch'
            ? {
                  '(hover: none)': true,
                  '(hover: hover)': false,
                  '(pointer: coarse)': true,
                  '(pointer: fine)': false,
                  '(any-hover: hover)': false,
                  '(any-pointer: fine)': false,
              }
            : {
                  '(hover: none)': false,
                  '(hover: hover)': true,
                  '(pointer: coarse)': false,
                  '(pointer: fine)': true,
                  '(any-hover: hover)': true,
                  '(any-pointer: fine)': true,
              };

    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value:
            profile === 'touch'
                ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
                : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });

    Object.defineProperty(window.navigator, 'userAgentData', {
        configurable: true,
        value: {
            mobile: profile === 'touch',
        },
    });

    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string) =>
            createMediaQueryList(Boolean(queryMap[query as keyof typeof queryMap]), query),
    });
}

export function mockElementRect(element: HTMLElement, rect: Rect): void {
    rectRegistry.set(element, rect);
    trackedElements.add(element);

    Object.defineProperty(element, 'offsetWidth', {
        configurable: true,
        value: rect.width,
    });
    Object.defineProperty(element, 'offsetHeight', {
        configurable: true,
        value: rect.height,
    });
    Object.defineProperty(element, 'clientWidth', {
        configurable: true,
        value: rect.width,
    });
    Object.defineProperty(element, 'clientHeight', {
        configurable: true,
        value: rect.height,
    });
    Object.defineProperty(element, 'scrollWidth', {
        configurable: true,
        value: Math.max(rect.width, 600),
    });
    Object.defineProperty(element, 'scrollHeight', {
        configurable: true,
        value: rect.height,
    });

    element.getBoundingClientRect = vi.fn(() => ({
        x: rect.left,
        y: rect.top,
        left: rect.left,
        top: rect.top,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        width: rect.width,
        height: rect.height,
        toJSON: () => rect,
    })) as unknown as () => DOMRect;
}

export function installElementFromPointMock(
    doc: Document = document
): () => void {
    const original =
        typeof doc.elementFromPoint === 'function'
            ? doc.elementFromPoint.bind(doc)
            : (() => null);

    doc.elementFromPoint = ((x: number, y: number) => {
        const matches = Array.from(trackedElements)
            .filter((element) => {
                if (!doc.body.contains(element)) {
                    return false;
                }

                const rect = rectRegistry.get(element);

                return !!rect &&
                    x >= rect.left &&
                    x <= rect.left + rect.width &&
                    y >= rect.top &&
                    y <= rect.top + rect.height;
            })
            .sort((a, b) => getElementDepth(a) - getElementDepth(b));

        return matches[matches.length - 1] ?? null;
    }) as typeof doc.elementFromPoint;

    return () => {
        doc.elementFromPoint = original;
    };
}

export function createPointerEvent(
    type: string,
    init: PointerEventInit = {}
): PointerEvent {
    return new window.PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: init.pointerId ?? 1,
        pointerType: init.pointerType ?? 'touch',
        isPrimary: init.isPrimary ?? true,
        clientX: init.clientX ?? 0,
        clientY: init.clientY ?? 0,
        button: init.button ?? 0,
        buttons: init.buttons ?? 1,
        ...init,
    });
}

export function createDragEvent(
    type: string,
    init: MouseEventInit & { dataTransfer?: DataTransfer } = {}
): DragEvent {
    return new window.DragEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: init.clientX ?? 0,
        clientY: init.clientY ?? 0,
        button: init.button ?? 0,
        buttons: init.buttons ?? 1,
        dataTransfer: init.dataTransfer,
        ...init,
    });
}

export interface DockviewScenario {
    readonly api: DockviewApi;
    readonly container: HTMLElement;
    readonly root: HTMLElement;
    getTab(panelId: string): HTMLElement;
    getGroup(groupId: string): HTMLElement;
    getContent(groupId: string): HTMLElement;
    getHandle(groupId: string): HTMLElement;
    refreshRects(): void;
    dispose(): void;
}

export function createDockviewScenario(
    interactionMode: InteractionProfile = 'desktop'
): DockviewScenario {
    setInteractionProfile(interactionMode);

    const container = document.createElement('div');
    document.body.appendChild(container);
    mockElementRect(container, {
        left: 0,
        top: 0,
        width: 1000,
        height: 640,
    });

    const cleanupElementFromPoint = installElementFromPointMock();

    const api = createDockview(container, {
        createComponent: ({ id }): IContentRenderer => {
            const element = document.createElement('div');
            element.textContent = id;

            return {
                element,
                init: () => undefined,
                layout: () => undefined,
                update: () => undefined,
                focus: () => undefined,
                dispose: () => undefined,
            };
        },
    });

    api.addPanel({
        id: 'alpha',
        title: 'Alpha',
        component: 'content',
    });
    api.addPanel({
        id: 'beta',
        title: 'Beta',
        component: 'content',
        position: {
            referencePanel: 'alpha',
            direction: 'within',
        },
    });
    api.addPanel({
        id: 'gamma',
        title: 'Gamma',
        component: 'content',
        position: {
            referencePanel: 'alpha',
            direction: 'right',
        },
    });

    api.layout(1000, 640);

    const root = container.querySelector(
        '[data-testid="dockview-root"]'
    ) as HTMLElement;

    if (!root) {
        throw new Error('failed to locate dockview root');
    }

    const scenario: DockviewScenario = {
        api,
        container,
        root,
        getTab(panelId: string): HTMLElement {
            const element = container.querySelector(
                `[data-testid="dockview-tab"][data-panel-id="${panelId}"]`
            ) as HTMLElement | null;

            if (!element) {
                throw new Error(`failed to locate tab for panel '${panelId}'`);
            }

            return element;
        },
        getGroup(groupId: string): HTMLElement {
            const element = container.querySelector(
                `[data-testid="dockview-group"][data-group-id="${groupId}"]`
            ) as HTMLElement | null;

            if (!element) {
                throw new Error(`failed to locate group '${groupId}'`);
            }

            return element;
        },
        getContent(groupId: string): HTMLElement {
            const element = container.querySelector(
                `[data-testid="dockview-group-content"][data-group-id="${groupId}"]`
            ) as HTMLElement | null;

            if (!element) {
                throw new Error(`failed to locate content for group '${groupId}'`);
            }

            return element;
        },
        getHandle(groupId: string): HTMLElement {
            const element = container.querySelector(
                `[data-testid="dockview-group-handle"][data-group-id="${groupId}"]`
            ) as HTMLElement | null;

            if (!element) {
                throw new Error(`failed to locate handle for group '${groupId}'`);
            }

            return element;
        },
        refreshRects(): void {
            mockElementRect(root, {
                left: 0,
                top: 0,
                width: 1000,
                height: 640,
            });

            const groups = api.groups;
            const groupWidth = Math.floor(1000 / Math.max(groups.length, 1));

            groups.forEach((group, groupIndex) => {
                const left = groupIndex * groupWidth;
                const groupElement = scenario.getGroup(group.id);
                const contentElement = scenario.getContent(group.id);
                const handleElement = scenario.getHandle(group.id);

                mockElementRect(groupElement, {
                    left,
                    top: 0,
                    width: groupWidth,
                    height: 640,
                });
                mockElementRect(contentElement, {
                    left,
                    top: 44,
                    width: groupWidth,
                    height: 596,
                });
                mockElementRect(handleElement, {
                    left: left + Math.max(160, group.panels.length * 120),
                    top: 0,
                    width: Math.max(groupWidth - Math.max(160, group.panels.length * 120), 40),
                    height: 44,
                });

                group.panels.forEach((panel, panelIndex) => {
                    mockElementRect(scenario.getTab(panel.id), {
                        left: left + panelIndex * 120,
                        top: 0,
                        width: 120,
                        height: 44,
                    });
                });
            });
        },
        dispose(): void {
            cleanupElementFromPoint();
            api.dispose();
            container.remove();
        },
    };

    scenario.refreshRects();

    return scenario;
}

export function createSyntheticInteraction(options: {
    nativeEvent: DragEvent | PointerEvent;
    currentTarget: HTMLElement;
    sessionStore?: DockviewDragSessionStore;
}): DockviewDragInteraction {
    return {
        nativeEvent: options.nativeEvent,
        currentTarget: options.currentTarget,
        target: options.nativeEvent.target,
        backend: 'touch',
        session:
            options.sessionStore?.value ?? {
                sessionId: null,
                backend: null,
                state: 'idle',
            },
        clientX: options.nativeEvent.clientX ?? 0,
        clientY: options.nativeEvent.clientY ?? 0,
        dataTransfer:
            'dataTransfer' in options.nativeEvent
                ? options.nativeEvent.dataTransfer
                : undefined,
        shiftKey: options.nativeEvent.shiftKey ?? false,
        altKey: options.nativeEvent.altKey ?? false,
        ctrlKey: options.nativeEvent.ctrlKey ?? false,
        metaKey: options.nativeEvent.metaKey ?? false,
        preventDefault: () => options.nativeEvent.preventDefault(),
        stopPropagation: () => options.nativeEvent.stopPropagation(),
    };
}

function getElementDepth(element: HTMLElement): number {
    let depth = 0;
    let current: HTMLElement | null = element;

    while (current) {
        depth++;
        current = current.parentElement;
    }

    return depth;
}
