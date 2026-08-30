// packages/dockview/src/solid.tsx
import { createSignal, createContext } from 'solid-js';
import { render } from 'solid-js/web';
// Context (use if you actually need context passing)
export const SolidPartContext = createContext({});
// Main class.
// Uses a signal + plain object spread so components always receive a POJO
// (no Proxy). This is critical because SUID and other libraries crash when
// they receive a SolidJS Store or mergeProps Proxy as their props object.
// When update() is called, the signal bumps a version counter which causes
// the component wrapper to re-execute, spreading a fresh POJO.
export class SolidPart {
    parent;
    portalStore;
    component;
    parameters;
    context;
    ref;
    disposed = false;
    /** Accumulated prop overrides from update() calls */
    overrides = {};
    /** Signal to trigger re-render when overrides change */
    triggerUpdate;
    version = 0;
    constructor(parent, portalStore, component, parameters, context) {
        this.parent = parent;
        this.portalStore = portalStore;
        this.component = component;
        this.parameters = parameters;
        this.context = context;
        this.createPortal();
    }
    update(props) {
        if (this.disposed) {
            throw new Error("invalid operation: resource is already disposed");
        }
        // Merge into overrides, then bump the signal to trigger re-render
        Object.assign(this.overrides, props);
        this.version++;
        this.triggerUpdate?.(this.version);
    }
    createPortal() {
        if (this.disposed)
            throw new Error("already disposed");
        let cleanup;
        // Version signal — reading it inside the component creates a dependency.
        // When update() bumps it, SolidJS re-runs the component function.
        const [version, setVersion] = createSignal(0);
        this.triggerUpdate = setVersion;
        const baseParams = this.parameters;
        const overridesRef = this.overrides;
        const Comp = this.component;
        const ctx = this.context;
        const parentEl = this.parent;
        const ComponentWithContext = () => {
            const dynamic = () => {
                version();
                const plainProps = { ...baseParams, ...overridesRef };
                return Comp(plainProps);
            };
            return ctx
                ? (<SolidPartContext.Provider value={ctx}>
            {dynamic}
          </SolidPartContext.Provider>)
                : dynamic;
        };
        cleanup = render(ComponentWithContext, parentEl);
        // Save for disposal
        this.ref = this.portalStore.addPortal({
            dispose: () => {
                cleanup?.();
                this.disposed = true;
            },
        });
    }
    dispose() {
        this.ref?.dispose();
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
