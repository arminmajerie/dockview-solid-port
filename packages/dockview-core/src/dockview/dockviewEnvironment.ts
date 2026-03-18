import { addDisposableListener, Emitter, Event } from '../events';
import { CompositeDisposable, Disposable } from '../lifecycle';
import { watchElementResize } from '../dom';

export type DockviewInteractionMode = 'desktop' | 'touch';
export type DockviewLayoutMode = 'compact' | 'full';

export interface DockviewEnvironmentSnapshot {
    readonly interactionMode: DockviewInteractionMode;
    readonly layoutMode: DockviewLayoutMode;
    readonly containerWidth: number;
    readonly containerHeight: number;
}

const COMPACT_LAYOUT_WIDTH = 720;

function mediaMatches(win: Window, query: string): boolean {
    return typeof win.matchMedia === 'function' && win.matchMedia(query).matches;
}

function getMobileHint(win: Window): boolean | undefined {
    const userAgentData = (
        win.navigator as Navigator & {
            userAgentData?: { mobile?: boolean };
        }
    ).userAgentData;

    if (typeof userAgentData?.mobile === 'boolean') {
        return userAgentData.mobile;
    }

    return undefined;
}

function isMobileUserAgent(userAgent: string): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
    );
}

export function detectInteractionMode(win: Window): DockviewInteractionMode {
    const hoverNone = mediaMatches(win, '(hover: none)');
    const hoverHover = mediaMatches(win, '(hover: hover)');
    const pointerCoarse = mediaMatches(win, '(pointer: coarse)');
    const pointerFine = mediaMatches(win, '(pointer: fine)');
    const anyHoverHover = mediaMatches(win, '(any-hover: hover)');
    const anyPointerFine = mediaMatches(win, '(any-pointer: fine)');
    const mobileHint = getMobileHint(win);

    if (pointerCoarse && hoverNone) {
        return 'touch';
    }

    if (pointerFine && hoverHover) {
        return 'desktop';
    }

    if (pointerCoarse && !pointerFine) {
        return 'touch';
    }

    if (hoverNone && !anyPointerFine && !anyHoverHover) {
        return 'touch';
    }

    if (mobileHint === true && (pointerCoarse || hoverNone)) {
        return 'touch';
    }

    if (anyPointerFine && anyHoverHover) {
        return 'desktop';
    }

    if (pointerFine || hoverHover) {
        return 'desktop';
    }

    if (mobileHint === true) {
        return 'touch';
    }

    return isMobileUserAgent(win.navigator.userAgent) ? 'touch' : 'desktop';
}

export function detectLayoutModeFromSize(width: number): DockviewLayoutMode {
    return width < COMPACT_LAYOUT_WIDTH ? 'compact' : 'full';
}

export class DockviewEnvironmentController extends CompositeDisposable {
    private readonly win: Window;
    private _interactionMode: DockviewInteractionMode;
    private _layoutMode: DockviewLayoutMode;
    private _containerWidth = 0;
    private _containerHeight = 0;

    private readonly _onDidInteractionModeChange =
        new Emitter<DockviewInteractionMode>({ replay: true });
    readonly onDidInteractionModeChange: Event<DockviewInteractionMode> =
        this._onDidInteractionModeChange.event;

    private readonly _onDidLayoutModeChange =
        new Emitter<DockviewLayoutMode>({ replay: true });
    readonly onDidLayoutModeChange: Event<DockviewLayoutMode> =
        this._onDidLayoutModeChange.event;

    get interactionMode(): DockviewInteractionMode {
        return this._interactionMode;
    }

    get layoutMode(): DockviewLayoutMode {
        return this._layoutMode;
    }

    get value(): DockviewEnvironmentSnapshot {
        return {
            interactionMode: this._interactionMode,
            layoutMode: this._layoutMode,
            containerWidth: this._containerWidth,
            containerHeight: this._containerHeight,
        };
    }

    constructor(private readonly element: HTMLElement) {
        super();

        this.win = element.ownerDocument.defaultView ?? window;
        this._interactionMode = detectInteractionMode(this.win);

        const initialSize = this.readContainerSize();
        this._containerWidth = initialSize.width;
        this._containerHeight = initialSize.height;
        this._layoutMode = detectLayoutModeFromSize(this._containerWidth);

        const mediaQueries = [
            '(hover: none)',
            '(hover: hover)',
            '(pointer: coarse)',
            '(pointer: fine)',
            '(any-hover: hover)',
            '(any-pointer: fine)',
        ];

        this.addDisposables(
            this._onDidInteractionModeChange,
            this._onDidLayoutModeChange,
            watchElementResize(this.element, () => {
                this.updateLayoutMode();
            }),
            ...mediaQueries.map((query) => this.watchMediaQuery(query)),
            addDisposableListener(this.win, 'resize', () => {
                this.updateLayoutMode();
                this.updateInteractionMode();
            })
        );

        this._onDidInteractionModeChange.fire(this._interactionMode);
        this._onDidLayoutModeChange.fire(this._layoutMode);
    }

    private updateInteractionMode(): void {
        const nextValue = detectInteractionMode(this.win);

        if (nextValue === this._interactionMode) {
            return;
        }

        this._interactionMode = nextValue;
        this._onDidInteractionModeChange.fire(this._interactionMode);
    }

    private updateLayoutMode(): void {
        const size = this.readContainerSize();
        this._containerWidth = size.width;
        this._containerHeight = size.height;

        const nextValue = detectLayoutModeFromSize(this._containerWidth);

        if (nextValue === this._layoutMode) {
            return;
        }

        this._layoutMode = nextValue;
        this._onDidLayoutModeChange.fire(this._layoutMode);
    }

    private readContainerSize(): { width: number; height: number } {
        const width =
            this.element.clientWidth ||
            this.element.getBoundingClientRect().width ||
            this.win.innerWidth;
        const height =
            this.element.clientHeight ||
            this.element.getBoundingClientRect().height ||
            this.win.innerHeight;

        return {
            width: Math.max(0, Math.round(width)),
            height: Math.max(0, Math.round(height)),
        };
    }

    private watchMediaQuery(query: string) {
        if (typeof this.win.matchMedia !== 'function') {
            return Disposable.NONE;
        }

        const mediaQueryList = this.win.matchMedia(query);
        const listener = () => {
            this.updateInteractionMode();
        };

        if (typeof mediaQueryList.addEventListener === 'function') {
            mediaQueryList.addEventListener('change', listener);
            return Disposable.from(() => {
                mediaQueryList.removeEventListener('change', listener);
            });
        }

        const legacyMediaQueryList = mediaQueryList as MediaQueryList & {
            addListener?: (cb: (event: MediaQueryListEvent) => void) => void;
            removeListener?: (cb: (event: MediaQueryListEvent) => void) => void;
        };

        legacyMediaQueryList.addListener?.(listener);

        return Disposable.from(() => {
            legacyMediaQueryList.removeListener?.(listener);
        });
    }
}
