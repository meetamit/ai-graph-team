// Fixture generator for the same simplified Schema type used before.
type Schema =
  | {
      type: "string" | "number" | "integer" | "boolean" | "null";
      description?: string;
      enum?: Array<string | number | boolean | null>;
      const?: string | number | boolean | null;
      // string constraints
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      // number constraints
      minimum?: number;
      maximum?: number;
      exclusiveMinimum?: number;
      exclusiveMaximum?: number;
      multipleOf?: number;
      nullable?: true;
      optional?: true;
    }
  | {
      type: "array";
      description?: string;
      items?: Schema;
      minItems?: number;
      maxItems?: number;
      uniqueItems?: boolean;
      nullable?: true;
      optional?: true;
    }
  | {
      type: "object";
      description?: string;
      properties?: Record<string, Schema>;
      required?: string[];
      additionalProperties?: boolean | Schema;
      nullable?: true;
      optional?: true;
    }
  | {
      anyOf?: Schema[];
      oneOf?: Schema[];
      allOf?: Schema[];
      description?: string;
      nullable?: true;
      optional?: true;
    }
  | ({ nullable?: true; optional?: true } & Record<string, unknown>);

type FixtureOptions = {
  /** Default number of items to generate when not constrained by min/max. */
  arrayLength?: number;         // default 4
  /** Start the "string N" numbering at this value (1-based). */
  startIndex?: number;          // default 1
  /** If true, exclude optional properties (keeps output minimal). */
  omitOptionalProps?: boolean;  // default false (include optionals)
};

export function fixtureFromSchema(schema: Schema, options: FixtureOptions = {}): any {
  const ctx: Ctx = {
    arrayLength: options.arrayLength ?? 4,
    sIndex: options.startIndex ?? 1,
    omitOptional: !!options.omitOptionalProps,
  };
  return buildValue(schema, ctx, []);
}

type Ctx = {
  arrayLength: number;
  sIndex: number;         // global counter for "string N"
  omitOptional: boolean;
};

function buildValue(schema: Schema, ctx: Ctx, path: string[]): any {
  // Union / intersection handling
  if ("anyOf" in schema && Array.isArray(schema.anyOf) && schema.anyOf.length) {
    return buildValue(schema.anyOf[0]!, ctx, path);
  }
  if ("oneOf" in schema && Array.isArray(schema.oneOf) && schema.oneOf?.length) {
    return buildValue(schema.oneOf[0]!, ctx, path);
  }
  if ("allOf" in schema && Array.isArray(schema.allOf) && schema.allOf?.length) {
    // Try to merge objects, else just take first
    const subs = schema.allOf.map((s) => buildValue(s, ctx, path));
    if (subs.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
      return Object.assign({}, ...subs);
    }
    return subs[0];
  }

  // Nullable/optional policy: prefer non-null / included value (so it passes when required)
  // Caller can choose to omit optionals globally via options.omitOptionalProps.
  const isOptional = !!(schema as any).optional;
  const isNullable = !!(schema as any).nullable;

  // If schema has an explicit const/enum, honor that regardless of optional/nullable.
  if ("const" in (schema as any) && (schema as any).const !== undefined) {
    return (schema as any).const;
  }
  if ("enum" in (schema as any) && Array.isArray((schema as any).enum)) {
    return (schema as any).enum[0];
  }

  // From here, generate by type:
  const t = (schema as any).type as string | undefined;

  switch (t) {
    case "string":
      return genString(schema as any, ctx);

    case "number":
    case "integer":
      return genNumber(schema as any, ctx, path);

    case "boolean":
      return true;

    case "null":
      return null;

    case "array": {
      const s = schema as Extract<Schema, { type: "array" }>;
      const itemSchema = s.items ?? { type: "string" } as Schema;
      const min = isFiniteNum(s.minItems) ? s.minItems! : 0;
      const max = isFiniteNum(s.maxItems) ? s.maxItems! : Infinity;
      const target = clamp(
        Math.max(min, 1),
        ctx.arrayLength,
        Number.isFinite(max) ? max : ctx.arrayLength
      );

      const out = Array.from({ length: target }, (_, i) =>
        buildValue(itemSchema, ctx, path.concat(String(i)))
      );

      if (s.uniqueItems) {
        // Best-effort: tweak by appending indices for strings / adjust numbers slightly
        makeUnique(out);
      }
      return out;
    }

    case "object": {
      const s = schema as Extract<Schema, { type: "object" }>;
      const props = s.properties ?? {};
      const required = new Set(s.required ?? []);
      const out: Record<string, any> = {};

      for (const [k, v] of Object.entries(props)) {
        const propIsOptional = !required.has(k) || !!(v as any).optional;
        if (ctx.omitOptional && propIsOptional) continue; // drop optionals if requested
        const val = buildValue(v, ctx, path.concat(k));
        // If nullable and not required, we still prefer concrete value (not null) to pass strict checks
        out[k] = val;
      }
      return out;
    }

    default: {
      // Unknown type → produce something safe
      if (isNullable) return null;
      return "unknown";
    }
  }
}

/* ---------------- Generators ---------------- */

function genString(s: {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}, ctx: Ctx): string {
  // Attempt to satisfy simple patterns first
  if (s.pattern) {
    const p = s.pattern;
    if (/\d/.test(p) || /\[0-9]/.test(p)) {
      return fitLength("1234567890", s.minLength, s.maxLength);
    }
    if (/[a-zA-Z]/.test(p)) {
      return fitLength("abcdefghijklmnopqrstuvwxyz", s.minLength, s.maxLength);
    }
    if (/^\^?\w+\$?$/.test(p)) {
      const word = p.replace(/[\^\$]/g, "");
      return fitLength(word || "word", s.minLength, s.maxLength);
    }
    // Fallback if pattern is complex
  }

  const base = `string ${ctx.sIndex++}`;
  return fitLength(base, s.minLength, s.maxLength);
}

function genNumber(s: {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  type?: "number" | "integer";
}, ctx: Ctx, path: string[]): number {
  const isInt = s.type === "integer";

  // Build an inclusive range considering exclusive bounds
  let lo = 0, hi = isInt ? 10 : 1;

  if (isFiniteNum(s.minimum)) lo = Math.max(lo, s.minimum!);
  if (isFiniteNum(s.maximum)) hi = Math.min(hi, s.maximum!);
  if (isFiniteNum(s.exclusiveMinimum)) lo = Math.max(lo, s.exclusiveMinimum! + 1e-9);
  if (isFiniteNum(s.exclusiveMaximum)) hi = Math.min(hi, s.exclusiveMaximum! - 1e-9);

  // Derive a stable fraction based on path depth for nice spreads like 0.25, 0.5, ...
  const denom = 4;
  const idx = (path.length > 1 ? (path[path.length - 2].charCodeAt(0) % denom) : 0) + 1;
  let candidate = idx / denom; // 0.25..1

  // Fit candidate into [lo, hi]
  if (hi < lo) {
    // degenerate; fallback to 0 or int(0)
    candidate = 0;
  } else {
    const span = hi - lo;
    candidate = lo + (span === 0 ? 0 : candidate * (span / 1));
    // Keep within closed range
    candidate = Math.min(hi, Math.max(lo, candidate));
  }
  
  if (isInt) candidate = Math.round(candidate === 0 ? 1 : candidate);

  // multipleOf
  if (isFiniteNum(s.multipleOf) && s.multipleOf! > 0) {
    const m = s.multipleOf!;
    if (isInt) {
      const base = Math.max(1, Math.round(candidate / m));
      candidate = base * m;
    } else {
      const base = Math.round(candidate / m);
      candidate = base * m;
    }
  }

  return candidate;
}

/* ---------------- Utilities ---------------- */

function clamp(min: number, v: number, max: number) {
  return Math.max(min, Math.min(v, max));
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function fitLength(s: string, minLen?: number, maxLen?: number) {
  const min = isFiniteNum(minLen) ? minLen! : undefined;
  const max = isFiniteNum(maxLen) ? maxLen! : undefined;

  let out = s;
  if (min && out.length < min) {
    const pad = "x".repeat(min - out.length);
    out = out + pad;
  }
  if (max && out.length > max) {
    out = out.slice(0, max);
  }
  return out;
}

function makeUnique(arr: any[]) {
  const seen = new Set<string>();
  for (let i = 0; i < arr.length; i++) {
    let v = arr[i];
    let key = JSON.stringify(v);
    if (!seen.has(key)) {
      seen.add(key);
      continue;
    }
    // Tweak value to make unique
    if (typeof v === "string") {
      v = v + ` #${i + 1}`;
    } else if (typeof v === "number") {
      v = v + i * 1e-6;
    } else if (v && typeof v === "object") {
      v = { ...v, _i: i };
    }
    arr[i] = v;
    seen.add(JSON.stringify(v));
  }
}
