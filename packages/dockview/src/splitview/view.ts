import {
  SplitviewApi,
  PanelViewInitParameters,
  SplitviewPanel, SplitviewPanelApi,
} from 'dockview-core';
import { SolidPart, SolidPortalStore } from '../solid'; // Use your Solid version
import { ISplitviewPanelProps } from './splitview';
import { JSX } from 'solid-js';

export class SolidPanelView extends SplitviewPanel {
  constructor(
    id: string,
    component: string,
    private readonly solidComponent: (props: ISplitviewPanelProps) => JSX.Element,
    private readonly solidPortalStore: SolidPortalStore
  ) {
    super(id, component);
  }

  getComponent(): SolidPart<ISplitviewPanelProps> {
    return new SolidPart(
      this.element,
      this.solidPortalStore,
      this.solidComponent,
      {
        params: this._params?.params ?? {},
        api: this.api as SplitviewPanelApi,
        containerApi: new SplitviewApi(
          (this._params as PanelViewInitParameters).accessor
        ),
      }
    );
  }
}
