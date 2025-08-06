import { PROPERTY_KEYS_DOCKVIEW, createDockview, } from 'dockview-core';
import { SolidPanelContentPart } from './solidContentPart';
import { SolidPanelHeaderPart } from './solidHeaderPart';
import { usePortalsLifecycle } from '../solid';
import { SolidWatermarkPart } from './solidWatermarkPart';
import { SolidHeaderActionsRendererPart } from './headerActionsRenderer';
import { createEffect, onCleanup } from 'solid-js';
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
    console.log("[DockviewSolid] Rendered with props:", props);
    let domRef;
    let dockviewRef;
    const [portals, addPortal] = usePortalsLifecycle();
    let prevProps = {};
    createEffect(() => {
        const changes = {};
        console.log("[DockviewSolid] Effect ran", props);
        PROPERTY_KEYS_DOCKVIEW.forEach((propKey) => {
            // Only assign keys that are valid DockviewOptions keys
            if (propKey in props) {
                const key = propKey;
                const propValue = props[key];
                // Only assign if changed
                if (propValue !== prevProps[key]) {
                    changes[key] = propValue;
                }
            }
        });
        if (dockviewRef) {
            dockviewRef.updateOptions(changes);
        }
        prevProps = Object.assign({}, props);
    });
    // Main Dockview create/destroy
    createEffect(() => {
        var _a;
        if (!domRef)
            return;
        const frameworkTabComponents = (_a = props.tabComponents) !== null && _a !== void 0 ? _a : {};
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
                return new SolidPanelHeaderPart(options.id, frameworkTabComponents[options.name], { addPortal });
            },
            createWatermarkComponent: props.watermarkComponent
                ? () => {
                    return new SolidWatermarkPart("watermark", props.watermarkComponent, { addPortal });
                }
                : undefined,
            defaultTabComponent: props.defaultTabComponent
                ? DEFAULT_SOLID_TAB
                : undefined,
        };
        const api = createDockview(domRef, Object.assign(Object.assign({}, extractCoreOptions(props)), frameworkOptions));
        const { clientWidth, clientHeight } = domRef;
        api.layout(clientWidth, clientHeight);
        if (props.onReady) {
            props.onReady({ api });
        }
        dockviewRef = api;
        onCleanup(() => {
            dockviewRef = undefined;
            api.dispose();
        });
    });
    // Effects for event subscriptions
    createEffect(() => {
        if (!dockviewRef)
            return;
        const disposable = dockviewRef.onDidDrop((event) => {
            var _a;
            (_a = props.onDidDrop) === null || _a === void 0 ? void 0 : _a.call(props, event);
        });
        onCleanup(() => disposable.dispose());
    });
    createEffect(() => {
        if (!dockviewRef)
            return;
        const disposable = dockviewRef.onWillDrop((event) => {
            var _a;
            (_a = props.onWillDrop) === null || _a === void 0 ? void 0 : _a.call(props, event);
        });
        onCleanup(() => disposable.dispose());
    });
    // Effects for dynamic option updates
    createEffect(() => {
        if (!dockviewRef)
            return;
        dockviewRef.updateOptions({
            createComponent: (options) => {
                return new SolidPanelContentPart(options.id, props.components[options.name], { addPortal });
            },
        });
    });
    createEffect(() => {
        var _a;
        if (!dockviewRef)
            return;
        const frameworkTabComponents = (_a = props.tabComponents) !== null && _a !== void 0 ? _a : {};
        if (props.defaultTabComponent) {
            frameworkTabComponents[DEFAULT_SOLID_TAB] = props.defaultTabComponent;
        }
        dockviewRef.updateOptions({
            defaultTabComponent: props.defaultTabComponent
                ? DEFAULT_SOLID_TAB
                : undefined,
            createTabComponent: (options) => {
                return new SolidPanelHeaderPart(options.id, frameworkTabComponents[options.name], { addPortal });
            },
        });
    });
    createEffect(() => {
        if (!dockviewRef)
            return;
        dockviewRef.updateOptions({
            createWatermarkComponent: props.watermarkComponent
                ? () => {
                    return new SolidWatermarkPart("watermark", props.watermarkComponent, { addPortal });
                }
                : undefined,
        });
    });
    createEffect(() => {
        if (!dockviewRef)
            return;
        dockviewRef.updateOptions({
            createRightHeaderActionComponent: createGroupControlElement(props.rightHeaderActionsComponent, { addPortal }),
        });
    });
    createEffect(() => {
        if (!dockviewRef)
            return;
        dockviewRef.updateOptions({
            createLeftHeaderActionComponent: createGroupControlElement(props.leftHeaderActionsComponent, { addPortal }),
        });
    });
    createEffect(() => {
        if (!dockviewRef)
            return;
        dockviewRef.updateOptions({
            createPrefixHeaderActionComponent: createGroupControlElement(props.prefixHeaderActionsComponent, { addPortal }),
        });
    });
    return (<div ref={domRef} style={{ height: "100%", width: "100%" }}>
      {/* {portals()} is not return in solid.js */}

    </div>);
}
