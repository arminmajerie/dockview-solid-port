import { PROPERTY_KEYS_DOCKVIEW, createDockview, } from '@arminmajerie/dockview-core';
import { SolidPanelContentPart } from './solidContentPart';
import { SolidPanelHeaderPart } from './solidHeaderPart';
import { usePortalsLifecycle } from '../solid';
import { SolidWatermarkPart } from './solidWatermarkPart';
import { SolidHeaderActionsRendererPart } from './headerActionsRenderer';
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
function createGroupControlElement(component, store) {
    return component
        ? (groupPanel) => {
            return new SolidHeaderActionsRendererPart(component, store, groupPanel);
        }
        : undefined;
}
const DEFAULT_SOLID_TAB = 'props.defaultTabComponent';
function extractCoreOptions(props) {
    const coreOptions = PROPERTY_KEYS_DOCKVIEW.reduce((obj, key) => {
        if (key in props) {
            obj[key] = props[key];
        }
        return obj;
    }, {});
    return coreOptions;
}
export function DockviewSolid(props) {
    let domRef;
    const [portals, addPortal] = usePortalsLifecycle();
    let prevProps = {};
    const [dockviewRef, setDockviewRef] = createSignal(undefined);
    // Hold API so we can dispose it from the owner-registered cleanup
    let api;
    onMount(() => {
        let disposed = false;
        // ✅ Register cleanup synchronously (under owner)
        onCleanup(() => {
            disposed = true;
            try {
                setDockviewRef(undefined);
            }
            catch { }
            try {
                api?.dispose();
            }
            catch { }
            api = undefined;
        });
        // Defer creation to next frames, but DO NOT register onCleanup here
        const start = () => {
            if (!domRef || disposed)
                return;
            const frameworkTabComponents = props.tabComponents ? { ...props.tabComponents } : {};
            if (props.defaultTabComponent) {
                frameworkTabComponents[DEFAULT_SOLID_TAB] = props.defaultTabComponent;
            }
            const frameworkOptions = {
                createLeftHeaderActionComponent: createGroupControlElement(props.leftHeaderActionsComponent, { addPortal }),
                createRightHeaderActionComponent: createGroupControlElement(props.rightHeaderActionsComponent, { addPortal }),
                createPrefixHeaderActionComponent: createGroupControlElement(props.prefixHeaderActionsComponent, { addPortal }),
                createComponent: (options) => {
                    return new SolidPanelContentPart(options.id, props.components[options.name], { addPortal });
                },
                createTabComponent: (options) => {
                    return new SolidPanelHeaderPart(options.id, (props.tabComponents ? props.tabComponents : {})[options.name] ??
                        (props.defaultTabComponent ? props.defaultTabComponent : undefined), { addPortal });
                },
                createWatermarkComponent: props.watermarkComponent
                    ? () => new SolidWatermarkPart("watermark", props.watermarkComponent, { addPortal })
                    : undefined,
                defaultTabComponent: props.defaultTabComponent ? DEFAULT_SOLID_TAB : undefined,
            };
            api = createDockview(domRef, {
                ...extractCoreOptions(props),
                ...frameworkOptions,
            });
            const { clientWidth, clientHeight } = domRef;
            api.layout(clientWidth, clientHeight);
            props.onReady?.({ api });
            setDockviewRef(api);
        };
        // Keep your 2× rAF delay, but only *call* start; don't register cleanups here
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                start();
            });
        });
    });
    // Track whether initial setup is complete to prevent effects from
    // re-triggering updateOptions immediately after onReady (which causes
    // re-layout that can blank out panels added during onReady).
    let initialSetupComplete = false;
    // Prop updates
    createEffect(() => {
        const ref = dockviewRef();
        if (!ref)
            return;
        // Skip the first run — the factories were already set in start()
        if (!initialSetupComplete) {
            initialSetupComplete = true;
            prevProps = { ...props };
            return;
        }
        const changes = {};
        PROPERTY_KEYS_DOCKVIEW.forEach((propKey) => {
            if (propKey in props) {
                const key = propKey;
                const propValue = props[key];
                if (propValue !== prevProps[key]) {
                    changes[key] = propValue;
                }
            }
        });
        if (Object.keys(changes).length) {
            ref.updateOptions(changes);
        }
        prevProps = { ...props };
    });
    // onDidDrop
    createEffect(() => {
        const ref = dockviewRef();
        if (!ref)
            return;
        const disposable = ref.onDidDrop((event) => {
            props.onDidDrop?.(event);
        });
        onCleanup(() => disposable.dispose());
    });
    // onWillDrop
    createEffect(() => {
        const ref = dockviewRef();
        if (!ref)
            return;
        const disposable = ref.onWillDrop((event) => {
            props.onWillDrop?.(event);
        });
        onCleanup(() => disposable.dispose());
    });
    // Helpers to update dynamic creators — skips the initial run since
    // factories are already set during start() before onReady fires.
    const update = (_label, updater) => {
        let initialized = false;
        createEffect(() => {
            const ref = dockviewRef();
            if (!ref)
                return;
            if (!initialized) {
                initialized = true;
                return;
            }
            ref.updateOptions(updater(ref));
        });
    };
    update("createComponent", () => ({
        createComponent: (options) => new SolidPanelContentPart(options.id, props.components[options.name], { addPortal }),
    }));
    update("createTabComponent", () => {
        const frameworkTabComponents = props.tabComponents ? { ...props.tabComponents } : {};
        if (props.defaultTabComponent) {
            frameworkTabComponents[DEFAULT_SOLID_TAB] = props.defaultTabComponent;
        }
        return {
            defaultTabComponent: props.defaultTabComponent ? DEFAULT_SOLID_TAB : undefined,
            createTabComponent: (options) => new SolidPanelHeaderPart(options.id, frameworkTabComponents[options.name], { addPortal }),
        };
    });
    update("createWatermarkComponent", () => ({
        createWatermarkComponent: props.watermarkComponent
            ? () => new SolidWatermarkPart("watermark", props.watermarkComponent, { addPortal })
            : undefined,
    }));
    update("createRightHeaderActionComponent", () => ({
        createRightHeaderActionComponent: createGroupControlElement(props.rightHeaderActionsComponent, { addPortal }),
    }));
    update("createLeftHeaderActionComponent", () => ({
        createLeftHeaderActionComponent: createGroupControlElement(props.leftHeaderActionsComponent, { addPortal }),
    }));
    update("createPrefixHeaderActionComponent", () => ({
        createPrefixHeaderActionComponent: createGroupControlElement(props.prefixHeaderActionsComponent, { addPortal }),
    }));
    return (<div ref={(el) => { domRef = el; }} style={{ height: "100%", width: "100%" }}>
      {/* {portals()} */}
    </div>);
}
