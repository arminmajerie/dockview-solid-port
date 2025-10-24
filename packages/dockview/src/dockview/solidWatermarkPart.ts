import { SolidPart, SolidPortalStore } from '../solid';
import {
  PanelUpdateEvent,
  GroupPanelPartInitParameters,
  IWatermarkRenderer,
  WatermarkRendererInitParameters,
  IWatermarkPanelProps,
} from '@arminmajerie/dockview-core';
import { JSX } from 'solid-js';

export class SolidWatermarkPart implements IWatermarkRenderer {
  private readonly _element: HTMLElement;
  private part?: SolidPart<IWatermarkPanelProps>;
  private readonly parameters: GroupPanelPartInitParameters | undefined;

  get element(): HTMLElement {
    return this._element;
  }

  constructor(
    public readonly id: string,
    private readonly component: (props: IWatermarkPanelProps) => JSX.Element,
    private readonly solidPortalStore: SolidPortalStore
  ) {
    this._element = document.createElement('div');
    this._element.className = 'dv-solid-part';
    this._element.style.height = '100%';
    this._element.style.width = '100%';
  }

  init(parameters: WatermarkRendererInitParameters): void {
    this.part = new SolidPart(
      this.element,
      this.solidPortalStore,
      this.component,
      {
        group: parameters.group, // will always be present, but can be undefined
        containerApi: parameters.containerApi,
      } as IWatermarkPanelProps
    );
  }

  focus(): void {
    // noop
  }

  update(params: PanelUpdateEvent): void {
    if (this.parameters) {
      this.parameters.params = params.params;
    }

    this.part?.update({ params: this.parameters?.params ?? {} });
  }

  layout(_width: number, _height: number): void {
    // noop - retrieval from api
  }

  dispose(): void {
    this.part?.dispose();
  }
}
