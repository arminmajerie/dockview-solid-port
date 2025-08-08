
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
  console.log("[DockviewSolid:dockview.tsx] function ENTRY", props);

  let domRef: HTMLDivElement | undefined;
  const [portals, addPortal] = usePortalsLifecycle();
  let prevProps: Partial<IDockviewSolidProps> = {};
  const [dockviewRef, setDockviewRef] = createSignal<DockviewApi | undefined>(undefined);

  console.log("[DockviewSolid:dockview.tsx] RENDER 2");

  onMount(() => {
    console.log("[DockviewSolid:dockview.tsx] onMount fired", domRef);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!domRef) {
          console.error("[DockviewSolid:dockview.tsx] domRef still undefined after rAF ×2");
          return;
        }

        console.log("[DockviewSolid:dockview.tsx] domRef is ready", domRef);

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
            console.log("[DockviewSolid:dockview.tsx] createComponent", options);
            return new SolidPanelContentPart(
              options.id,
              props.components[options.name],
              { addPortal }
            );
          },
          createTabComponent: (options) => {
            console.log("[DockviewSolid:dockview.tsx] createTabComponent", options);
            return new SolidPanelHeaderPart(
              options.id,
              frameworkTabComponents[options.name],
              { addPortal }
            );
          },
          createWatermarkComponent: props.watermarkComponent
            ? () => {
              console.log("[DockviewSolid:dockview.tsx] createWatermarkComponent");
              return new SolidWatermarkPart(
                "watermark",
                props.watermarkComponent!,
                { addPortal }
              );
            }
            : undefined,
          defaultTabComponent: props.defaultTabComponent ? DEFAULT_SOLID_TAB : undefined,
        };

        console.log("[DockviewSolid:dockview.tsx] creating Dockview instance with options", {
          ...extractCoreOptions(props),
          ...frameworkOptions,
        });

        const api = createDockview(domRef, {
          ...extractCoreOptions(props),
          ...frameworkOptions,
        });

        const { clientWidth, clientHeight } = domRef;
        console.log("[DockviewSolid:dockview.tsx] calling api.layout", { clientWidth, clientHeight });
        api.layout(clientWidth, clientHeight);

        if (props.onReady) {
          console.log("[DockviewSolid:dockview.tsx] calling props.onReady");
          props.onReady({ api });
        }

        setDockviewRef(api); // ✅ CORRECTED HERE

        onCleanup(() => {
          console.log("[DockviewSolid:dockview.tsx] onCleanup: disposing dockviewRef");
          setDockviewRef(undefined);
          api.dispose();
        });
      });
    });
  });

  createEffect(() => {
    console.log("[DockviewSolid:dockview.tsx] EFFECT what is this rangor", props);
    const ref = dockviewRef();
    const changes: Partial<DockviewOptions> = {};


    PROPERTY_KEYS_DOCKVIEW.forEach((propKey) => {
      if ((propKey as keyof DockviewOptions) in props) {
        const key = propKey as keyof DockviewOptions;
        const propValue = props[key as keyof typeof props];
        if (propValue !== prevProps[key as keyof typeof prevProps]) {
          changes[key] = propValue as any;
          console.log(`[DockviewSolid:dockview.tsx] PROP changed: ${key.toString()}`, {
            old: prevProps[key as keyof typeof prevProps],
            new: propValue,
          });
        }
      }
    });

    if (ref) {
      console.log("[DockviewSolid:dockview.tsx] dockviewRef exists, updating options", changes);
      ref.updateOptions(changes);
    } else {
      console.log("[DockviewSolid:dockview.tsx] dockviewRef is not initialized yet, skipping option patch");
    }

    prevProps = { ...props };
  });

  createEffect(() => {
    const ref = dockviewRef();
    if (!ref) {
      console.log("[DockviewSolid:dockview.tsx] onDidDrop: dockviewRef missing");
      return;
    }
    console.log("[DockviewSolid:dockview.tsx] Subscribing to onDidDrop");
    const disposable = ref.onDidDrop((event) => {
      console.log("[DockviewSolid:dockview.tsx] onDidDrop event", event);
      props.onDidDrop?.(event);
    });
    onCleanup(() => {
      console.log("[DockviewSolid:dockview.tsx] onDidDrop: unsubscribing");
      disposable.dispose();
    });
  });

  createEffect(() => {
    const ref = dockviewRef();
    if (!ref) {
      console.log("[DockviewSolid:dockview.tsx] onWillDrop: dockviewRef missing");
      return;
    }
    console.log("[DockviewSolid:dockview.tsx] Subscribing to onWillDrop");
    const disposable = ref.onWillDrop((event) => {
      console.log("[DockviewSolid:dockview.tsx] onWillDrop event", event);
      props.onWillDrop?.(event);
    });
    onCleanup(() => {
      console.log("[DockviewSolid:dockview.tsx] onWillDrop: unsubscribing");
      disposable.dispose();
    });
  });

  const update = (label: string, updater: (ref: DockviewApi) => Partial<DockviewComponentOptions>) => {
    createEffect(() => {
      const ref = dockviewRef();
      if (!ref) {
        console.log(`[DockviewSolid:dockview.tsx] updateOptions (${label}): dockviewRef missing`);
        return;
      }
      console.log(`[DockviewSolid:dockview.tsx] updateOptions (${label})`);
      ref.updateOptions(updater(ref));
    });
  };

  update("createComponent", () => ({
    createComponent: (options) => {
      console.log("[DockviewSolid:dockview.tsx] createComponent (dynamic)", options);
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
        console.log("[DockviewSolid:dockview.tsx] createTabComponent (dynamic)", options);
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
        console.log("[DockviewSolid:dockview.tsx] createWatermarkComponent (dynamic)");
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

  console.log("[DockviewSolid:dockview.tsx] RETURN main div", domRef);

  return (
    <div
      ref={(el) => {
        domRef = el;
        console.log("[DockviewSolid:dockview.tsx] div got ref", domRef);
      }}
      style={{ height: "100%", width: "100%" }}
    >
      {/* {portals()} */}
    </div>
  );

}




