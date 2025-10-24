import { z, type ZodType } from "zod";

/**
 * Minimal JSON-Schema-ish type for our converter.
 * (Only includes the keywords we handle below; safely ignore extras.)
 */
type Schema =
  | {
      // primitives
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
    }
  | {
      // arrays
      type: "array";
      description?: string;
      items?: Schema;                // simple homogeneous arrays
      minItems?: number;
      maxItems?: number;
      uniqueItems?: boolean;         // best-effort (not strictly enforced)
    }
  | {
      // objects
      type: "object";
      description?: string;
      properties?: Record<string, Schema>;
      required?: string[];
      additionalProperties?: boolean | Schema; // false => strict, Schema => record
    }
  | {
      // unions
      anyOf?: Schema[];
      oneOf?: Schema[];
      allOf?: Schema[];              // intersect
      description?: string;
    }
  | {
      // nullable/optional wrappers (common in hand-authored specs)
      // (These are *not* official JSON Schema keywords but often appear.)
      nullable?: true;
      optional?: true;
    } & Record<string, unknown>;

/** Main entry */
export function zodFromSchema(schema: Schema): ZodType {
  return applyMeta(build(schema), schema);
}

/** Build Zod schema from our simplified JSON-Schema-ish input */
function build(schema: Schema): ZodType {
  // Unions / intersections first (they can omit `type`)
  if ("anyOf" in schema && Array.isArray(schema.anyOf) && schema.anyOf?.length) {
    return z.union(schema.anyOf.map(zodFromSchema));
  }
  if ("oneOf" in schema && Array.isArray(schema.oneOf) && schema.oneOf?.length) {
    return z.union(schema.oneOf.map(zodFromSchema)); // treat oneOf ~ union (no mutual exclusivity check)
  }
  if ("allOf" in schema && Array.isArray(schema.allOf) && schema.allOf?.length) {
    // Zod doesn't have direct "allOf", so reduce with intersection
    return schema.allOf.map(zodFromSchema).reduce((acc, cur) => z.intersection(acc, cur));
  }

  switch ((schema as any).type) {
    case "string": {
      let s: any = z.string();
      if ("minLength" in schema && isFiniteNum(schema.minLength)) s = s.min(schema.minLength!);
      if ("maxLength" in schema && isFiniteNum(schema.maxLength)) s = s.max(schema.maxLength!);
      if ("pattern" in schema && schema.pattern) s = s.regex(new RegExp(schema.pattern as string));
      if ("enum" in schema && Array.isArray(schema.enum)) {
        const values = schema.enum!;
        if (values.every((v) => typeof v === "string")) s = z.enum(values as string[]);
        else s = z.union(values.map((v) => z.literal(v as any)));
      }
      if ("const" in schema) s = z.literal(schema.const as any);
      return wrapNullOpt(s, schema);
    }

    case "number":
    case "integer": {
      let n: any = z.number();
      if ((schema as any).type === "integer") n = n.int();
      if ("minimum" in schema && isFiniteNum(schema.minimum)) n = n.min(schema.minimum!);
      if ("maximum" in schema && isFiniteNum(schema.maximum)) n = n.max(schema.maximum!);
      if ("exclusiveMinimum" in schema && isFiniteNum(schema.exclusiveMinimum))
        n = n.gt(schema.exclusiveMinimum!);
      if ("exclusiveMaximum" in schema && isFiniteNum(schema.exclusiveMaximum))
        n = n.lt(schema.exclusiveMaximum!);
      if ("multipleOf" in schema && isFiniteNum(schema.multipleOf)) {
        const m = schema.multipleOf!;
        n = n.refine((v: number) => Math.abs(v / m - Math.round(v / m)) < 1e-12, {
          message: `Number must be a multiple of ${m}`,
        });
      }
      if ("enum" in schema && Array.isArray(schema.enum)) {
        const literals = schema.enum!.map((v) => z.literal(v as number));
        n = z.union(literals as unknown as [ZodType, ...ZodType[]]);
      }
      if ("const" in schema) n = z.literal(schema.const as any);
      return wrapNullOpt(n, schema);
    }

    case "boolean": {
      let b: any = z.boolean();
      if ("const" in schema) b = z.literal(schema.const as any);
      if ("enum" in schema && Array.isArray(schema.enum)) {
        const literals = schema.enum!.map((v) => z.literal(v as boolean));
        b = z.union(literals as unknown as [ZodType, ...ZodType[]]);
      }
      return wrapNullOpt(b, schema);
    }

    case "null": {
      return z.null();
    }

    case "array": {
      // default to unknown items if omitted
      let elem = 'items' in schema && schema.items ? zodFromSchema(schema.items as Schema) : z.unknown();
      let a = z.array(elem);
      if ("minItems" in schema && isFiniteNum(schema.minItems)) a = a.min(schema.minItems!);
      if ("maxItems" in schema && isFiniteNum(schema.maxItems)) a = a.max(schema.maxItems!);
      if ('uniqueItems' in schema && schema.uniqueItems) {
        a = a.refine((arr) => new Set(arr.map((x) => JSON.stringify(x))).size === arr.length, {
          message: "Array items must be unique",
        });
      }
      return wrapNullOpt(a, schema);
    }

    case "object": {
      const props = 'properties' in schema ? schema.properties : {};
      const required = new Set('required' in schema ? schema.required as string[] : []);
      const shape: Record<string, ZodType> = {};

      for (const [key, propSchema] of Object.entries(props as Record<string, Schema>)) {
        let zprop = zodFromSchema(propSchema as Schema);
        if (!required.has(key)) zprop = zprop.optional();
        shape[key] = zprop;
      }

      let o = z.object(shape);

      // additionalProperties => either allow unknown keys or define a record type
      if ("additionalProperties" in schema) {
        const ap = schema.additionalProperties;
        if (ap === false) {
          o = o.strict();
        } else if (ap === true || ap === undefined) {
          // Zod objects allow unknowns by default; nothing to do.
        } else {
          // Schema given => allow string-indexed extra keys matching that schema
          o = o.catchall(zodFromSchema(ap as Schema));
        }
      }
      return wrapNullOpt(o, schema);
    }

    default: {
      // Fallbacks: if someone passes {nullable:true} / {optional:true} alone, treat as unknown with wrappers
      let u = z.unknown();
      return wrapNullOpt(u, schema);
    }
  }
}

/** Attach metadata like .describe (if present) */
function applyMeta<T extends ZodType>(zschema: T, schema: Schema): T {
  if (schema && "description" in schema && typeof schema.description === "string") {
    // .describe exists in Zod 3+; v4 keeps it.
    return zschema.describe(schema.description) as T;
  }
  return zschema;
}

/** Handle common non-standard helpers: { nullable: true }, { optional: true } */
function wrapNullOpt<T extends ZodType>(inner: T, schema: Schema): ZodType {
  let out: ZodType = inner;
  if ((schema as any).nullable) out = out.nullable();
  if ((schema as any).optional) out = out.optional();
  return applyMeta(out, schema);
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
