// packages/dockview/src/solid.tsx
import { createSignal, JSX, createContext, Accessor } from 'solid-js';
import { render } from 'solid-js/web';
import { DockviewIDisposable } from '@arminmajerie/dockview-core';

// Context (use if you actually need context passing)
export const SolidPartContext = createContext({});

// SolidPortalStore — stores a list of cleanup disposables, not portals
export interface SolidPortalStore {
  addPortal: (disposeFn: DockviewIDisposable) => DockviewIDisposable;
}

// Main class.
// Uses a signal + plain object spread so components always receive a POJO
// (no Proxy). This is critical because SUID and other libraries crash when
// they receive a SolidJS Store or mergeProps Proxy as their props object.
// When update() is called, the signal bumps a version counter which causes
// the component wrapper to re-execute, spreading a fresh POJO.
export class SolidPart<P extends object = {}, C extends object = {}> {
  private ref?: DockviewIDisposable;
  private disposed = false;
  /** Accumulated prop overrides from update() calls */
  private overrides: Record<string, any> = {};
  /** Signal to trigger re-render when overrides change */
  private triggerUpdate?: (v: number) => void;
  private version = 0;

  constructor(
    private readonly parent: HTMLElement,
    private readonly portalStore: SolidPortalStore,
    private readonly component: (props: P) => JSX.Element,
    private readonly parameters: P,
    private readonly context?: C
  ) {
    this.createPortal();
  }

  public update(props: Record<string, any>) {
    if (this.disposed) {
      throw new Error("invalid operation: resource is already disposed");
    }
    // Merge into overrides, then bump the signal to trigger re-render
    Object.assign(this.overrides, props);
    this.version++;
    this.triggerUpdate?.(this.version);
  }

  private createPortal() {
    if (this.disposed) throw new Error("already disposed");

    let cleanup: (() => void) | undefined;

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
      // Return a FUNCTION so SolidJS treats it as a dynamic expression.
      // SolidJS will wrap this in a reactive effect, re-executing it
      // whenever the signals read inside change (i.e. when version bumps).
      // Previously we read version() in the component body, but component
      // functions only run ONCE — SolidJS doesn't re-call them.
      const dynamic = () => {
        const v = version();
        const plainProps = { ...(baseParams as any), ...overridesRef } as P;
        const result = Comp(plainProps);
        return result;
      };
      return ctx
        ? (
          <SolidPartContext.Provider value={ctx}>
            {dynamic as unknown as JSX.Element}
          </SolidPartContext.Provider>
        )
        : dynamic as unknown as JSX.Element;
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

  public dispose() {
    this.ref?.dispose();
    this.disposed = true;
  }
}

// The type for your lifecycle hook in SolidJS
type PortalLifecycleHook = () => [
  Accessor<DockviewIDisposable[]>,
  (cleanup: DockviewIDisposable) => DockviewIDisposable
];

/**
 * A React Hook that returns an array of portals to be rendered by the user of this hook
 * and a disposable function to add a portal. Calling dispose removes this portal from the
 * portal array
 */
export const usePortalsLifecycle: PortalLifecycleHook = () => {
  const [portals, setPortals] = createSignal<DockviewIDisposable[]>([]);

  const addPortal = (cleanup: DockviewIDisposable) => {
    setPortals(existing => [...existing, cleanup]);
    let disposed = false;
    return {
      dispose() {
        if (disposed) throw new Error("invalid operation: resource already disposed");
        disposed = true;
        setPortals(existing => existing.filter(p => p !== cleanup));
        cleanup.dispose();
      }
    } as DockviewIDisposable;
  };

  return [portals, addPortal];
};


