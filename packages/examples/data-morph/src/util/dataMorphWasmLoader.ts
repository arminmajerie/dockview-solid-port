export type DataMorphWasmEnvelope<T> =
  | { ok: true; value: T; context?: unknown }
  | { ok: false; error: string };

export type DataMorphWasmExports = {
  default?: (moduleOrPath?: unknown) => Promise<unknown>;

  evaluate_script: (script: string, contextJson: string) => string;
  evaluate_with_scope: (script: string, contextJson: string) => string;
  validate_script: (script: string) => string;
  definitions_with_scope_d: (contextJson: string) => string;
  fn_metadata_json: (includeStandardPackages: boolean) => string;
  register_log_callback?: (callback: (line: string) => void) => void;
  register_module?: (modulePath: string, source: string) => string;
  clear_modules?: () => string;
  unregister_module?: (modulePath: string) => string;
  clear_module_cache?: () => string;
};

let cachedWasm: Promise<DataMorphWasmExports | null> | null = null;
let didLogLoadError = false;

export async function loadDataMorphWasm(): Promise<DataMorphWasmExports | null> {
  if (!cachedWasm) {
    cachedWasm = (async () => {
      try {
        // 0&&console['log']('[DataMorphWasm] Starting WASM module import...');
        const mod = (await import('data-morph-wasm')) as unknown as DataMorphWasmExports;
        // 0&&console['log']('[DataMorphWasm] Module imported, exports:', Object.keys(mod));
        
        if (typeof mod.default === 'function') {
          // 0&&console['log']('[DataMorphWasm] Initializing WASM module via default()...');
          try {
            await mod.default();
          } catch (error) {
            console.error('[DataMorphWasm] default() init failed:', error);
            return null;
          }
          // 0&&console['log']('[DataMorphWasm] WASM module initialized successfully');
        } else {
          // 0&&console['log']('[DataMorphWasm] No default init function found');
        }
        
        // Verify evaluate_script exists
        if (typeof mod.evaluate_script !== 'function') {
          console.error('[DataMorphWasm] evaluate_script is not a function!', typeof mod.evaluate_script, 'exports:', Object.keys(mod));
          return null;
        }
        
        // 0&&console['log']('[DataMorphWasm] Module ready with evaluate_script');
        return mod;
      } catch (error) {
        if (!didLogLoadError) {
          didLogLoadError = true;
          console.error('[DataMorphWasm] Failed to load wasm module.', error);
        }
        return null;
      }
    })();
  }

  return cachedWasm;
}

export function parseWasmEnvelope<T>(json: string): DataMorphWasmEnvelope<T> {
  try {
    return JSON.parse(json) as DataMorphWasmEnvelope<T>;
  } catch (error) {
    return { ok: false, error: `[DataMorphWasm] Invalid JSON from wasm: ${String(error)}` };
  }
}
