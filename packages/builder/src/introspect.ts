import { z } from "zod";

/**
 * A minimal description of one field in a block's `propsSchema`, enough for
 * `apps/admin` to render a generic property-panel input without hardcoding
 * a form per block type. Deliberately covers only the primitive shapes
 * actually used in BLOCK_REGISTRY (string / number / boolean / enum-of-
 * literals) — anything else (nested objects, arrays) falls back to `kind:
 * "json"` and a raw textarea, which is honest about the limitation rather
 * than silently mis-rendering.
 */
export type PropFieldDescriptor =
  | { key: string; label: string; kind: "text"; required: boolean; default?: string }
  | { key: string; label: string; kind: "textarea"; required: boolean; default?: string }
  | { key: string; label: string; kind: "number"; required: boolean; default?: number }
  | { key: string; label: string; kind: "boolean"; required: boolean; default?: boolean }
  | {
      key: string;
      label: string;
      kind: "select";
      required: boolean;
      options: string[];
      /** HTML <select> values are always strings — this tells the caller how to coerce back before writing to node.props. */
      valueType: "string" | "number";
      default?: string;
    }
  | { key: string; label: string; kind: "json"; required: boolean };

const LONG_TEXT_KEYS = new Set([
  "html", "description", "roadPathSvg",
  "timeValue", "highlightsValue", "perfectForValue",
  "route2TimeValue", "route2HighlightsValue", "route2PerfectForValue",
  "route3TimeValue", "route3HighlightsValue", "route3PerfectForValue",
  "intro", "footerNote",
]);

function labelFromKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Unwraps ZodDefault/ZodOptional/ZodNullable to get at the underlying type + whether it's required. */
function unwrap(schema: z.ZodTypeAny): { inner: z.ZodTypeAny; required: boolean; defaultValue?: unknown } {
  let inner = schema;
  let required = true;
  let defaultValue: unknown;

  while (true) {
    if (inner instanceof z.ZodDefault) {
      defaultValue = inner._def.defaultValue();
      inner = inner._def.innerType;
      required = false;
    } else if (inner instanceof z.ZodOptional || inner instanceof z.ZodNullable) {
      inner = inner._def.innerType;
      required = false;
    } else {
      break;
    }
  }
  return { inner, required, defaultValue };
}

function describeField(key: string, schema: z.ZodTypeAny): PropFieldDescriptor {
  const { inner, required, defaultValue } = unwrap(schema);
  const label = labelFromKey(key);

  if (inner instanceof z.ZodEnum) {
    return {
      key,
      label,
      kind: "select",
      required,
      options: inner.options as string[],
      valueType: "string",
      default: defaultValue as string | undefined,
    };
  }
  if (inner instanceof z.ZodUnion) {
    const literals = inner._def.options.filter((o: z.ZodTypeAny) => o instanceof z.ZodLiteral) as z.ZodLiteral<unknown>[];
    if (literals.length === inner._def.options.length && literals.length > 0) {
      const valueType = typeof literals[0].value === "number" ? "number" : "string";
      return {
        key,
        label,
        kind: "select",
        required,
        options: literals.map((l) => String(l.value)),
        valueType,
        default: defaultValue !== undefined ? String(defaultValue) : undefined,
      };
    }
    return { key, label, kind: "json", required };
  }
  if (inner instanceof z.ZodNumber) {
    return { key, label, kind: "number", required, default: defaultValue as number | undefined };
  }
  if (inner instanceof z.ZodBoolean) {
    return { key, label, kind: "boolean", required, default: defaultValue as boolean | undefined };
  }
  if (inner instanceof z.ZodString) {
    return {
      key,
      label,
      kind: LONG_TEXT_KEYS.has(key) ? "textarea" : "text",
      required,
      default: defaultValue as string | undefined,
    };
  }
  return { key, label, kind: "json", required };
}

/** Describes a block's `propsSchema` (must be a plain `z.object`) as an ordered list of form fields. */
export function describePropsSchema(schema: z.ZodTypeAny): PropFieldDescriptor[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = schema._def.shape() as Record<string, z.ZodTypeAny>;
  return Object.entries(shape).map(([key, fieldSchema]) => describeField(key, fieldSchema));
}
