import { SolidPortalStore } from '../solid';
import { PanelUpdateEvent, IWatermarkRenderer, WatermarkRendererInitParameters, IWatermarkPanelProps } from 'dockview-core';
import { JSX } from 'solid-js';
export declare class SolidWatermarkPart implements IWatermarkRenderer {
    readonly id: string;
    private readonly component;
    private readonly solidPortalStore;
    private readonly _element;
    private part?;
    private readonly parameters;
    get element(): HTMLElement;
    constructor(id: string, component: (props: IWatermarkPanelProps) => JSX.Element, solidPortalStore: SolidPortalStore);
    init(parameters: WatermarkRendererInitParameters): void;
    focus(): void;
    update(params: PanelUpdateEvent): void;
    layout(_width: number, _height: number): void;
    dispose(): void;
}
