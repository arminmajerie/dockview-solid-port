class MockPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? 'mouse';
        this.isPrimary = init.isPrimary ?? true;
    }
}

class MockDragEvent extends MouseEvent {
    dataTransfer: DataTransfer | null;

    constructor(
        type: string,
        init: MouseEventInit & { dataTransfer?: DataTransfer | null } = {}
    ) {
        super(type, init);
        this.dataTransfer = init.dataTransfer ?? null;
    }
}

beforeAll(() => {
    Object.defineProperty(window, 'PointerEvent', {
        configurable: true,
        value: MockPointerEvent,
    });

    Object.defineProperty(window, 'DragEvent', {
        configurable: true,
        value: MockDragEvent,
    });

    Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        value: (callback: FrameRequestCallback) =>
            window.setTimeout(() => callback(Date.now()), 0),
    });

    Object.defineProperty(window, 'cancelAnimationFrame', {
        configurable: true,
        value: (handle: number) => window.clearTimeout(handle),
    });
});
