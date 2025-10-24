import {
    GridviewApi,
    GridviewPanel,
    GridviewInitParameters,
    IFrameworkPart,
    GridviewComponent,
} from '@arminmajerie/dockview-core';
import { SolidPart, SolidPortalStore } from '../solid';
import { IGridviewPanelProps } from './gridview';
import { JSX } from 'solid-js';

export class SolidGridPanelView extends GridviewPanel {
  constructor(
    id: string,
    component: string,
    private readonly solidComponent: (props: IGridviewPanelProps) => JSX.Element,
    private readonly solidPortalStore: SolidPortalStore
  ) {
    super(id, component);
  }

  getComponent(): IFrameworkPart {
    return new SolidPart(
      this.element,
      this.solidPortalStore,
      this.solidComponent,
      {
        params: this._params?.params ?? {},
        api: this.api,
        // If containerApi type-cast is needed, keep the hack,
        // but this is a known issue in the original as well
        containerApi: new GridviewApi(
          (this._params as GridviewInitParameters)
            .accessor as GridviewComponent
        ),
      }
    );
  }
}

