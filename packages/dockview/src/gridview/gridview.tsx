
import {
    GridviewPanelApi,
    GridviewApi,
    createGridview,
    GridviewOptions,
    PROPERTY_KEYS_GRIDVIEW,
    GridviewComponentOptions,
    GridviewFrameworkOptions,
} from '@arminmajerie/dockview-core';
import { SolidGridPanelView } from './view';
import { usePortalsLifecycle } from '../solid';
import { PanelParameters } from '../types';
import { createEffect, JSX, onCleanup } from 'solid-js';

export interface GridviewReadyEvent {
    api: GridviewApi;
}

export interface IGridviewPanelProps<T extends { [index: string]: any } = any>
    extends PanelParameters<T> {
    api: GridviewPanelApi;
    containerApi: GridviewApi;
}

export interface IGridviewSolidProps extends GridviewOptions {
  onReady: (event: GridviewReadyEvent) => void;
  components: Record<string, (props: IGridviewPanelProps) => JSX.Element>;
}


function extractCoreOptions(props: IGridviewSolidProps): GridviewOptions {
    const coreOptions = PROPERTY_KEYS_GRIDVIEW.reduce((obj, key) => {
        if (key in props) {
            obj[key] = props[key] as any;
        }
        return obj;
    }, {} as Partial<GridviewComponentOptions>);

    return coreOptions as GridviewOptions;
}

export function GridviewSolid(props: IGridviewSolidProps) {
  let domRef: HTMLDivElement | undefined;
  let gridviewRef: GridviewApi | undefined;
  const [portals, addPortal] = usePortalsLifecycle();

  let prevProps: Partial<IGridviewSolidProps> = {};

  // Handle GridviewOptions changes reactively
  createEffect(() => {
    const changes: Partial<GridviewOptions> = {};

    PROPERTY_KEYS_GRIDVIEW.forEach((propKey) => {
      // Check key exists in GridviewOptions
      if (propKey in ({} as GridviewOptions)) {
        const key = propKey as keyof GridviewOptions;
        const propValue = props[key as keyof typeof props];
        if (propValue !== prevProps[key as keyof typeof prevProps]) {
          changes[key] = propValue as any;
        }
      }
    });

    if (gridviewRef) {
      gridviewRef.updateOptions(changes);
    }
    prevProps = { ...props };
  });

  // One-time gridview creation/cleanup
  onCleanup(() => {
    if (gridviewRef) {
      gridviewRef.dispose();
      gridviewRef = undefined;
    }
  });

  createEffect(() => {
    if (!domRef) return;

    const frameworkOptions: GridviewFrameworkOptions = {
      createComponent: (options) => {
        return new SolidGridPanelView(
          options.id,
          options.name,
          props.components[options.name],
          { addPortal }
        );
      },
    };

    const api = createGridview(domRef, {
      ...extractCoreOptions(props),
      ...frameworkOptions,
    });

    const { clientWidth, clientHeight } = domRef;
    api.layout(clientWidth, clientHeight);

    if (props.onReady) {
      props.onReady({ api });
    }

    gridviewRef = api;

    onCleanup(() => {
      gridviewRef = undefined;
      api.dispose();
    });
  });

  createEffect(() => {
    if (!gridviewRef) return;
    gridviewRef.updateOptions({
      createComponent: (options) => {
        return new SolidGridPanelView(
          options.id,
          options.name,
          props.components[options.name],
          { addPortal }
        );
      },
    });
  });

  return (
    <div ref={domRef} style={{ height: "100%", width: "100%" }}>
      {/* Do NOT render portals here—they are not JSX elements */}
    </div>
  );
}
