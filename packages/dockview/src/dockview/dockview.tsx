
import {
    DockviewWillDropEvent,
    DockviewApi,
    DockviewGroupPanel,
    IHeaderActionsRenderer,
    DockviewDidDropEvent,
    IWatermarkPanelProps,
    IDockviewHeaderActionsProps,
    IDockviewPanelHeaderProps,
    IDockviewPanelProps,
    DockviewOptions,
    PROPERTY_KEYS_DOCKVIEW,
    DockviewComponentOptions,
    DockviewFrameworkOptions,
    DockviewReadyEvent,
    createDockview,
} from 'dockview-core';


import { SolidPanelContentPart } from './solidContentPart';
import { SolidPanelHeaderPart } from './solidHeaderPart';
import { SolidPortalStore, usePortalsLifecycle } from '../solid';
import { SolidWatermarkPart } from './solidWatermarkPart';
import { SolidHeaderActionsRendererPart } from './headerActionsRenderer';
import { createEffect, createSignal, JSX, onCleanup, onMount } from 'solid-js';
import { IDisposable } from 'dockview-core/dist/cjs/lifecycle';

function createGroupControlElement(
  component: ((props: IDockviewHeaderActionsProps) => JSX.Element) | undefined,
  store: SolidPortalStore
): ((groupPanel: DockviewGroupPanel) => IHeaderActionsRenderer) | undefined {
  return component
    ? (groupPanel: DockviewGroupPanel) => {
      return new SolidHeaderActionsRendererPart(
        component,
        store,
        groupPanel
      );
    }
    : undefined;
}

const DEFAULT_SOLID_TAB  = 'props.defaultTabComponent';

export interface IDockviewSolidProps extends DockviewOptions {
  tabComponents?: Record<
    string,
    (props: IDockviewPanelHeaderProps) => JSX.Element
  >;
  components: Record<string, (props: IDockviewPanelProps) => JSX.Element>;
  watermarkComponent?: (props: IWatermarkPanelProps) => JSX.Element;
  defaultTabComponent?: (props: IDockviewPanelHeaderProps) => JSX.Element;
  rightHeaderActionsComponent?: (props: IDockviewHeaderActionsProps) => JSX.Element;
  leftHeaderActionsComponent?: (props: IDockviewHeaderActionsProps) => JSX.Element;
  prefixHeaderActionsComponent?: (props: IDockviewHeaderActionsProps) => JSX.Element;
  //
  onReady: (event: DockviewReadyEvent) => void;
  onDidDrop?: (event: DockviewDidDropEvent) => void;
  onWillDrop?: (event: DockviewWillDropEvent) => void;
}

function extractCoreOptions(props: IDockviewSolidProps): DockviewOptions {
    const coreOptions = PROPERTY_KEYS_DOCKVIEW.reduce((obj, key) => {
        if (key in props) {
            obj[key] = props[key] as any;
        }
        return obj;
    }, {} as Partial<DockviewComponentOptions>);

    return coreOptions as DockviewOptions;
}



export function DockviewSolid(props: IDockviewSolidProps) {


  let domRef: HTMLDivElement | undefined;
  const [portals, addPortal] = usePortalsLifecycle();
  let prevProps: Partial<IDockviewSolidProps> = {};
  const [dockviewRef, setDockviewRef] = createSignal<DockviewApi | undefined>(undefined);


  onMount(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!domRef) {
          return;
        }

        const frameworkTabComponents = props.tabComponents ? { ...props.tabComponents } : {};
        if (props.defaultTabComponent) {
          frameworkTabComponents[DEFAULT_SOLID_TAB] = props.defaultTabComponent;
        }

        const frameworkOptions: DockviewFrameworkOptions = {
          createLeftHeaderActionComponent: createGroupControlElement(
            props.leftHeaderActionsComponent,
            { addPortal }
          ),
          createRightHeaderActionComponent: createGroupControlElement(
            props.rightHeaderActionsComponent,
            { addPortal }
          ),
          createPrefixHeaderActionComponent: createGroupControlElement(
            props.prefixHeaderActionsComponent,
            { addPortal }
          ),
          createComponent: (options) => {
            return new SolidPanelContentPart(
              options.id,
              props.components[options.name],
              { addPortal }
            );
          },
          createTabComponent: (options) => {
            return new SolidPanelHeaderPart(
              options.id,
              frameworkTabComponents[options.name],
              { addPortal }
            );
          },
          createWatermarkComponent: props.watermarkComponent
            ? () => {
              return new SolidWatermarkPart(
                "watermark",
                props.watermarkComponent!,
                { addPortal }
              );
            }
            : undefined,
          defaultTabComponent: props.defaultTabComponent ? DEFAULT_SOLID_TAB : undefined,
        };

        const api = createDockview(domRef, {
          ...extractCoreOptions(props),
          ...frameworkOptions,
        });
        const { clientWidth, clientHeight } = domRef;
        api.layout(clientWidth, clientHeight);

        if (props.onReady) {
          props.onReady({ api });
        }

        setDockviewRef(api); // ✅ CORRECTED HERE

        onCleanup(() => {
          setDockviewRef(undefined);
          api.dispose();
        });
      });
    });
  });

  createEffect(() => {
    const ref = dockviewRef();
    const changes: Partial<DockviewOptions> = {};


    PROPERTY_KEYS_DOCKVIEW.forEach((propKey) => {
      if ((propKey as keyof DockviewOptions) in props) {
        const key = propKey as keyof DockviewOptions;
        const propValue = props[key as keyof typeof props];
        if (propValue !== prevProps[key as keyof typeof prevProps]) {
          changes[key] = propValue as any;
        }
      }
    });

    if (ref) {ref.updateOptions(changes);}
    prevProps = { ...props };
  });

  createEffect(() => {
    const ref = dockviewRef();
    if (!ref) {
      return;
    }

    const disposable = ref.onDidDrop((event) => {
      props.onDidDrop?.(event);
    });
    onCleanup(() => {
      disposable.dispose();
    });
  });

  createEffect(() => {
    const ref = dockviewRef();
    if (!ref) {
      return;
    }
    const disposable = ref.onWillDrop((event) => {
      props.onWillDrop?.(event);
    });
    onCleanup(() => {
      disposable.dispose();
    });
  });

  const update = (label: string, updater: (ref: DockviewApi) => Partial<DockviewComponentOptions>) => {
    createEffect(() => {
      const ref = dockviewRef();
      if (!ref) {
        return;
      }
      ref.updateOptions(updater(ref));
    });
  };

  update("createComponent", () => ({
    createComponent: (options) => {
      return new SolidPanelContentPart(
        options.id,
        props.components[options.name],
        { addPortal }
      );
    },
  }));

  update("createTabComponent", () => {
    const frameworkTabComponents = props.tabComponents ? { ...props.tabComponents } : {};
    if (props.defaultTabComponent) {
      frameworkTabComponents[DEFAULT_SOLID_TAB] = props.defaultTabComponent;
    }
    return {
      defaultTabComponent: props.defaultTabComponent ? DEFAULT_SOLID_TAB : undefined,
      createTabComponent: (options) => {
        return new SolidPanelHeaderPart(
          options.id,
          frameworkTabComponents[options.name],
          { addPortal }
        );
      },
    };
  });

  update("createWatermarkComponent", () => ({
    createWatermarkComponent: props.watermarkComponent
      ? () => {
        return new SolidWatermarkPart(
          "watermark",
          props.watermarkComponent!,
          { addPortal }
        );
      }
      : undefined,
  }));

  update("createRightHeaderActionComponent", () => ({
    createRightHeaderActionComponent: createGroupControlElement(
      props.rightHeaderActionsComponent,
      { addPortal }
    ),
  }));

  update("createLeftHeaderActionComponent", () => ({
    createLeftHeaderActionComponent: createGroupControlElement(
      props.leftHeaderActionsComponent,
      { addPortal }
    ),
  }));

  update("createPrefixHeaderActionComponent", () => ({
    createPrefixHeaderActionComponent: createGroupControlElement(
      props.prefixHeaderActionsComponent,
      { addPortal }
    ),
  }));


  return (
    <div
      ref={(el) => {domRef = el;}}
      style={{ height: "100%", width: "100%" }}
    >
      {/* {portals()} */}
    </div>
  );

}




