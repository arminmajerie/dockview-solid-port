import { detectInteractionMode } from '../../dockview/dockviewEnvironment';

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

describe('detectInteractionMode', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('forces touch mode for Android Chrome even when hover media queries look desktop-like', () => {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value:
                'Mozilla/5.0 (Linux; Android 13; SM-A336B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.64 Mobile Safari/537.36',
        });
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: (query: string) =>
                createMediaQueryList(
                    query === '(hover: hover)' ||
                        query === '(pointer: fine)' ||
                        query === '(any-hover: hover)' ||
                        query === '(any-pointer: fine)',
                    query
                ),
        });

        expect(detectInteractionMode(window)).toBe('touch');
    });

    it('keeps desktop mode for a Windows desktop user agent', () => {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/152.0.0.0',
        });
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: (query: string) =>
                createMediaQueryList(
                    query === '(hover: hover)' ||
                        query === '(pointer: fine)' ||
                        query === '(any-hover: hover)' ||
                        query === '(any-pointer: fine)',
                    query
                ),
        });

        expect(detectInteractionMode(window)).toBe('desktop');
    });
});
