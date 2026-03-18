class ResizeObserver {
    constructor(callback) {
        this.callback = callback;
    }

    observe() {
        // noop
    }

    unobserve() {
        // noop
    }

    disconnect() {
        // noop
    }
}

global.ResizeObserver = ResizeObserver;
