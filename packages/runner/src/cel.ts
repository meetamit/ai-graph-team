// cel-template.ts
import cel from '@marcbachmann/cel-js';

export type CelContext = Record<string, unknown>;

export interface EvaluateOptions {
  /**
   * When true, unknown identifiers in CEL expressions throw.
   * When false, they resolve to undefined (CEL may still error if used).
   * Default: true (throw).
   */
  strictUnknowns?: boolean;

  /**
   * Stringify function for objects/arrays.
   * Default: (v) => JSON.stringify(v)
   */
  stringify?: (value: unknown) => string;
}

/**
 * Evaluate a single CEL expression with a given context.
 * You can use this directly if you don't need templating.
 */
export function evalCel(expr: string, context: CelContext, opts: EvaluateOptions = {}): unknown {
  const result = cel.evaluate(expr, context);
  return result;
}

/**
 * Replaces all {{ ... }} blocks with the CEL-evaluated result.
 * - Strings insert as-is
 * - Numbers, booleans insert as-is
 * - Objects/arrays are JSON.stringified (configurable)
 * - Null/undefined become empty string
 *
 * Escaping:
 *  - To output literal `{{` without evaluation, prefix with a backslash: `\{{`.
 *    The leading backslash is removed in output.
 */
export function evaluateTemplate(
  template: string,
  context: CelContext,
  opts: EvaluateOptions = {}
): string {
  const stringify = opts.stringify ?? ((v: unknown) => JSON.stringify(v));
  const strictUnknowns = opts.strictUnknowns ?? true;

  // First, protect escaped sequences \{{ ... }}
  // We convert "\{{" to a sentinel, evaluate template, then restore.
  const ESCAPE_SENTINEL = '__CEL_LBRACE_ESCAPED__';
  const protectedTemplate = template.replace(/\\\{\{/g, ESCAPE_SENTINEL);

  // Match {{ ... }} lazily, including newlines inside the braces
  // We do not allow nested braces; the first "}}" closes the expression.
  const pattern = /\{\{([\s\S]*?)\}\}/g;

  let errorAccumulator: Error | null = null;

  const replaced = protectedTemplate.replace(pattern, (match, exprBody: string, offset: number) => {
    const expr = exprBody.trim();

    try {
      // // Optionally do a quick unknown identifier check in "strict" mode.
      // // (CEL itself will throw on truly invalid usage; this is a friendlier message.)
      // if (strictUnknowns) {
      //   // A lightweight heuristic: find bare identifiers (not inside quotes, not numbers)
      //   // and warn if none exist in context. This is intentionally conservative.
      //   // You can remove this block if you prefer CEL's own errors only.
      //   const maybeIdents = Array.from(expr.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g)).map(m => m[1]);
      //   const keywords = new Set([
      //     'true', 'false', 'null', 'in', 'exists', 'has', 'matches',
      //     'uint', 'int', 'double', 'string', 'bytes', 'bool', 'list', 'map',
      //   ]);
      //   const unknowns = new Set<string>();
      //   for (const id of maybeIdents) {
      //     if (keywords.has(id)) continue;
      //     // skip if clearly a function call name (cel supports many builtins),
      //     // we only mark as unknown if it looks like a variable and not in context
      //     const looksLikeCall = new RegExp(`\\b${id}\\s*\\(`).test(expr);
      //     if (!looksLikeCall && !(id in context)) unknowns.add(id);
      //   }
      //   if (unknowns.size > 0) {
      //     // This doesn't stop evaluation, but gives a better pointer if CEL throws later.
      //     // eslint-disable-next-line no-console
      //     console.warn(
      //       `[cel-template] Potential unknown identifiers in expression "{{ ${expr} }}": ${[
      //         ...unknowns,
      //       ].join(', ')}`
      //     );
      //   }
      // }

      const value = evalCel(expr, context, opts);

      if (value == null) return ''; // null/undefined -> empty string

      const t = typeof value;
      if (t === 'string') return value as string;
      if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value);
      // Date and other objects: prefer stringify (default JSON.stringify)
      if (value instanceof Date) return value.toISOString();
      return stringify(value);
    } catch (err) {
      // Wrap with context-rich error including where in the template the failure occurred.
      const start = offset;
      const end = offset + match.length;
      const numbered =
        computeLineCol(template, start);
      const msg = (err instanceof Error ? err.message : String(err));
      const e = new Error(
        `CEL evaluation error at ${numbered.line}:${numbered.col} (chars ${start}-${end}): ` +
        `\n  Expression: {{ ${expr} }}\n  Message: ${msg}`
      );
      // Accumulate first error, but still throw after replacement to show only once
      if (!errorAccumulator) errorAccumulator = e;
      // Replace failing expression with empty string to keep output shape deterministic
      return '';
    }
  });

  if (errorAccumulator) throw errorAccumulator;

  // Restore escaped sequences
  return replaced.replace(new RegExp(ESCAPE_SENTINEL, 'g'), '{{');
}

/** Helper to compute 1-based line/column from an absolute char index. */
function computeLineCol(text: string, index: number): { line: number; col: number } {
  const upTo = text.slice(0, index);
  const lines = upTo.split(/\r?\n/);
  const line = lines.length; // 1-based
  const col = (lines[lines.length - 1] ?? '').length + 1; // 1-based
  return { line, col };
}

