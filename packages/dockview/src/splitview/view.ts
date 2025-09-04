// packages/dockview/src/splitview/view.ts
import {
  SplitviewApi,
  PanelViewInitParameters,
  SplitviewPanel,
  SplitviewPanelApi,
} from "dockview-core";
import { SolidPart, SolidPortalStore } from "../solid";
import { ISplitviewPanelProps } from "./splitview";
import type { JSX } from "solid-js";

/**
 * Solid-backed panel view that satisfies dockview-core's SplitviewPanel contract.
 * No non-existent types/classes are used.
 */
export class SolidPanelView extends SplitviewPanel {
  constructor(
    id: string,
    component: string,
    private readonly solidComponent: (props: ISplitviewPanelProps) => JSX.Element,
    private readonly solidPortalStore: SolidPortalStore
  ) {
    super(id, component);
  }

  /**
   * Called by dockview-core to obtain the framework-specific renderer.
   * We return a SolidPart that mounts the Solid component into this.element.
   */
  getComponent(): SolidPart<ISplitviewPanelProps> {
    const paramsObj = (this as any)._params as PanelViewInitParameters | undefined;

    return new SolidPart(
      this.element,
      this.solidPortalStore,
      this.solidComponent,
      {
        // user params
        params: paramsObj?.params ?? {},
        // panel API (already created by base class)
        api: (this.api as SplitviewPanelApi),
        // Splitview API for the container, created from accessor
        containerApi: new SplitviewApi(paramsObj!.accessor),
      }
    );
  }
}

