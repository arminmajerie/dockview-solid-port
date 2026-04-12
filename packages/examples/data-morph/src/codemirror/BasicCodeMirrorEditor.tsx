import { onCleanup, onMount, createEffect, type JSX } from 'solid-js';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, keymap, tooltips } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { bracketMatching, indentOnInput, foldGutter, foldKeymap, codeFolding } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { dataMorphLanguage } from './DataMorphLanguage';
import { attachDockviewDropGuard } from './dockviewDropGuard';

function getLanguageExtension(language: string) {
  switch (language.toLowerCase()) {
    case 'json': return json();
    case 'xml': return xml();
    case 'yaml': return yaml();
    case 'datamorph': return dataMorphLanguage;
    default: return [];
  }
}

const editorFillTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto", fontFamily: "'Menlo', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace" },
});

export function BasicCodeMirrorEditor(props: {
  value: () => string;
  onChange: (value: string) => void;
  language: () => string;
  options?: { fontSize?: number; wordWrap?: string; tabSize?: number; readOnly?: boolean };
  foldEnabled?: () => boolean;
}): JSX.Element {
  let container!: HTMLDivElement;
  let view: EditorView | undefined;
  let disposeDockviewDropGuard: (() => void) | undefined;
  const languageConf = new Compartment();
  const foldConf = new Compartment();

  const fontSize = props.options?.fontSize ?? 13;
  const wordWrap = props.options?.wordWrap !== 'off';
  const tabSize = props.options?.tabSize ?? 2;
  const readOnly = props.options?.readOnly ?? false;

  onMount(() => {
    const startLanguage = props.language();
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
          ...foldKeymap,
          indentWithTab,
        ]),
        foldConf.of(props.foldEnabled?.() ? [codeFolding(), foldGutter()] : []),
        EditorState.tabSize.of(tabSize),
        ...(readOnly ? [EditorState.readOnly.of(true)] : []),
        tooltips({ parent: document.body }),
        EditorView.theme({ '.cm-tooltip-autocomplete': { 'z-index': '9999' } }),
        languageConf.of(getLanguageExtension(startLanguage)),
        ...(wordWrap ? [EditorView.lineWrapping] : []),
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
  });

  // Sync language changes
  createEffect(() => {
    const lang = props.language();
    if (!view) return;
    view.dispatch({ effects: languageConf.reconfigure(getLanguageExtension(lang)) });
  });

  // Sync fold toggle
  createEffect(() => {
    const enabled = props.foldEnabled?.() ?? false;
    if (!view) return;
    view.dispatch({ effects: foldConf.reconfigure(enabled ? [codeFolding(), foldGutter()] : []) });
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
