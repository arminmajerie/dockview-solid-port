import { createGridview, PROPERTY_KEYS_GRIDVIEW, } from 'dockview-core';
import { SolidGridPanelView } from './view';
import { usePortalsLifecycle } from '../solid';
import { createEffect, onCleanup } from 'solid-js';
function extractCoreOptions(props) {
    const coreOptions = PROPERTY_KEYS_GRIDVIEW.reduce((obj, key) => {
        if (key in props) {
            obj[key] = props[key];
        }
        return obj;
    }, {});
    return coreOptions;
}
export function GridviewSolid(props) {
    let domRef;
    let gridviewRef;
    const [portals, addPortal] = usePortalsLifecycle();
    let prevProps = {};
    // Handle GridviewOptions changes reactively
    createEffect(() => {
        const changes = {};
        PROPERTY_KEYS_GRIDVIEW.forEach((propKey) => {
            // Check key exists in GridviewOptions
            if (propKey in {}) {
                const key = propKey;
                const propValue = props[key];
                if (propValue !== prevProps[key]) {
                    changes[key] = propValue;
                }
            }
        });
        if (gridviewRef) {
            gridviewRef.updateOptions(changes);
        }
        prevProps = Object.assign({}, props);
    });
    // One-time gridview creation/cleanup
    onCleanup(() => {
        if (gridviewRef) {
            gridviewRef.dispose();
            gridviewRef = undefined;
        }
    });
    createEffect(() => {
        if (!domRef)
            return;
        const frameworkOptions = {
            createComponent: (options) => {
                return new SolidGridPanelView(options.id, options.name, props.components[options.name], { addPortal });
            },
        };
        const api = createGridview(domRef, Object.assign(Object.assign({}, extractCoreOptions(props)), frameworkOptions));
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
        if (!gridviewRef)
            return;
        gridviewRef.updateOptions({
            createComponent: (options) => {
                return new SolidGridPanelView(options.id, options.name, props.components[options.name], { addPortal });
            },
        });
    });
    return (<div ref={domRef} style={{ height: "100%", width: "100%" }}>
      {/* Do NOT render portals here—they are not JSX elements */}
    </div>);
}
