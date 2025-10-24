import { SolidPart, SolidPortalStore } from '../solid';
import {
  PanelUpdateEvent,
  ITabRenderer,
  TabPartInitParameters,
  IDockviewPanelHeaderProps,
} from '@arminmajerie/dockview-core';
import { JSX } from 'solid-js';

export class SolidPanelHeaderPart implements ITabRenderer {
  private readonly _element: HTMLElement;
  private part?: SolidPart<IDockviewPanelHeaderProps>;

  get element(): HTMLElement {
    return this._element;
  }

  constructor(
    public readonly id: string,
    private readonly component: (props: IDockviewPanelHeaderProps) => JSX.Element,
    private readonly solidPortalStore: SolidPortalStore
  ) {
    this._element = document.createElement('div');
    this._element.className = 'dv-solid-part';
    this._element.style.height = '100%';
    this._element.style.width = '100%';
  }

  focus(): void {
    // noop
  }

  public init(parameters: TabPartInitParameters): void {
    this.part = new SolidPart(
      this.element,
      this.solidPortalStore,
      this.component,
      {
        params: parameters.params,
        api: parameters.api,
        containerApi: parameters.containerApi,
        tabLocation: parameters.tabLocation,
      }
    );
  }

  public update(event: PanelUpdateEvent): void {
    this.part?.update({ params: event.params });
  }

  public layout(_width: number, _height: number): void {
    // noop
  }

  public dispose(): void {
    this.part?.dispose();
  }
}
