import { onCleanup, onMount, createEffect, type JSX } from 'solid-js';
import {
  EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  drawSelection, keymap, tooltips,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  closeBrackets, closeBracketsKeymap,
  autocompletion, type CompletionContext, type CompletionResult, type Completion,
  snippetCompletion,
} from '@codemirror/autocomplete';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { dataMorphLanguage } from './DataMorphLanguage';
import { loadDataMorphWasm, parseWasmEnvelope } from '../util/dataMorphWasmLoader';
import { attachDockviewDropGuard } from './dockviewDropGuard';

// ─── Types ───────────────────────────────────────────────────────────────────

type DataMorphContext = {
  payloadFormat?: string;
  payload?: unknown;
  attributes?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  error?: unknown;
  [key: string]: unknown;
};

interface FunctionMetadata {
  name: string;
  signature?: string;
  description?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getValueAtPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;
  for (const seg of path) {
    if (Array.isArray(current)) {
      const idx = parseInt(seg, 10);
      if (isNaN(idx)) return undefined;
      current = current[idx];
    } else if (isPlainObject(current)) {
      current = current[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

// Parse "a.b.c[0].d[1]" → ["a","b","c","0","d","1"]
function parseDotChain(chain: string): string[] {
  const segments: string[] = [];
  const re = /([A-Za-z_]\w*)|(\d+)(?=\])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chain)) !== null) {
    segments.push(m[1] ?? m[2]);
  }
  return segments;
}

// ─── XML payload → completion object ─────────────────────────────────────────

function xmlNodeToValue(el: Element): unknown {
  const children = Array.from(el.children);
  if (children.length === 0) return el.textContent ?? '';
  const result: Record<string, unknown> = {};
  const groups: Record<string, Element[]> = {};
  for (const child of children) {
    if (!groups[child.tagName]) groups[child.tagName] = [];
    groups[child.tagName].push(child);
  }
  for (const [tag, els] of Object.entries(groups)) {
    result[tag] = els.length === 1 ? xmlNodeToValue(els[0]) : els.map(xmlNodeToValue);
  }
  return result;
}

function xmlToCompletionObject(xmlStr: string): Record<string, unknown> | null {
  try {
    const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
    if (doc.querySelector('parsererror')) return null;
    const root = doc.documentElement;
    if (!root) return null;
    return { [root.tagName]: xmlNodeToValue(root) };
  } catch {
    return null;
  }
}

// ─── WASM Function Metadata ───────────────────────────────────────────────────

let cachedFnMetadata: Promise<FunctionMetadata[]> | null = null;

function getFnMetadata(): Promise<FunctionMetadata[]> {
  if (!cachedFnMetadata) {
    cachedFnMetadata = (async () => {
      try {
        const wasm = await loadDataMorphWasm();
        if (!wasm) return [];
        const env = parseWasmEnvelope<string>(wasm.fn_metadata_json(true));
        if (env.ok === false) return [];
        let parsed: unknown;
        try { parsed = JSON.parse(env.value); } catch { return []; }
        const out: FunctionMetadata[] = [];
        const visitedObjs = new WeakSet<object>();
        const seenNames = new Set<string>();
        const walk = (node: unknown) => {
          if (!node || typeof node !== 'object') return;
          if (visitedObjs.has(node as object)) return;
          visitedObjs.add(node as object);
          if (Array.isArray(node)) { node.forEach(walk); return; }
          const obj = node as Record<string, unknown>;
          if (typeof obj.name === 'string' && /^[A-Za-z_]\w*$/.test(obj.name) && !seenNames.has(obj.name)) {
            seenNames.add(obj.name);
            out.push({ name: obj.name, signature: obj.signature as string | undefined, description: obj.description as string | undefined });
          }
          Object.values(obj).forEach(walk);
        };
        walk(parsed);
        return out;
      } catch {
        return [];
      }
    })();
  }
  return cachedFnMetadata;
}

// ─── Completion Data ──────────────────────────────────────────────────────────
// CodeMirror snippets use #{field} syntax — fields with same name are linked.

const COMMON_COMPLETIONS: { label: string; snippet?: string; detail?: string; info?: string }[] = [
  { label: 'map',          snippet: 'map ((#{item}, #{index}) -> #{result})',                                    detail: '<Array<T>, (T,N)->R> -> Array<R>',  info: 'Transform each element of an array' },
  { label: 'filter',       snippet: 'filter ((#{item}, #{index}) -> #{criteria})',                               detail: '<Array<T>, (T,N)->Bool> -> Array<T>', info: 'Keep elements matching the criteria' },
  { label: 'reduce',       snippet: 'reduce ((#{accumulator}, #{item}) -> #{accumulator}, #{initial})',          detail: '<Array<T>, (A,T)->A, A> -> A',        info: 'Reduce array to a single value. #{accumulator} is linked.' },
  { label: 'flatMap',      snippet: 'flatMap ((#{item}, #{index}) -> #{array})',                                 detail: '<Array<T>, (T,N)->Array<R>> -> Array<R>', info: 'Map then flatten' },
  { label: 'groupBy',      snippet: 'groupBy ((#{item}) -> #{key})',                                             detail: '<Array<T>, (T)->K> -> Object<K,Array<T>>', info: 'Group array items by a key' },
  { label: 'orderBy',      snippet: 'orderBy ((#{item}) -> #{key})',                                             detail: '<Array<T>, (T)->Any> -> Array<T>',    info: 'Sort array items by a criteria' },
  { label: 'distinctBy',   snippet: 'distinctBy ((#{item}) -> #{key})',                                          detail: '<Array<T>, (T)->K> -> Array<T>',      info: 'Return unique items based on a criteria' },
  { label: 'mapObject',    snippet: 'mapObject ((#{value}, #{key}, #{index}) -> { (#{key}): #{value} })',        detail: '<Object, (V,K,N)->Object> -> Object',  info: 'Map over object key-value pairs. #{key} and #{value} are linked.' },
  { label: 'filterObject', snippet: 'filterObject ((#{value}, #{key}) -> #{expr})',                              detail: '<Object, (V,K)->Bool> -> Object',      info: 'Filter object entries by criteria' },
  { label: 'pluck',        snippet: 'pluck "#{key}"',                                                           detail: '<Object, Array<String>> -> Object',    info: 'Select specified keys from an object' },
  { label: 'flatten',      detail: 'Array<Array<T>> -> Array<T>',                                               info: 'Flatten nested arrays into a single array' },
  { label: 'sizeOf',       snippet: 'sizeOf(#{value})',                                                         detail: 'Array|Object|String -> Number',        info: 'Returns the size/length of a value' },
  { label: 'typeOf',       snippet: 'typeOf(#{value})',                                                         detail: 'Any -> String',                        info: 'Returns the type name of a value' },
  { label: 'isEmpty',      snippet: 'isEmpty(#{value})',                                                        detail: 'Any -> Boolean',                       info: 'Returns true if value is empty' },
  { label: 'isBlank',      snippet: 'isBlank(#{value})',                                                        detail: 'String -> Boolean',                    info: 'Returns true if string is blank' },
  { label: 'contains',     snippet: 'contains(#{container}, #{item})',                                          detail: 'Array|String, Any -> Boolean',         info: 'Checks if container includes the item' },
  { label: 'startsWith',   snippet: 'startsWith(#{text}, #{prefix})',                                           detail: 'String, String -> Boolean',            info: 'Checks if string starts with prefix' },
  { label: 'endsWith',     snippet: 'endsWith(#{text}, #{suffix})',                                             detail: 'String, String -> Boolean',            info: 'Checks if string ends with suffix' },
  { label: 'matches',      snippet: 'matches(#{text}, /#{pattern}/)',                                           detail: 'String, Regex -> Boolean',             info: 'Tests if string matches regex' },
  { label: 'replace',      snippet: 'replace(#{text}, #{search}, #{replacement})',                              detail: 'String, String|Regex, String -> String', info: 'Replaces occurrences in string' },
  { label: 'trim',         snippet: 'trim(#{text})',                                                            detail: 'String -> String',                     info: 'Removes leading/trailing whitespace' },
  { label: 'upper',        snippet: 'upper(#{text})',                                                           detail: 'String -> String',                     info: 'Converts string to uppercase' },
  { label: 'lower',        snippet: 'lower(#{text})',                                                           detail: 'String -> String',                     info: 'Converts string to lowercase' },
  { label: 'capitalize',   snippet: 'capitalize(#{text})',                                                      detail: 'String -> String',                     info: 'Capitalizes first letter' },
  { label: 'splitBy',      snippet: 'splitBy(#{text}, "#{separator}")',                                         detail: 'String, String|Regex -> Array<String>', info: 'Splits string into array' },
  { label: 'joinBy',       snippet: 'joinBy(#{items}, "#{separator}")',                                         detail: 'Array<String>, String -> String',      info: 'Joins array into string' },
  { label: 'now',          snippet: 'now()',                                                                    detail: '() -> DateTime',                       info: 'Returns current date and time' },
  { label: 'uuid',         snippet: 'uuid()',                                                                   detail: '() -> String',                         info: 'Generates a random UUID' },
  { label: 'random',       snippet: 'random(#{max})',                                                           detail: 'Number? -> Number',                    info: 'Returns a random number' },
  { label: 'log',          snippet: 'log(#{value}, "#{message}")',                                              detail: 'Any, String? -> Any',                  info: 'Logs value and returns it' },
  { label: 'read',         snippet: 'read(#{content}, "application/json")',                                     detail: 'String, String -> Any',                info: 'Parses content with specified mime type' },
  { label: 'write',        snippet: 'write(#{value}, "application/json")',                                      detail: 'Any, String -> String',                info: 'Serializes value to specified format' },
  { label: 'maxBy',        snippet: 'maxBy ((#{item}) -> #{key})',                                              detail: '<Array<T>, (T)->N> -> T',              info: 'Returns the item with the maximum value' },
  { label: 'minBy',        snippet: 'minBy ((#{item}) -> #{key})',                                              detail: '<Array<T>, (T)->N> -> T',              info: 'Returns the item with the minimum value' },
  { label: 'sumBy',        snippet: 'sumBy ((#{item}) -> #{value})',                                            detail: '<Array<T>, (T)->N> -> Number',         info: 'Sums values from array items' },
  { label: 'entriesOf',    snippet: 'entriesOf(#{object})',                                                     detail: 'Object -> Array<{key,value,attributes}>', info: 'Returns array of key-value-attribute entries' },
  { label: 'keysOf',       snippet: 'keysOf(#{object})',                                                        detail: 'Object -> Array<String>',              info: 'Returns array of object keys' },
  { label: 'valuesOf',     snippet: 'valuesOf(#{object})',                                                      detail: 'Object -> Array<Any>',                 info: 'Returns array of object values' },
  { label: 'first',        detail: 'Array<T> -> T|Null',                                                       info: 'Returns the first item or null' },
  { label: 'last',         detail: 'Array<T> -> T|Null',                                                       info: 'Returns the last item or null' },
];

const KEYWORD_COMPLETIONS: { label: string; snippet?: string; detail?: string }[] = [
  { label: 'match',     snippet: 'match {\n\tcase is #{Type} -> #{result}\n\telse -> #{default}\n}',           detail: 'Pattern matching' },
  { label: 'if',        snippet: 'if (#{condition}) #{then} else #{else}',                                     detail: 'Conditional expression' },
  { label: 'var',       snippet: 'var #{name} = #{value}',                                                     detail: 'Variable declaration' },
  { label: 'fun',       snippet: 'fun #{name}(#{args}) = #{body}',                                             detail: 'Function declaration' },
  { label: 'output',    snippet: 'output application/#{json}',                                                  detail: 'Output directive' },
  { label: 'input',     snippet: 'input #{payload} application/#{format}',                                     detail: 'Input directive' },
  { label: 'import' },
  { label: 'from' },
  { label: 'as' },
  { label: 'else' },
  { label: 'case' },
  { label: 'default' },
  { label: 'do' },
  { label: 'using' },
  { label: 'is' },
  { label: 'not' },
  { label: 'and' },
  { label: 'or' },
  { label: 'true' },
  { label: 'false' },
  { label: 'null' },
];

// ─── Type-string to detail helper ────────────────────────────────────────────

function generateTypeString(value: unknown, depth = 0): string {
  if (value === null || value === undefined) return 'Null';
  if (typeof value === 'string') return value.length <= 20 ? `"${value}"` : 'String';
  if (typeof value === 'number') return 'Number';
  if (typeof value === 'boolean') return 'Boolean';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Array<Any>';
    if (depth >= 2) return 'Array<...>';
    return `Array<${generateTypeString(value[0], depth + 1)}>`;
  }
  if (isPlainObject(value)) {
    if (depth >= 2) return '{| ... |}';
    const keys = Object.keys(value);
    if (keys.length === 0) return '{||}';
    const shown = keys.slice(0, 3).map(k => `${k}: ${generateTypeString(value[k], depth + 1)}`);
    return `{| ${shown.join(', ')}${keys.length > 3 ? ', ...' : ''} |}`;
  }
  return 'Any';
}

// ─── Completion source ────────────────────────────────────────────────────────

function buildCompletionSource(getContext: () => DataMorphContext) {
  // Build static completions once
  const functionOptions: Completion[] = COMMON_COMPLETIONS.map(fn =>
    fn.snippet
      ? snippetCompletion(fn.snippet, { label: fn.label, type: 'function', detail: fn.detail, info: fn.info })
      : { label: fn.label, type: 'function', detail: fn.detail, info: fn.info }
  );

  const keywordOptions: Completion[] = KEYWORD_COMPLETIONS.map(kw =>
    kw.snippet
      ? snippetCompletion(kw.snippet, { label: kw.label, type: 'keyword', detail: kw.detail })
      : { label: kw.label, type: 'keyword', detail: kw.detail }
  );

  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const line = context.state.doc.lineAt(context.pos);
    const textBefore = line.text.slice(0, context.pos - line.from);
    const ctx = getContext();

    // ── Property completion after dot: `payload.someKey.` `payload.arr[0].` ──
    const dotMatch = textBefore.match(/([A-Za-z_][\w]*(?:(?:\.[A-Za-z_][\w]*|\[\d+\])*))\.$/);
    if (dotMatch) {
      const allSegs = parseDotChain(dotMatch[1]);
      const [root, ...path] = allSegs;
      let rootVal: unknown =
        root === 'payload'    ? ctx.payload
        : root === 'attributes' ? ctx.attributes
        : root === 'vars'       ? ctx.variables
        : root === 'error'      ? ctx.error
        : ctx[root];
      // For XML payloads the raw string won't satisfy isPlainObject — convert it.
      if (root === 'payload' && typeof rootVal === 'string') {
        const fmt = (ctx.payloadFormat as string | undefined)?.toUpperCase();
        if (fmt === 'XML') rootVal = xmlToCompletionObject(rootVal) ?? rootVal;
      }
      const target = getValueAtPath(rootVal, path);
      if (isPlainObject(target)) {
        const options: Completion[] = Object.keys(target).map(key => ({
          label: key,
          type: 'property',
          detail: generateTypeString((target as Record<string, unknown>)[key]),
          info: `Value: ${JSON.stringify((target as Record<string, unknown>)[key], null, 2).slice(0, 100)}`,
        }));
        return { from: context.pos, options };
      }
      return null;
    }

    // ── General word completion ──
    const word = context.matchBefore(/[A-Za-z_][\w]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    const ctx_vars: Completion[] = [
      { label: 'payload',    type: 'variable', detail: generateTypeString(ctx.payload),    info: 'The input payload' },
      { label: 'attributes', type: 'variable', detail: generateTypeString(ctx.attributes), info: 'Message attributes' },
      { label: 'vars',       type: 'variable', detail: generateTypeString(ctx.variables),  info: 'Flow variables' },
      { label: 'error',      type: 'variable', detail: generateTypeString(ctx.error),      info: 'Error information' },
    ];
    // Extra context variables (e.g. correlationId)
    for (const key of Object.keys(ctx)) {
      if (!['payload', 'attributes', 'variables', 'error', 'payloadFormat'].includes(key)) {
        ctx_vars.push({ label: key, type: 'variable', detail: generateTypeString(ctx[key]), info: `Context variable: ${key}` });
      }
    }

    return {
      from: word.from,
      options: [...ctx_vars, ...functionOptions, ...keywordOptions],
    };
  };
}

// ─── Language extension selector ──────────────────────────────────────────────

function getLanguageExtension(language: string) {
  switch (language.toLowerCase()) {
    case 'datamorph': return dataMorphLanguage;
    case 'json': return json();
    case 'xml': return xml();
    case 'yaml': return yaml();
    default: return dataMorphLanguage;
  }
}

// ─── Common base theme ────────────────────────────────────────────────────────

const editorFillTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto", fontFamily: "'Menlo', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace" },
});

// ─── Component ────────────────────────────────────────────────────────────────

export function DataMorphCodeMirrorEditor(props: {
  value: () => string;
  onChange: (value: string) => void;
  getContext: () => DataMorphContext;
  options?: { fontSize?: number; wordWrap?: string };
  /** Override the language (default: datamorph). */
  language?: string;
}): JSX.Element {
  let container!: HTMLDivElement;
  let view: EditorView | undefined;
  let disposeDockviewDropGuard: (() => void) | undefined;
  const languageConf = new Compartment();
  const fontSize = props.options?.fontSize ?? 12;

  const effectiveLanguage = () => props.language ?? 'datamorph';

  onMount(() => {
    const completionSource = buildCompletionSource(props.getContext);

    const state = EditorState.create({
      doc: props.value(),
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        history(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        tooltips({ parent: document.body }),
        EditorView.theme({ '.cm-tooltip-autocomplete': { 'z-index': '9999' } }),
        languageConf.of(getLanguageExtension(effectiveLanguage())),
        autocompletion({
          override: [completionSource],
          activateOnTyping: true,
          activateOnTypingDelay: 200,
          maxRenderedOptions: 20,
        }),
        EditorView.lineWrapping,
        oneDark,
        editorFillTheme,
        EditorView.theme({ "&": { fontSize: `${fontSize}px` } }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            props.onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    view = new EditorView({ state, parent: container });
    disposeDockviewDropGuard = attachDockviewDropGuard(view.dom);
    // Eagerly warm up WASM so fn_metadata is cached
    void getFnMetadata();
  });

  // Sync language changes
  createEffect(() => {
    const lang = effectiveLanguage();
    if (!view) return;
    view.dispatch({ effects: languageConf.reconfigure(getLanguageExtension(lang)) });
  });

  // Sync value changes from outside
  createEffect(() => {
    const next = props.value();
    if (!view) return;
    const current = view.state.doc.toString();
    if (next !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
    }
  });

  onCleanup(() => {
    disposeDockviewDropGuard?.();
    disposeDockviewDropGuard = undefined;
    view?.destroy();
    view = undefined;
  });

  return (
    <div
      ref={container}
      style={{ height: '100%', width: '100%', overflow: 'hidden' }}
    />
  );
}
