// packages/dockview/src/solid.tsx
import { createSignal, JSX, onMount, onCleanup, createContext, Accessor  } from 'solid-js';
import { render } from 'solid-js/web';
import { DockviewIDisposable } from 'dockview-core';

// Context (use if you actually need context passing)
export const SolidPartContext = createContext({});

// SolidPortalStore — stores a list of cleanup disposables, not portals
export interface SolidPortalStore {
  addPortal: (disposeFn: DockviewIDisposable) => DockviewIDisposable;
}

// Main class
export class SolidPart<P extends object = {}, C extends object = {}> {
  private _initialProps: Record<string, any> = {};
  private componentInstance?: { update: (props: Record<string, any>) => void };
  private ref?: DockviewIDisposable;
  private disposed = false;

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
    if (!this.componentInstance) {
      this._initialProps = { ...this._initialProps, ...props };
    } else {
      this.componentInstance.update(props);
    }
  }

  private createPortal() {
    if (this.disposed) throw new Error("already disposed");

    // The core logic: render the component into `parent` (like a Solid portal)
    // Optionally wrap with context
    let cleanup: (() => void) | undefined;

    const ComponentWithContext = () =>
      this.context
        ? (
          <SolidPartContext.Provider value={this.context}>
            {this.component({ ...(this.parameters as any), ...(this._initialProps as any) })}
          </SolidPartContext.Provider>
        )
        : this.component({ ...(this.parameters as any), ...(this._initialProps as any) });

    cleanup = render(ComponentWithContext, this.parent);

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


