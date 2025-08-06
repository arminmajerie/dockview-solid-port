// packages/dockview/src/solid.tsx
import { createSignal, onMount, createContext } from 'solid-js';
import { Dynamic, render } from 'solid-js/web';
// Component
export function SolidComponentBridge(props) {
    const [currentProps, setCurrentProps] = createSignal(props.componentProps);
    onMount(() => {
        if (props.ref) {
            props.ref({
                update: (newProps) => {
                    setCurrentProps(prev => (Object.assign(Object.assign({}, prev), newProps)));
                }
            });
        }
    });
    // @ts-ignore
    return <Dynamic component={props.component} {...props.componentProps}/>;
}
/**
 * Since we are storing the React.Portal references in a rendered array they
 * require a key property like any other React element rendered in an array
 * to prevent excessive re-rendering
 */
const uniquePortalKeyGenerator = (() => {
    let value = 1;
    return { next: () => `dockview_solid_portal_key_${(value++).toString()}` };
})();
// Context (use if you actually need context passing)
export const SolidPartContext = createContext({});
// Main class
export class SolidPart {
    constructor(parent, portalStore, component, parameters, context) {
        this.parent = parent;
        this.portalStore = portalStore;
        this.component = component;
        this.parameters = parameters;
        this.context = context;
        this._initialProps = {};
        this.disposed = false;
        this.createPortal();
    }
    update(props) {
        if (this.disposed) {
            throw new Error("invalid operation: resource is already disposed");
        }
        if (!this.componentInstance) {
            this._initialProps = Object.assign(Object.assign({}, this._initialProps), props);
        }
        else {
            this.componentInstance.update(props);
        }
    }
    createPortal() {
        if (this.disposed)
            throw new Error("already disposed");
        // The core logic: render the component into `parent` (like a Solid portal)
        // Optionally wrap with context
        let cleanup;
        const ComponentWithContext = () => this.context
            ? (<SolidPartContext.Provider value={this.context}>
            {this.component(Object.assign(Object.assign({}, this.parameters), this._initialProps))}
          </SolidPartContext.Provider>)
            : this.component(Object.assign(Object.assign({}, this.parameters), this._initialProps));
        cleanup = render(ComponentWithContext, this.parent);
        // Save for disposal
        this.ref = this.portalStore.addPortal({
            dispose: () => {
                cleanup === null || cleanup === void 0 ? void 0 : cleanup();
                this.disposed = true;
            },
        });
    }
    dispose() {
        var _a;
        (_a = this.ref) === null || _a === void 0 ? void 0 : _a.dispose();
        this.disposed = true;
    }
}
/**
 * A React Hook that returns an array of portals to be rendered by the user of this hook
 * and a disposable function to add a portal. Calling dispose removes this portal from the
 * portal array
 */
export const usePortalsLifecycle = () => {
    const [portals, setPortals] = createSignal([]);
    const addPortal = (cleanup) => {
        setPortals(existing => [...existing, cleanup]);
        let disposed = false;
        return {
            dispose() {
                if (disposed)
                    throw new Error("invalid operation: resource already disposed");
                disposed = true;
                setPortals(existing => existing.filter(p => p !== cleanup));
                cleanup.dispose();
            }
        };
    };
    return [portals, addPortal];
};
export function isSolidComponent(component) {
    return typeof component === "function";
}
