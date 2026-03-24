/**
 * Normalize DataMorph scripts before sending to the WASM engine.
 * - Trim leading whitespace (header parser is sensitive to leading whitespace)
 * - Rewrite parse_json raw strings
 * - Rewrite log(value) into log("", value) for optional prefix support
 */
export function normalizeScriptForWasm(script: string): string {
  const trimmed = script.trimStart();
  const normalized = rewriteParseJsonRawStrings(trimmed);
  if (shouldRewriteLogCalls(normalized)) {
    return rewriteLogCallsWithoutPrefix(normalized);
  }
  return normalized;
}

function shouldRewriteLogCalls(script: string): boolean {
  const separatorMatch = script.match(/^\s*---/m);
  if (!separatorMatch || separatorMatch.index === undefined) {
    return true;
  }

  const header = script.slice(0, separatorMatch.index);
  const definesLog = /(\bfun\s+log\b|\bvar\s+log\b)/m.test(header);
  if (definesLog) {
    return false;
  }

  const importLogAlias = /\bimport\b[\s\S]*\blog\b/m.test(header);
  return !importLogAlias;
}

function rewriteParseJsonRawStrings(script: string): string {
  const target = 'parse_json(';
  let index = 0;
  let output = '';

  while (index < script.length) {
    const found = script.indexOf(target, index);
    if (found === -1) {
      output += script.slice(index);
      break;
    }

    output += script.slice(index, found);

    const prefixEnd = found + target.length;
    const prefix = script.slice(found, prefixEnd);

    let cursor = prefixEnd;
    while (cursor < script.length && /\s/.test(script[cursor])) {
      cursor += 1;
    }

    const whitespace = script.slice(prefixEnd, cursor);
    if (script[cursor] !== '"') {
      output += prefix + whitespace;
      index = cursor;
      continue;
    }

    const contentStart = cursor + 1;
    let scan = contentStart;
    let closingQuote = -1;
    let closingParen = -1;

    while (scan < script.length) {
      if (script[scan] === '"') {
        let afterQuote = scan + 1;
        while (afterQuote < script.length && /\s/.test(script[afterQuote])) {
          afterQuote += 1;
        }
        if (script[afterQuote] === ')') {
          closingQuote = scan;
          closingParen = afterQuote;
          break;
        }
      }
      scan += 1;
    }

    if (closingQuote === -1 || closingParen === -1) {
      output += prefix + whitespace;
      index = cursor;
      continue;
    }

    const content = script.slice(contentStart, closingQuote);
    if (content.includes('\\"')) {
      output += script.slice(found, closingParen + 1);
      index = closingParen + 1;
      continue;
    }

    let hashCount = 1;
    while (content.includes(`\"${'#'.repeat(hashCount)}`)) {
      hashCount += 1;
    }
    const hashes = '#'.repeat(hashCount);
    output += `${prefix}${whitespace}${hashes}\"${content}\"${hashes})`;
    index = closingParen + 1;
  }

  return output;
}

function rewriteLogCallsWithoutPrefix(script: string): string {
  let index = 0;
  let output = '';
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  while (index < script.length) {
    const ch = script[index];
    const next = script[index + 1];

    if (inLineComment) {
      output += ch;
      if (ch === '\n') {
        inLineComment = false;
      }
      index += 1;
      continue;
    }

    if (inBlockComment) {
      output += ch;
      if (ch === '*' && next === '/') {
        output += next;
        index += 2;
        inBlockComment = false;
      } else {
        index += 1;
      }
      continue;
    }

    if (inString) {
      output += ch;
      if (ch === '\\') {
        if (index + 1 < script.length) {
          output += script[index + 1];
          index += 2;
          continue;
        }
      }
      if (ch === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      index += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      output += ch + next;
      inLineComment = true;
      index += 2;
      continue;
    }

    if (ch === '/' && next === '*') {
      output += ch + next;
      inBlockComment = true;
      index += 2;
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      stringQuote = ch;
      output += ch;
      index += 1;
      continue;
    }

    if (ch === 'l' && script.startsWith('log', index)) {
      const prev = index > 0 ? script[index - 1] : '';
      const isWordBoundary = !prev || !/[A-Za-z0-9_]/.test(prev);
      const isMemberCall = prev === '.' || prev === ':';
      if (isWordBoundary && !isMemberCall) {
        let cursor = index + 3;
        while (cursor < script.length && /\s/.test(script[cursor])) {
          cursor += 1;
        }
        if (script[cursor] === '(') {
          const parseResult = parseLogCall(script, cursor);
          if (parseResult) {
            const { endIndex, hasTopLevelComma } = parseResult;
            const args = script.slice(cursor + 1, endIndex);
            if (!hasTopLevelComma) {
              output += `log(\"\", ${args})`;
            } else {
              output += `log(${args})`;
            }
            index = endIndex + 1;
            continue;
          }
        }
      }
    }

    output += ch;
    index += 1;
  }

  return output;
}

function parseLogCall(script: string, openParenIndex: number): { endIndex: number; hasTopLevelComma: boolean } | null {
  let index = openParenIndex + 1;
  let depth = 1;
  let hasTopLevelComma = false;
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  while (index < script.length) {
    const ch = script[index];
    const next = script[index + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
      }
      index += 1;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        index += 2;
        inBlockComment = false;
      } else {
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        index += 2;
        continue;
      }
      if (ch === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      index += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      index += 2;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      index += 2;
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      stringQuote = ch;
      index += 1;
      continue;
    }

    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return { endIndex: index, hasTopLevelComma };
      }
    } else if (ch === ',' && depth === 1) {
      hasTopLevelComma = true;
    }

    index += 1;
  }

  return null;
}
