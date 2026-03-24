import { createSignal, onCleanup, Show, type JSX } from "solid-js";
import { LogViewer } from "./LogViewer";

export function LogViewerPanel(): JSX.Element {
  let containerRef: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  const [isVisible, setIsVisible] = createSignal(false);
  


  // Helper to log parent chain
  const logParentChain = (element: HTMLElement | null, label: string) => {
    let current = element;
    let depth = 0;
    while (current && depth < 10) {
      const rect = current.getBoundingClientRect();
      const styles = window.getComputedStyle(current);
      current = current.parentElement;
      depth++;
    }
  };

  // Helper to measure and update size
  const measureSize = (source: string) => {
    if (!containerRef) {
      return;
    }
    const rect = containerRef.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(containerRef);
    
    // Update size if we have valid dimensions
    if (rect.width > 0 && rect.height > 0) {
      setSize({ width: rect.width, height: rect.height });
    } else {
      logParentChain(containerRef, "zero-size investigation");
    }
  };

  // Setup observers - called from ref callback when element is available
  const setupObservers = (element: HTMLDivElement) => {
    logParentChain(element, "ref callback setup");

    // ResizeObserver for size changes
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setSize({ width, height });
        }
      }
    });

    // IntersectionObserver to detect when panel becomes visible
    intersectionObserver = new IntersectionObserver(
      (entries) => {

        for (const entry of entries) {

          const wasVisible = isVisible();
          const nowVisible = entry.isIntersecting && entry.intersectionRatio > 0;
          setIsVisible(nowVisible);
          
          // When becoming visible, measure after a frame to let layout settle
          if (nowVisible && !wasVisible) {

            requestAnimationFrame(() => {

              measureSize("IntersectionObserver RAF 1");
              requestAnimationFrame(() => {
                measureSize("IntersectionObserver RAF 2");
              });
            });
          }
        }
      },
      { threshold: [0, 0.01, 0.1] }
    );
    
    resizeObserver.observe(element);
    intersectionObserver.observe(element);

    // Initial measurement
    measureSize("ref callback initial");
    
    // Also try after delays
    setTimeout(() => {
      measureSize("setTimeout 100ms");
    }, 100);
    
    setTimeout(() => {
      measureSize("setTimeout 500ms");
      if (containerRef) logParentChain(containerRef, "after 500ms");
    }, 500);
  };

  // Cleanup observers
  onCleanup(() => {
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
  });

  // Log when size signal changes
  const currentSize = size();

  return (
    <div
      ref={(el) => {
        if (el && !containerRef) {
          containerRef = el;
          // Setup observers NOW - in the ref callback when the element exists
          setupObservers(el);
        }
      }}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        "flex-direction": "column",
        overflow: "hidden",
        "min-height": "0px",
        "box-sizing": "border-box",
      }}
      onClick={() => {
        measureSize("click event");
      }}
    >
      {(() => {
        const s = size();
        return null;
      })()}
      <Show when={size().height > 0} fallback={
        <div style={{ flex: 1, padding: "10px" }}>
          <div style={{ color: "#7a7f96", "font-size": "12px" }}>
            Log viewer loading...
          </div>
        </div>
      }>
        <LogViewer height={size().height} />
      </Show>
    </div>
  );
}
