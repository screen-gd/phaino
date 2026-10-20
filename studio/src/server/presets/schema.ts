import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const paramKey = z.string().regex(/^[a-z][a-zA-Z0-9]*$/);
const bind = z.object({ node: z.string().min(1), field: z.string().min(1) });
/** One bind or a list; a list writes the same value to every target. */
const binds = z.union([bind, z.array(bind).min(1)]);
const jsonValue = z.union([z.string(), z.number(), z.boolean()]);

/**
 * text: final value is `template` with {key} placeholders replaced by other
 * param values (e.g. "{prompt} {style}"); without a template the raw value is
 * written. Unknown placeholders are a validation error.
 */
const textParam = z.object({
  type: z.literal("text"),
  key: paramKey,
  label: z.string(),
  default: z.string(),
  placeholder: z.string().optional(),
  template: z.string().optional(),
  advanced: z.boolean().optional(),
  bind: binds,
});

const seedParam = z.object({
  type: z.literal("seed"),
  key: paramKey,
  label: z.string(),
  bind: binds,
});

/**
 * choice: writes option.value to bind (if present) and applies every
 * option.set entry. A choice with no bind and no set is only used inside text
 * templates. default must equal one option value.
 */
const choiceParam = z.object({
  type: z.literal("choice"),
  key: paramKey,
  label: z.string(),
  default: jsonValue,
  options: z
    .array(
      z.object({
        value: jsonValue,
        label: z.string(),
        set: z.array(bind.extend({ value: jsonValue })).optional(),
      }),
    )
    .min(1),
  advanced: z.boolean().optional(),
  bind: binds.optional(),
});

const intParam = z.object({
  type: z.literal("int"),
  key: paramKey,
  label: z.string(),
  default: z.number().int(),
  min: z.number().int(),
  max: z.number().int(),
  advanced: z.boolean().optional(),
  bind: binds,
});

const floatParam = z.object({
  type: z.literal("float"),
  key: paramKey,
  label: z.string(),
  default: z.number(),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  advanced: z.boolean().optional(),
  bind: binds,
});

export const presetSchema = z
  .object({
    id: slug,
    name: z.string(),
    description: z.string(),
    category: z.enum(["camera", "image", "video", "edit"]),
    order: z.number().int(),
    chip: z.string().optional(),
    engine: z.literal("workflow"),
    model: z.object({
      id: z.string(),
      label: z.string(),
      license: z.enum(["open", "partner"]),
    }),
    forkOf: slug.optional(),
    source: z.object({
      template: z.string(),
      modes: z.record(z.string(), z.number().int()).optional(),
    }),
    inputs: z.array(
      z.object({
        key: paramKey,
        type: z.enum(["image", "video"]),
        label: z.string(),
        required: z.boolean(),
        bind,
      }),
    ),
    params: z.array(
      z.discriminatedUnion("type", [
        textParam,
        seedParam,
        choiceParam,
        intParam,
        floatParam,
      ]),
    ),
    outputs: z
      .array(z.object({ node: z.string(), kind: z.enum(["video", "image"]) }))
      .min(1),
  })
  .superRefine((preset, ctx) => {
    const keys = new Set<string>();
    for (const input of preset.inputs) {
      if (keys.has(input.key)) {
        ctx.addIssue({ code: "custom", message: `Duplicate key "${input.key}"` });
      }
      keys.add(input.key);
    }
    for (const param of preset.params) {
      if (keys.has(param.key)) {
        ctx.addIssue({ code: "custom", message: `Duplicate key "${param.key}"` });
      }
      keys.add(param.key);
    }

    for (const param of preset.params) {
      if (param.type === "choice") {
        if (!param.options.some((o) => o.value === param.default)) {
          ctx.addIssue({
            code: "custom",
            message: `Choice "${param.key}" default is not one of its options`,
          });
        }
      }
      if (param.type === "int" || param.type === "float") {
        if (param.default < param.min || param.default > param.max) {
          ctx.addIssue({
            code: "custom",
            message: `Int "${param.key}" default ${param.default} is outside [${param.min}, ${param.max}]`,
          });
        }
      }
      if (param.type === "text" && param.template) {
        for (const match of param.template.matchAll(/\{([a-z][a-zA-Z0-9]*)\}/g)) {
          if (!keys.has(match[1])) {
            ctx.addIssue({
              code: "custom",
              message: `Template on "${param.key}" references unknown param "${match[1]}"`,
            });
          }
        }
      }
    }
  });

export type Preset = z.infer<typeof presetSchema>;
export type PresetParam = Preset["params"][number];
export type PresetInput = Preset["inputs"][number];
export type PresetBind = z.infer<typeof bind>;

/** Normalise a bind field (single object or list) to an array. */
export function bindsOf(
  b: PresetBind | PresetBind[] | undefined,
): PresetBind[] {
  return b ? (Array.isArray(b) ? b : [b]) : [];
}
