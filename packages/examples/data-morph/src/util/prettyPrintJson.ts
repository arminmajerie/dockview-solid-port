/**
 * Raw JSON pretty-printer.
 *
 * Unlike `JSON.parse` → `JSON.stringify`, this works by scanning characters
 * without parsing semantics, so duplicate keys (DataMorph multimap output)
 * are preserved exactly as the engine emitted them.
 *
 * Handles: strings (with escape sequences), numbers, booleans, null,
 * objects (with duplicate keys), arrays, nested structures.
 */
export function prettyPrintJson(raw: string, indent = 2): string {
  const space = " ".repeat(indent);
  let out = "";
  let depth = 0;
  let i = 0;
  const n = raw.length;

  const nl = () => "\n" + space.repeat(depth);

  while (i < n) {
    const ch = raw[i];

    // String — copy verbatim including all escape sequences
    if (ch === '"') {
      let s = '"';
      i++;
      while (i < n) {
        const c = raw[i];
        s += c;
        if (c === "\\") {
          i++;
          if (i < n) { s += raw[i]; i++; }
          continue;
        }
        if (c === '"') { i++; break; }
        i++;
      }
      out += s;
      continue;
    }

    if (ch === "{" || ch === "[") {
      out += ch;
      depth++;
      i++;
      // Peek ahead: if next non-whitespace is the closing bracket, keep on same line
      let peek = i;
      while (peek < n && /\s/.test(raw[peek])) peek++;
      if (raw[peek] === (ch === "{" ? "}" : "]")) {
        out += raw[peek];
        depth--;
        i = peek + 1;
      } else {
        out += nl();
      }
      continue;
    }

    if (ch === "}" || ch === "]") {
      depth--;
      out += nl() + ch;
      i++;
      continue;
    }

    if (ch === ",") {
      out += ",";
      out += nl();
      i++;
      continue;
    }

    if (ch === ":") {
      out += ": ";
      i++;
      continue;
    }

    // Skip whitespace (we re-generate our own)
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Anything else (numbers, true, false, null) — copy until delimiter
    let token = "";
    while (i < n && !/[\s,:{}\[\]"]/.test(raw[i])) {
      token += raw[i++];
    }
    out += token;
  }

  return out;
}

/**
 * Returns the input string compact (strips whitespace outside strings).
 * Preserves duplicate keys.
 */
export function compactJson(raw: string): string {
  let out = "";
  let i = 0;
  const n = raw.length;

  while (i < n) {
    const ch = raw[i];

    if (ch === '"') {
      let s = '"';
      i++;
      while (i < n) {
        const c = raw[i];
        s += c;
        if (c === "\\") {
          i++;
          if (i < n) { s += raw[i]; i++; }
          continue;
        }
        if (c === '"') { i++; break; }
        i++;
      }
      out += s;
      continue;
    }

    if (/\s/.test(ch)) { i++; continue; }

    out += ch;
    i++;
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// XML pretty-printer / compactor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenise an XML string into a flat list of nodes (tags, text, comments, etc.)
 * without a full DOM parse. Sufficient for indentation purposes.
 */
function xmlTokenize(raw: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const n = raw.length;

  while (i < n) {
    if (raw[i] === "<") {
      // Comment
      if (raw.startsWith("<!--", i)) {
        const end = raw.indexOf("-->", i + 4);
        const j = end === -1 ? n : end + 3;
        tokens.push(raw.slice(i, j));
        i = j;
      // CDATA
      } else if (raw.startsWith("<![CDATA[", i)) {
        const end = raw.indexOf("]]>", i + 9);
        const j = end === -1 ? n : end + 3;
        tokens.push(raw.slice(i, j));
        i = j;
      // Processing instruction or XML declaration
      } else if (raw[i + 1] === "?") {
        const end = raw.indexOf("?>", i + 2);
        const j = end === -1 ? n : end + 2;
        tokens.push(raw.slice(i, j));
        i = j;
      // DOCTYPE
      } else if (raw.startsWith("<!", i)) {
        const j = raw.indexOf(">", i + 2) + 1 || n;
        tokens.push(raw.slice(i, j));
        i = j;
      } else {
        // Regular element tag — scan respecting quoted attributes
        let j = i + 1;
        let inStr: string | null = null;
        while (j < n) {
          const c = raw[j];
          if (inStr) {
            if (c === inStr) inStr = null;
          } else if (c === '"' || c === "'") {
            inStr = c;
          } else if (c === ">") {
            j++;
            break;
          }
          j++;
        }
        tokens.push(raw.slice(i, j));
        i = j;
      }
    } else {
      // Text content — collect until next "<"
      let j = i;
      while (j < n && raw[j] !== "<") j++;
      const text = raw.slice(i, j).trim();
      if (text) tokens.push(text);
      i = j;
    }
  }

  return tokens;
}

/**
 * Pretty-print an XML string with consistent 2-space indentation.
 * Works without DOM parsing, so it is safe to use on any well-formed XML
 * produced by DataMorph (including duplicate-element / multimap output).
 */
export function prettyPrintXml(raw: string, indent = 2): string {
  const space = " ".repeat(indent);
  const tokens = xmlTokenize(raw.trim());
  let out = "";
  let depth = 0;

  for (let ti = 0; ti < tokens.length; ti++) {
    const tok = tokens[ti];

    // XML declaration / processing instruction → no indent adjustment
    if (tok.startsWith("<?")) {
      out += tok + "\n";
      continue;
    }

    // Comment / CDATA / DOCTYPE
    if (tok.startsWith("<!--") || tok.startsWith("<![CDATA[") || tok.startsWith("<!")) {
      out += space.repeat(depth) + tok + "\n";
      continue;
    }

    // Closing tag
    if (tok.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      out += space.repeat(depth) + tok + "\n";
      continue;
    }

    // Self-closing tag
    if (tok.startsWith("<") && tok.endsWith("/>")) {
      out += space.repeat(depth) + tok + "\n";
      continue;
    }

    // Opening tag — check if the pattern is <tag>text</tag> (inline content)
    if (tok.startsWith("<")) {
      const next = tokens[ti + 1] ?? "";
      const nextNext = tokens[ti + 2] ?? "";
      if (next && !next.startsWith("<") && nextNext.startsWith("</")) {
        // Inline: emit all three on one line, depth unchanged (open + close cancel)
        out += space.repeat(depth) + tok + next + nextNext + "\n";
        ti += 2;
        continue;
      }
      out += space.repeat(depth) + tok + "\n";
      depth++;
      continue;
    }

    // Bare text node
    out += space.repeat(depth) + tok + "\n";
  }

  return out.trimEnd();
}

/**
 * Compact an XML string by stripping inter-element whitespace.
 * Content inside text nodes is preserved.
 */
export function compactXml(raw: string): string {
  return raw.replace(/>\s+</g, "><").trim();
}
