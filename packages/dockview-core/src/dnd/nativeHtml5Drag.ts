import { DockviewInteractionMode } from '../dockview/dockviewEnvironment';

export function nativeHtml5DragEnabled(
    interactionMode: DockviewInteractionMode,
    dndDisabled: boolean
): boolean {
    return !dndDisabled && interactionMode !== 'touch';
}

export function applyNativeHtml5Drag(
    element: HTMLElement,
    enabled: boolean
): void {
    element.draggable = enabled;
    element.style.setProperty(
        '-webkit-user-drag',
        enabled ? 'element' : 'none'
    );
    element.style.touchAction = enabled ? '' : 'none';
}
