
import {
    PanelUpdateEvent,
    IPanePart,
    PanePanelComponentInitParameter,
} from 'dockview-core';
import { SolidPart, SolidPortalStore } from '../solid';
import { IPaneviewPanelProps } from './paneview';
import { JSX } from 'solid-js';

export class PanePanelSection implements IPanePart {
    private readonly _element: HTMLElement;
    private part?: SolidPart<IPaneviewPanelProps>;

    get element() {
        return this._element;
    }

  constructor(
    public readonly id: string,
    private readonly component: (props: IPaneviewPanelProps) => JSX.Element,
    private readonly solidPortalStore: SolidPortalStore
  ) {
    this._element = document.createElement('div');
    this._element.style.height = '100%';
    this._element.style.width = '100%';
  }


    public init(parameters: PanePanelComponentInitParameter): void {
      this.part = new SolidPart(
        this.element,
        this.solidPortalStore,
        this.component,
        {
          params: parameters.params,
          api: parameters.api,
          title: parameters.title,
          containerApi: parameters.containerApi
        } as IPaneviewPanelProps<any>
      );
    }

    public toJSON() {
        return {
            id: this.id,
        };
    }

    public update(params: PanelUpdateEvent) {
        this.part?.update(params.params);
    }

    public dispose() {
        this.part?.dispose();
    }
}
