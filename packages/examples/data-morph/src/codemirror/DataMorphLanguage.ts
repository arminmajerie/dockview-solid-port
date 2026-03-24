import { StreamLanguage } from "@codemirror/language";

const KEYWORDS = new Set([
  'output', 'input', 'import', 'from', 'as', 'var', 'fun', 'ns',
  'if', 'else', 'match', 'case', 'do', 'using', 'is', 'not', 'and', 'or',
  'default', 'type',
]);

const ATOMS = new Set(['true', 'false', 'null']);

const TYPE_KEYWORDS = new Set([
  'String', 'Number', 'Boolean', 'Array', 'Object', 'Any', 'Null', 'Date',
  'DateTime', 'Time', 'Period', 'Binary', 'Range', 'Regex', 'Key', 'Namespace',
]);

const BUILTINS = new Set([
  'payload', 'attributes', 'vars', 'error', 'correlationId',
  'map', 'filter', 'reduce', 'flatMap', 'groupBy', 'orderBy', 'distinctBy',
  'pluck', 'mapObject', 'filterObject', 'flatten', 'joinBy', 'splitBy',
  'contains', 'startsWith', 'endsWith', 'matches', 'replace', 'trim',
  'upper', 'lower', 'capitalize', 'camelize', 'dasherize', 'underscore',
  'sizeOf', 'typeOf', 'isEmpty', 'isBlank', 'now', 'uuid', 'random',
  'log', 'read', 'write', 'lookup', 'dw', 'p',
  'maxBy', 'minBy', 'sumBy', 'first', 'last',
  'entriesOf', 'keysOf', 'valuesOf',
]);

interface State {
  inComment: boolean;
  inString: string | null;
}

export const dataMorphLanguage = StreamLanguage.define<State>({
  name: "datamorph",

  startState: (): State => ({ inComment: false, inString: null }),

  copyState: (state): State => ({ ...state }),

  token(stream, state): string | null {
    // Block comment continuation
    if (state.inComment) {
      if (stream.match("*/")) state.inComment = false;
      else stream.next();
      return "comment";
    }

    // String continuation
    if (state.inString) {
      if (stream.eat("\\")) { stream.next(); return "string"; }
      if (stream.eat(state.inString)) { state.inString = null; return "string"; }
      stream.next();
      return "string";
    }

    // Whitespace
    if (stream.eatSpace()) return null;
    if (stream.eol()) return null;

    // --- separator
    if (stream.match("---")) return "keyword";

    // Line comment
    if (stream.match("//")) { stream.skipToEnd(); return "comment"; }

    // Block comment
    if (stream.match("/*")) { state.inComment = true; return "comment"; }

    const ch = stream.next();
    if (!ch) return null;

    // Strings
    if (ch === '"' || ch === "'") {
      state.inString = ch;
      return "string";
    }

    // Numbers (including hex, floats)
    if (/[0-9]/.test(ch)) {
      stream.eatWhile(/[0-9.eExXa-fA-F_]/);
      return "number";
    }

    // Identifiers, keywords, builtins
    if (/[a-zA-Z_]/.test(ch)) {
      stream.eatWhile(/[\w]/);
      const word = stream.current();
      // Namespace: word followed by ::
      if (stream.match("::", false)) return "namespace";
      if (ATOMS.has(word)) return "atom";
      if (KEYWORDS.has(word)) return "keyword";
      if (TYPE_KEYWORDS.has(word)) return "type";
      if (BUILTINS.has(word)) return "builtin";
      return "variable";
    }

    // @ prefix for XML attribute access (@attr)
    if (ch === '@') {
      if (/[a-zA-Z_]/.test(stream.peek() ?? '')) {
        stream.eatWhile(/[\w]/);
        return "property";
      }
      return "operator";
    }

    // Arrow operator ->
    if (ch === '-' && stream.eat('>')) return "operator";

    // Operators
    if ("-=><!~?:&|+*/%^".indexOf(ch) !== -1) {
      stream.eatWhile(/[-=><!~?:&|+*/%^]/);
      return "operator";
    }

    // Brackets
    if ("{}()[]".indexOf(ch) !== -1) return "bracket";

    // Punctuation
    if (",;.".indexOf(ch) !== -1) return "punctuation";

    return null;
  },
});
