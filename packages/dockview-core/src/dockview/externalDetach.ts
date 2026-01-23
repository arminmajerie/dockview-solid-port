// packages/dockview-core/src/dockview/externalDetach.ts
/**
 * External detach/reattach functionality for dockview.
 * 
 * This module provides opt-in support for detaching panels to external windows
 * (e.g., Tauri windows) and reattaching them later.
 * 
 * Design principles:
 * - Dockview only emits events; it doesn't open network sockets
 * - Panel serialization is handled via request-serialize events
 * - Panels self-register their serializers
 * - Visual affordances are CSS-based
 */

import { Emitter, Event } from '../events';
import { IDockviewPanel } from './dockviewPanel';
import { DockviewGroupPanel } from './dockviewGroupPanel';

/** Screen coordinates for external detach operations */
export interface ExternalScreenCoords {
    x: number;
    y: number;
}

/** Metadata about a panel being dragged */
export interface DraggedPanelMeta {
    panelId: string;
    panelType: string;
    groupId: string;
    panel: IDockviewPanel;
    group: DockviewGroupPanel;
}

/** Event fired when a panel drag exits the window bounds */
export interface ExternalDragExitEvent {
    panelMeta: DraggedPanelMeta;
    screenCoords: ExternalScreenCoords;
    nativeEvent: DragEvent;
}

/** Event fired when a panel is dropped outside the window */
export interface ExternalDropOutsideEvent {
    panelMeta: DraggedPanelMeta;
    screenCoords: ExternalScreenCoords;
    nativeEvent: DragEvent;
}

/** Event fired when a dragged panel returns to the window */
export interface ExternalDragReturnEvent {
    panelId: string;
    nativeEvent: DragEvent;
}

/** Result from the detach handler */
export interface DetachResult {
    /** Whether the detach was accepted */
    accept: boolean;
    /** Serialized panel state if available */
    serializedState?: unknown;
    /** Error message if detach was rejected */
    error?: string;
}

/** Handler called when a panel is dropped outside the window */
export type DetachHandler = (
    panelId: string,
    screenCoords: ExternalScreenCoords,
    panelMeta: DraggedPanelMeta
) => Promise<DetachResult>;

/** Request to serialize a panel's state */
export interface SerializeRequestEvent {
    panelId: string;
    respond: (state: unknown) => void;
}

/** Configuration for external detach behavior */
export interface ExternalDetachConfig {
    /** Enable external detach functionality. Default: false */
    allowExternalDetach: boolean;
    /** CSS class to apply when dragging outside bounds. Default: 'dv-external-detach-allowed' */
    dragOutsideClassName?: string;
    /** Minimum distance from window edge to trigger external drop detection (pixels). Default: 50 */
    edgeThreshold?: number;
    /** Handler called when a panel is dropped outside */
    detachHandler?: DetachHandler;
}

const DEFAULT_CONFIG: Required<ExternalDetachConfig> = {
    allowExternalDetach: false,
    dragOutsideClassName: 'dv-external-detach-allowed',
    edgeThreshold: 50,
    detachHandler: async () => ({ accept: false, error: 'No detach handler configured' }),
};

/**
 * External detach controller for dockview.
 * 
 * Attach this to a DockviewComponent to enable external detach functionality.
 */
export class ExternalDetachController {
    private readonly _onDragExit = new Emitter<ExternalDragExitEvent>();
    readonly onDragExit: Event<ExternalDragExitEvent> = this._onDragExit.event;
    
    private readonly _onDropOutside = new Emitter<ExternalDropOutsideEvent>();
    readonly onDropOutside: Event<ExternalDropOutsideEvent> = this._onDropOutside.event;
    
    private readonly _onDragReturn = new Emitter<ExternalDragReturnEvent>();
    readonly onDragReturn: Event<ExternalDragReturnEvent> = this._onDragReturn.event;
    
    private readonly _onSerializeRequest = new Emitter<SerializeRequestEvent>();
    readonly onSerializeRequest: Event<SerializeRequestEvent> = this._onSerializeRequest.event;
    
    private config: Required<ExternalDetachConfig>;
    private isOutsideWindow = false;
    private currentDragMeta: DraggedPanelMeta | null = null;
    
    /** Panels that have been detached (tracked for reattach) */
    private detachedPanels: Map<string, { meta: DraggedPanelMeta; serializedState?: unknown }> = new Map();
    
    /** Panel serializers registered by panels */
    private panelSerializers: Map<string, () => Promise<unknown>> = new Map();
    
    constructor(config: Partial<ExternalDetachConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    
    /** Check if external detach is allowed */
    get allowExternalDetach(): boolean {
        return this.config.allowExternalDetach;
    }
    
    /** Set whether external detach is allowed */
    set allowExternalDetach(value: boolean) {
        this.config.allowExternalDetach = value;
    }
    
    /** Update configuration */
    updateConfig(config: Partial<ExternalDetachConfig>): void {
        this.config = { ...this.config, ...config };
    }
    
    /** 
     * Register a serializer for a panel.
     * Panels should call this to opt-in to state serialization.
     */
    registerSerializer(panelId: string, serializer: () => Promise<unknown>): () => void {
        this.panelSerializers.set(panelId, serializer);
        return () => {
            this.panelSerializers.delete(panelId);
        };
    }
    
    /**
     * Handle drag start - track the panel being dragged.
     */
    handleDragStart(panel: IDockviewPanel, group: DockviewGroupPanel): void {
        if (!this.config.allowExternalDetach) return;
        
        this.currentDragMeta = {
            panelId: panel.id,
            panelType: panel.view.contentComponent,
            groupId: group.id,
            panel,
            group,
        };
        this.isOutsideWindow = false;
    }
    
    /**
     * Handle drag over - check if we're outside the window bounds.
     */
    handleDragOver(event: DragEvent): void {
        if (!this.config.allowExternalDetach || !this.currentDragMeta) return;
        
        const isNowOutside = this.isOutsideBounds(event);
        
        if (isNowOutside && !this.isOutsideWindow) {
            // Just exited the window
            this.isOutsideWindow = true;
            this._onDragExit.fire({
                panelMeta: this.currentDragMeta,
                screenCoords: { x: event.screenX, y: event.screenY },
                nativeEvent: event,
            });
            
            // Add visual indicator
            document.body.classList.add(this.config.dragOutsideClassName);
            
        } else if (!isNowOutside && this.isOutsideWindow) {
            // Returned to the window
            this.isOutsideWindow = false;
            this._onDragReturn.fire({
                panelId: this.currentDragMeta.panelId,
                nativeEvent: event,
            });
            
            // Remove visual indicator
            document.body.classList.remove(this.config.dragOutsideClassName);
        }
    }
    
    /**
     * Handle drag end - check if dropped outside.
     */
    async handleDragEnd(event: DragEvent): Promise<void> {
        if (!this.config.allowExternalDetach || !this.currentDragMeta) {
            this.cleanup();
            return;
        }
        
        const meta = this.currentDragMeta;
        
        // Remove visual indicator
        document.body.classList.remove(this.config.dragOutsideClassName);
        
        if (this.isOutsideWindow) {
            const screenCoords = { x: event.screenX, y: event.screenY };
            
            // Fire drop outside event
            this._onDropOutside.fire({
                panelMeta: meta,
                screenCoords,
                nativeEvent: event,
            });
            
            // Call detach handler
            try {
                const result = await this.config.detachHandler(
                    meta.panelId,
                    screenCoords,
                    meta
                );
                
                if (result.accept) {
                    // Record as detached
                    this.detachedPanels.set(meta.panelId, {
                        meta,
                        serializedState: result.serializedState,
                    });
                    
                    console.log(`[ExternalDetach] Panel '${meta.panelId}' detached successfully`);
                } else {
                    console.warn(`[ExternalDetach] Detach rejected for panel '${meta.panelId}': ${result.error}`);
                }
            } catch (error) {
                console.error(`[ExternalDetach] Detach handler error for panel '${meta.panelId}':`, error);
            }
        }
        
        this.cleanup();
    }
    
    /**
     * Request serialization of a panel's state.
     * Returns a promise that resolves with the state or rejects on timeout.
     */
    async requestSerializePanel(panelId: string, timeoutMs = 5000): Promise<unknown> {
        // First check if we have a registered serializer
        const serializer = this.panelSerializers.get(panelId);
        if (serializer) {
            return serializer();
        }
        
        // Fall back to event-based serialization
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Serialize request timed out for panel: ${panelId}`));
            }, timeoutMs);
            
            this._onSerializeRequest.fire({
                panelId,
                respond: (state) => {
                    clearTimeout(timeout);
                    resolve(state);
                },
            });
        });
    }
    
    /**
     * Accept a panel reattachment from an external window.
     * This should be called by the host application when a detached panel
     * needs to be reinserted into the dockview layout.
     */
    async acceptExternalReattach(
        panelId: string,
        serializedState?: unknown
    ): Promise<{ success: boolean; error?: string }> {
        const detached = this.detachedPanels.get(panelId);
        
        if (!detached) {
            return {
                success: false,
                error: `Panel '${panelId}' is not tracked as detached`,
            };
        }
        
        // Remove from detached tracking
        this.detachedPanels.delete(panelId);
        
        console.log(`[ExternalDetach] Panel '${panelId}' ready for reattach`);
        
        // The actual panel recreation should be handled by the host application
        // via the dockview API. This just cleans up tracking.
        return { success: true };
    }
    
    /**
     * Check if a panel is currently detached.
     */
    isDetached(panelId: string): boolean {
        return this.detachedPanels.has(panelId);
    }
    
    /**
     * Get the list of detached panel IDs.
     */
    getDetachedPanelIds(): string[] {
        return Array.from(this.detachedPanels.keys());
    }
    
    /**
     * Get detached panel info.
     */
    getDetachedPanel(panelId: string): { meta: DraggedPanelMeta; serializedState?: unknown } | undefined {
        return this.detachedPanels.get(panelId);
    }
    
    /**
     * Dispose the controller.
     */
    dispose(): void {
        this._onDragExit.dispose();
        this._onDropOutside.dispose();
        this._onDragReturn.dispose();
        this._onSerializeRequest.dispose();
        this.detachedPanels.clear();
        this.panelSerializers.clear();
        this.cleanup();
    }
    
    // ============================================================================
    // Private Methods
    // ============================================================================
    
    private isOutsideBounds(event: DragEvent): boolean {
        const threshold = this.config.edgeThreshold;
        const { innerWidth, innerHeight } = window;
        
        // Check if near window edges or outside
        const isNearLeft = event.clientX < threshold;
        const isNearRight = event.clientX > innerWidth - threshold;
        const isNearTop = event.clientY < threshold;
        const isNearBottom = event.clientY > innerHeight - threshold;
        
        // Also check if completely outside (clientX/Y will be 0 or near it)
        const isCompletelyOutside = 
            event.clientX <= 0 || 
            event.clientY <= 0 ||
            event.clientX >= innerWidth ||
            event.clientY >= innerHeight;
        
        return isCompletelyOutside || (isNearLeft || isNearRight || isNearTop || isNearBottom);
    }
    
    private cleanup(): void {
        this.currentDragMeta = null;
        this.isOutsideWindow = false;
        document.body.classList.remove(this.config.dragOutsideClassName);
    }
}
