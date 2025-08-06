import { createEffect, onCleanup, onMount } from 'solid-js';
import { createPaneview, PROPERTY_KEYS_PANEVIEW } from 'dockview-core';
import { usePortalsLifecycle } from '../solid';
import { PanePanelSection } from './view';
function extractCoreOptions(props) {
    const coreOptions = PROPERTY_KEYS_PANEVIEW.reduce((obj, key) => {
        if (key in props) {
            obj[key] = props[key];
        }
        return obj;
    }, {});
    return coreOptions;
}
export function PaneviewSolid(props) {
    let domRef;
    let paneviewRef;
    const [portals, addPortal] = usePortalsLifecycle();
    let prevProps = {};
    // Handle options changes reactively
    createEffect(() => {
        const changes = {};
        PROPERTY_KEYS_PANEVIEW.forEach((propKey) => {
            if (propKey in props) {
                // Only apply keys that exist in PaneviewOptions!
                changes[propKey] = props[propKey];
            }
        });
        if (paneviewRef) {
            paneviewRef.updateOptions(changes);
        }
        prevProps = Object.assign({}, props);
    });
    // Initial mount: create Paneview instance and panels
    onMount(() => {
        var _a;
        if (!domRef)
            return;
        const headerComponents = (_a = props.headerComponents) !== null && _a !== void 0 ? _a : {};
        const frameworkOptions = {
            createComponent: (options) => {
                return new PanePanelSection(options.id, props.components[options.name], { addPortal });
            },
            createHeaderComponent: (options) => {
                return new PanePanelSection(options.id, headerComponents[options.name], { addPortal });
            },
        };
        const api = createPaneview(domRef, Object.assign(Object.assign({}, extractCoreOptions(props)), frameworkOptions));
        api.layout(domRef.clientWidth, domRef.clientHeight);
        if (props.onReady) {
            props.onReady({ api });
        }
        paneviewRef = api;
        onCleanup(() => {
            paneviewRef = undefined;
            api.dispose();
        });
    });
    // Watch for components prop changes
    createEffect(() => {
        if (!paneviewRef)
            return;
        paneviewRef.updateOptions({
            createComponent: (options) => {
                return new PanePanelSection(options.id, props.components[options.name], { addPortal });
            },
        });
    });
    // Watch for headerComponents prop changes
    createEffect(() => {
        var _a;
        if (!paneviewRef)
            return;
        const headerComponents = (_a = props.headerComponents) !== null && _a !== void 0 ? _a : {};
        paneviewRef.updateOptions({
            createHeaderComponent: (options) => {
                return new PanePanelSection(options.id, headerComponents[options.name], { addPortal });
            },
        });
    });
    // Listen for onDidDrop event
    createEffect(() => {
        if (!paneviewRef)
            return;
        const disposable = paneviewRef.onDidDrop((event) => {
            if (props.onDidDrop)
                props.onDidDrop(event);
        });
        onCleanup(() => disposable.dispose());
    });
    return (<div style={{ height: '100%', width: '100%' }} ref={el => domRef = el}>
      {/*{portals()}*/}
    </div>);
}
