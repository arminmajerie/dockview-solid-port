import { createEffect, onCleanup, onMount } from 'solid-js';
import { createSplitview, PROPERTY_KEYS_SPLITVIEW } from "dockview-core";
import { usePortalsLifecycle } from "../solid"; // <-- your Solid version
import { SolidPanelView } from "./view"; // <-- your Solid version
function extractCoreOptions(props) {
    const coreOptions = PROPERTY_KEYS_SPLITVIEW.reduce((obj, key) => {
        if (key in props) {
            obj[key] = props[key];
        }
        return obj;
    }, {});
    return coreOptions;
}
export function SplitviewSolid(props) {
    let domRef;
    let splitviewRef;
    const [portals, addPortal] = usePortalsLifecycle();
    let prevProps = {};
    // Handle SplitviewOptions changes reactively
    createEffect(() => {
        const changes = {};
        PROPERTY_KEYS_SPLITVIEW.forEach((propKey) => {
            // this is always a valid key for SplitviewOptions!
            const key = propKey;
            const propValue = props[key];
            if (key in props && propValue !== prevProps[key]) {
                changes[key] = propValue;
            }
        });
        if (splitviewRef) {
            splitviewRef.updateOptions(changes);
        }
        prevProps = Object.assign({}, props);
    });
    onCleanup(() => {
        splitviewRef === null || splitviewRef === void 0 ? void 0 : splitviewRef.dispose();
        splitviewRef = undefined;
    });
    // Initialization
    onMount(() => {
        if (!domRef)
            return;
        const frameworkOptions = {
            createComponent: (options) => {
                return new SolidPanelView(options.id, options.name, props.components[options.name], { addPortal });
            }
        };
        splitviewRef = createSplitview(domRef, Object.assign(Object.assign({}, extractCoreOptions(props)), frameworkOptions));
        const { clientWidth, clientHeight } = domRef;
        splitviewRef.layout(clientWidth, clientHeight);
        if (props.onReady) {
            props.onReady({ api: splitviewRef });
        }
    });
    // Update createComponent if props.components changes
    createEffect(() => {
        if (!splitviewRef)
            return;
        splitviewRef.updateOptions({
            createComponent: (options) => {
                return new SolidPanelView(options.id, options.name, props.components[options.name], { addPortal });
            }
        });
    });
    return (<div ref={el => domRef = el} style={{ height: "100%", width: "100%" }}>
      {/*{portals()}*/}
    </div>);
}
