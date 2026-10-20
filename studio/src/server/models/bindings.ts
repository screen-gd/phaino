import "server-only";

import { presetSchema, type Preset, type PresetBind } from "../presets/schema.ts";
import { MODE_LABELS, modePresetId, type ModelEntry, type ModelMode } from "./registry.ts";
import {
  REFRAME_ASPECTS,
  toolPresetId,
  type EditTool,
} from "./tools.ts";
import { comboOptions, type ObjectInfo, type WorkflowApiGraph } from "../presets/validate.ts";

type ApiNode = { class_type?: string; inputs?: Record<string, unknown> };
type UiNode = {
  id?: unknown;
  type?: string;
  properties?: { models?: { name?: string; url?: string }[] };
};
type UiWorkflowDoc = { nodes?: UiNode[] };

export type DetectedModel = { name: string; url: string };

export type Detection = {
  preset: Preset | null;
  problems: string[];
  /** Model files the template downloads, from node properties.models. */
  models: DetectedModel[];
};

function isLink(v: unknown): v is [string, number] {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === "string";
}

function producer(api: WorkflowApiGraph, nodeId: string, input: string): string | null {
  const v = api[nodeId]?.inputs?.[input];
  return isLink(v) ? v[0] : null;
}

/**
 * From a linked input (e.g. a guider's `positive`), walk upstream to the node
 * holding an unlinked string input named text/prompt/value. Follows
 * passthrough links with the same name (LTXVConditioning.positive), then any
 * link input (text encode <- PreviewAny <- switch <- primitive).
 */
function traceText(
  api: WorkflowApiGraph,
  from: { nodeId: string; input: string },
): { node: string; field: string; value: string } | null {
  const seen = new Set<string>();
  const walk = (
    id: string | null,
    via: string,
  ): { node: string; field: string; value: string } | null => {
    if (!id || seen.has(id)) return null;
    seen.add(id);
    const node = api[id];
    if (!node?.inputs) return null;
    for (const field of ["text", "prompt", "string", "value"]) {
      const v = node.inputs[field];
      if (typeof v === "string") return { node: id, field, value: v };
    }
    const links = Object.entries(node.inputs).filter(([, v]) => isLink(v));
    // Prefer the passthrough matching the input we came in on.
    links.sort(([a], [b]) => (a === via ? -1 : b === via ? 1 : 0));
    for (const [, link] of links) {
      const hit: { node: string; field: string; value: string } | null = walk(
        (link as [string, number])[0],
        via,
      );
      if (hit) return hit;
    }
    return null;
  };
  return walk(producer(api, from.nodeId, from.input), from.input);
}

/** Nodes whose input `name` holds an unlinked numeric literal (not a link). */
function literalInputs(
  api: WorkflowApiGraph,
  names: RegExp,
): { node: string; field: string; value: number }[] {
  const out: { node: string; field: string; value: number }[] = [];
  for (const [id, node] of Object.entries(api)) {
    for (const [field, value] of Object.entries(node.inputs ?? {})) {
      if (names.test(field) && !isLink(value) && typeof value === "number") {
        out.push({ node: id, field, value });
      }
    }
  }
  return out;
}

/** Which input names consume a given node's output, across the graph. */
function consumerInputNames(api: WorkflowApiGraph, nodeId: string): string[] {
  const names: string[] = [];
  for (const node of Object.values(api)) {
    for (const [field, value] of Object.entries(node.inputs ?? {})) {
      if (isLink(value) && value[0] === nodeId) names.push(field);
    }
  }
  return names;
}

function imageSortRank(names: string[]): number {
  if (names.some((n) => /start|first/i.test(n))) return 0;
  if (names.some((n) => /end|last/i.test(n))) return 1;
  return 2;
}

const round16 = (n: number) => Math.max(16, Math.round(n / 16) * 16);

/** Detect a full Preset for a template-backed mode, or report problems. */
export function detectPreset(
  model: ModelEntry,
  mode: ModelMode,
  api: WorkflowApiGraph,
  ui: UiWorkflowDoc,
  objectInfo: ObjectInfo,
): Detection {
  const problems: string[] = [];
  const id = modePresetId(model, mode);
  const source =
    model.modes[mode] && "template" in model.modes[mode]!
      ? (model.modes[mode] as { template: string }).template
      : "";

  // Models referenced by the template (HF download entries on loader nodes).
  const models: DetectedModel[] = [];
  for (const node of ui.nodes ?? []) {
    for (const m of node.properties?.models ?? []) {
      if (m.name && m.url) models.push({ name: m.name, url: m.url });
    }
  }

  // Output: exactly one Save-style node (PreviewImage ignored).
  const saveNodes = Object.entries(api).filter(([, n]) =>
    /^Save(Image|Video|WEBM|AnimatedWEBP|AnimatedPNG)/.test(n.class_type ?? ""),
  );
  const outputs: Preset["outputs"] = [];
  if (saveNodes.length !== 1) {
    problems.push(
      `output: expected one Save node, found ${saveNodes.length}`,
    );
  } else {
    const cls = saveNodes[0][1].class_type ?? "";
    outputs.push({
      node: saveNodes[0][0],
      kind: /Video|WEBM/i.test(cls) ? "video" : "image",
    });
  }

  // prompt + negative via the positive/negative conditioning inputs; guiders
  // like MiniMax's take `conditioning` instead of `positive`.
  const condSink =
    Object.entries(api).find(
      ([, n]) => isLink(n.inputs?.positive) && isLink(n.inputs?.negative),
    ) ??
    Object.entries(api).find(([, n]) => isLink(n.inputs?.positive)) ??
    Object.entries(api).find(([, n]) => isLink(n.inputs?.conditioning));
  const params: Preset["params"] = [];
  let promptBind: { node: string; field: string; value: string } | null = null;
  if (!condSink) {
    problems.push("prompt: no node with a linked `positive` input");
  } else {
    promptBind =
      traceText(api, { nodeId: condSink[0], input: "positive" }) ??
      traceText(api, { nodeId: condSink[0], input: "conditioning" });
    if (!promptBind) {
      problems.push("prompt: could not trace `positive` to a text input");
    } else {
      params.push({
        type: "text",
        key: "prompt",
        label: "Prompt",
        default: promptBind.value,
        placeholder: "Describe it",
        bind: { node: promptBind.node, field: promptBind.field },
      });
      if (isLink(condSink[1].inputs?.negative)) {
        const neg = traceText(api, { nodeId: condSink[0], input: "negative" });
        if (neg && neg.node !== promptBind.node) {
          params.push({
            type: "text",
            key: "negative",
            label: "Negative prompt",
            default: neg.value,
            advanced: true,
            bind: { node: neg.node, field: neg.field },
          });
        }
      }
    }
  }

  // seed: every unlinked seed/noise_seed input, written together.
  const seedBinds: PresetBind[] = literalInputs(api, /^(seed|noise_seed)$/).map(
    (s) => ({ node: s.node, field: s.field }),
  );
  if (seedBinds.length === 0) {
    problems.push("seed: no unlinked seed input");
  } else {
    params.push({
      type: "seed",
      key: "seed",
      label: "Seed",
      bind: seedBinds.length === 1 ? seedBinds[0] : seedBinds,
    });
  }

  // image inputs: LoadImage nodes ordered by downstream slot name.
  const loadImages = Object.keys(api).filter(
    (id) => api[id].class_type === "LoadImage",
  );
  const wantImages = mode === "flf2v" ? 2 : mode === "i2v" || mode === "edit" ? 1 : 0;
  if (loadImages.length < wantImages) {
    problems.push(
      `images: ${mode} needs ${wantImages} LoadImage node(s), found ${loadImages.length}`,
    );
  }
  const ordered = loadImages
    .slice(0, wantImages)
    .sort((a, b) => {
      const ra = imageSortRank(consumerInputNames(api, a));
      const rb = imageSortRank(consumerInputNames(api, b));
      return ra - rb || Number(a) - Number(b);
    });
  const labels =
    mode === "flf2v"
      ? ["First frame", "Last frame"]
      : mode === "edit"
        ? ["Reference"]
        : ["First frame"];
  const keys = ["image", "imageLast"];
  const inputs: Preset["inputs"] = ordered.map((nodeId, i) => ({
    key: keys[i],
    type: "image" as const,
    label: labels[i] ?? "Image",
    required: true,
    bind: { node: nodeId, field: "image" },
  }));

  // aspect: width+height pairs driven by one choice. When the graph holds
  // several pairs (canvas latent plus e.g. CreateBoundingBoxes), prefer the
  // pair on the node feeding the sampler's latent input.
  const allSizeNodes = Object.entries(api).filter(([, n]) => {
    const i = n.inputs ?? {};
    return (
      typeof i.width === "number" &&
      typeof i.height === "number" &&
      !isLink(i.width) &&
      !isLink(i.height)
    );
  });
  const latentSource = (() => {
    const seen = new Set<string>();
    let frontier = Object.values(api).flatMap((n) =>
      isLink(n.inputs?.latent_image) ? [n.inputs.latent_image[0]] : [],
    );
    const chainExists = frontier.length > 0;
    while (frontier.length > 0 && seen.size < 12) {
      const next: string[] = [];
      for (const id of frontier) {
        if (seen.has(id)) continue;
        seen.add(id);
        if (allSizeNodes.some(([n]) => n === id)) return { id, found: true };
        const lat = api[id]?.inputs?.latent;
        if (isLink(lat)) next.push(lat[0]);
      }
      frontier = next;
    }
    // A real latent chain that ends at a non-pair node (ReferenceMultiLatent,
    // linked-to-ResolutionSelector latents) means the w/h pairs elsewhere are
    // UI helpers, not the canvas size.
    return { id: null, found: !chainExists };
  })();
  const sizeNodes =
    latentSource.id !== null
      ? allSizeNodes.filter(([n]) => n === latentSource.id)
      : latentSource.found
        ? allSizeNodes
        : [];
  if (sizeNodes.length > 0) {
    const first = sizeNodes[0][1].inputs as { width: number; height: number };
    const area = first.width * first.height;
    const w169 = round16(Math.sqrt((area * 16) / 9));
    const h169 = round16(Math.sqrt((area * 9) / 16));
    const w916 = h169;
    const h916 = w169;
    const sq = round16(Math.sqrt(area));
    const dims: [number, number, string][] = [
      [first.width, first.height, `${first.width}x${first.height}`],
      [w169, h169, `16:9 ${w169}x${h169}`],
      [w916, h916, `9:16 ${w916}x${h916}`],
      [sq, sq, `1:1 ${sq}x${sq}`],
    ];
    const seen = new Set<string>();
    const options = dims
      .filter(([w, h]) => {
        const k = `${w}x${h}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(([w, h, label]) => ({
        value: `${w}x${h}`,
        label,
        set: sizeNodes.flatMap(([nodeId, n]) => {
          const i = n.inputs as { width: number; height: number };
          return [
            { node: nodeId, field: "width", value: w },
            { node: nodeId, field: "height", value: h },
          ];
        }),
      }));
    params.push({
      type: "choice",
      key: "size",
      label: "Size",
      default: `${first.width}x${first.height}`,
      options,
    });
  } else {
    // LTX/MiniMax drive size through a ResolutionSelector's aspect_ratio COMBO.
    const aspectNodes = Object.entries(api).filter(
      ([, n]) => typeof n.inputs?.aspect_ratio === "string",
    );
    if (aspectNodes.length === 1) {
      const [nodeId, node] = aspectNodes[0];
      const aspect = node.inputs!.aspect_ratio as string;
      const spec =
        objectInfo.nodes[node.class_type ?? ""]?.input?.required
          ?.aspect_ratio ??
        objectInfo.nodes[node.class_type ?? ""]?.input?.optional?.aspect_ratio;
      const options = spec
        ? (comboOptions(spec) ?? []).filter(
            (o): o is string => typeof o === "string",
          )
        : [];
      if (options.length > 0 && options.includes(aspect)) {
        params.push({
          type: "choice",
          key: "aspect",
          label: "Aspect",
          default: aspect,
          options: options.map((o) => ({ value: o, label: o })),
          bind: { node: nodeId, field: "aspect_ratio" },
        });
      }
    }
  }

  // duration: one unlinked length/frames input, or the seconds primitive
  // behind a ComfyMathExpression length (LTX/MiniMax convention).
  const frameInputs = literalInputs(api, /^(length|num_frames|frames|frame_count)$/);
  let secondsPrimitive: { node: string; field: string; value: number; isFloat: boolean } | null = null;
  if (frameInputs.length === 0) {
    outer: for (const [id, n] of Object.entries(api)) {
      for (const [field, v] of Object.entries(n.inputs ?? {})) {
        if (!/^(length|num_frames|frames|frame_count)$/.test(field)) continue;
        if (!isLink(v)) continue;
        const expr = api[v[0]];
        const aLink = expr?.inputs?.["values.a"];
        if (!isLink(aLink)) continue;
        const prim = api[aLink[0]];
        const pv = prim?.inputs?.value;
        if (
          (prim?.class_type === "PrimitiveInt" ||
            prim?.class_type === "PrimitiveFloat") &&
          typeof pv === "number"
        ) {
          secondsPrimitive = {
            node: aLink[0],
            field: "value",
            value: pv,
            isFloat: prim.class_type === "PrimitiveFloat",
          };
          break outer;
        }
      }
    }
  }
  if (secondsPrimitive) {
    const s = secondsPrimitive;
    params.push(
      s.isFloat
        ? {
            type: "float",
            key: "duration",
            label: "Duration",
            default: s.value,
            min: 1,
            max: 20,
            step: 0.5,
            bind: { node: s.node, field: s.field },
          }
        : {
            type: "int",
            key: "duration",
            label: "Duration",
            default: Math.round(s.value),
            min: 1,
            max: 20,
            bind: { node: s.node, field: s.field },
          },
    );
  }
  if (frameInputs.length > 0 && model.kind === "video") {
    const fpsIn = literalInputs(api, /^(fps|frame_rate)$/);
    const fps = fpsIn[0]?.value ?? 24;
    const def = frameInputs[0];
    const step = (def.value - 1) % 8 === 0 ? 8 : (def.value - 1) % 4 === 0 ? 4 : 1;
    const defSecs = Math.round(((def.value - 1) / fps) * 10) / 10;
    const secs = Array.from(new Set([defSecs, 3, 5, 8])).filter(
      (s) => s > 0 && s <= 20,
    );
    const seenF = new Set<number>();
    const options = secs
      .map((s) => Math.round((s * fps) / step) * step + 1)
      .filter((f) => {
        if (seenF.has(f)) return false;
        seenF.add(f);
        return true;
      })
      .map((f) => ({
        value: String(Math.round(((f - 1) / fps) * 10) / 10),
        label: `${Math.round(((f - 1) / fps) * 10) / 10}s`,
        set: frameInputs.map((fi) => ({
          node: fi.node,
          field: fi.field,
          value: f,
        })),
      }));
    params.push({
      type: "choice",
      key: "duration",
      label: "Duration",
      default: String(defSecs),
      options,
    });
  }

  // steps / cfg: only when exactly one unlinked input exists.
  const stepInputs = literalInputs(api, /^steps$/);
  if (stepInputs.length === 1) {
    const s = stepInputs[0];
    params.push({
      type: "int",
      key: "steps",
      label: "Steps",
      default: Math.round(s.value),
      min: 1,
      max: Math.max(10, Math.round(s.value) * 3),
      advanced: true,
      bind: { node: s.node, field: s.field },
    });
  }
  const cfgInputs = literalInputs(api, /^(cfg|guidance)$/);
  if (cfgInputs.length === 1) {
    const c = cfgInputs[0];
    params.push({
      type: "float",
      key: "cfg",
      label: "CFG",
      default: c.value,
      min: 1,
      max: Math.max(4, c.value * 2),
      step: 0.1,
      advanced: true,
      bind: { node: c.node, field: c.field },
    });
  }

  const candidate = {
    id,
    name: `${model.label} ${MODE_LABELS[mode].toLowerCase()}`,
    description: `${MODE_LABELS[mode]} on ${model.label}.`,
    category: model.kind,
    order: 50,
    engine: "workflow",
    model: { id: model.id, label: model.label, license: "open" },
    source: { template: source },
    inputs,
    params,
    outputs,
  };
  const parsed = presetSchema.safeParse(candidate);
  if (!parsed.success) {
    problems.push(
      `schema: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
    return { preset: null, problems, models };
  }
  return { preset: parsed.data, problems, models };
}

export type ToolDetection = Detection & {
  /** Frame-count literals, each capped at its own template default. */
  frames?: (PresetBind & { cap: number })[];
  /** A fixed output size the probe-derived dims replace. */
  size?: {
    width: { node: string; field: string; value: number };
    height: { node: string; field: string; value: number };
  };
  /** A literal CreateVideo fps: the input must be conformed to it. */
  inputFps?: number;
  /** ImagePadForOutpaint node for the reframe tool's derived pads. */
  padsNode?: string;
};

/**
 * A number literal behind an input: either the input itself or the
 * `value` of a linked PrimitiveInt/PrimitiveFloat (Wan templates wire
 * Length/Width/Height primitives into the sampler).
 */
function resolveLiteral(
  api: WorkflowApiGraph,
  nodeId: string,
  field: string,
): { node: string; field: string; value: number } | null {
  const v = api[nodeId]?.inputs?.[field];
  if (typeof v === "number") return { node: nodeId, field, value: v };
  if (isLink(v)) {
    const src = api[v[0]];
    const pv = src?.inputs?.value;
    if (
      /^Primitive(Int|Float)/.test(src?.class_type ?? "") &&
      typeof pv === "number"
    ) {
      return { node: v[0], field: "value", value: pv };
    }
  }
  return null;
}

/**
 * Detect a Preset for an edit tool template: one LoadVideo source, one
 * Save-video output, optional prompt/seed/reference params, and runtime
 * derived binds (frame counts, outpaint pads). Prompt and seed are only
 * required when the tool asks for them.
 */
export function detectToolPreset(
  tool: EditTool,
  api: WorkflowApiGraph,
  ui: UiWorkflowDoc,
  objectInfo: ObjectInfo,
): ToolDetection {
  const problems: string[] = [];
  const id = toolPresetId(tool);

  const models: DetectedModel[] = [];
  for (const node of ui.nodes ?? []) {
    for (const m of node.properties?.models ?? []) {
      if (m.name && m.url) models.push({ name: m.name, url: m.url });
    }
  }

  // Output: exactly one Save-style node producing video.
  const saveNodes = Object.entries(api).filter(([, n]) =>
    /^Save(Image|Video|WEBM|AnimatedWEBP|AnimatedPNG)/.test(n.class_type ?? ""),
  );
  const videoSaves = saveNodes.filter(([, n]) =>
    /Video|WEBM/i.test(n.class_type ?? ""),
  );
  const outputs: Preset["outputs"] = [];
  if (videoSaves.length !== 1) {
    problems.push(
      `output: expected one Save video node, found ${videoSaves.length}`,
    );
  } else {
    outputs.push({ node: videoSaves[0][0], kind: "video" });
  }

  // Input: exactly one LoadVideo node.
  const loadVideos = Object.keys(api).filter(
    (id) => api[id].class_type === "LoadVideo",
  );
  const inputs: Preset["inputs"] = [];
  if (loadVideos.length !== 1) {
    problems.push(
      `video input: expected one LoadVideo node, found ${loadVideos.length}`,
    );
  } else {
    inputs.push({
      key: "video",
      type: "video",
      label: "Source video",
      required: true,
      bind: { node: loadVideos[0], field: "file" },
    });
  }

  // Reference image: a linked LoadImage when the tool wants one. Required
  // whenever something consumes it — the template's stock filename would
  // fail at run.
  const loadImages = Object.keys(api).filter(
    (id) => api[id].class_type === "LoadImage",
  );
  if (tool.controls?.reference && loadImages.length === 0) {
    problems.push("reference: expected a LoadImage node, found none");
  }
  if (loadImages.length > 0) {
    const id0 = loadImages[0];
    const used = consumerInputNames(api, id0).length > 0;
    inputs.push({
      key: "reference",
      type: "image",
      label: "Reference image",
      required: used,
      bind: { node: id0, field: "image" },
    });
  }

  const params: Preset["params"] = [];

  // Prompt: the hint node (e.g. SAM3 detect text on Remove) wins; otherwise
  // trace the positive conditioning like the model modes do.
  if (tool.prompt) {
    let promptBind: { node: string; field: string; value: string } | null = null;
    if (tool.promptHint) {
      const hit = Object.entries(api).find(([, n]) =>
        tool.promptHint!.nodeClass.test(n.class_type ?? ""),
      );
      if (hit) {
        const direct = hit[1].inputs?.[tool.promptHint.field];
        if (typeof direct === "string") {
          promptBind = {
            node: hit[0],
            field: tool.promptHint.field,
            value: direct,
          };
        } else {
          // e.g. SAM3_Detect: the object name lives in the text encode
          // upstream of its `conditioning` input.
          promptBind =
            traceText(api, { nodeId: hit[0], input: "conditioning" }) ??
            traceText(api, { nodeId: hit[0], input: "text" });
        }
      }
    }
    if (!promptBind) {
      const condSink =
        Object.entries(api).find(
          ([, n]) => isLink(n.inputs?.positive) && isLink(n.inputs?.negative),
        ) ??
        Object.entries(api).find(([, n]) => isLink(n.inputs?.positive)) ??
        Object.entries(api).find(([, n]) => isLink(n.inputs?.conditioning));
      if (condSink) {
        promptBind =
          traceText(api, { nodeId: condSink[0], input: "positive" }) ??
          traceText(api, { nodeId: condSink[0], input: "conditioning" });
      }
    }
    if (!promptBind) {
      problems.push("prompt: no text input found");
    } else {
      params.push({
        type: "text",
        key: "prompt",
        label: tool.promptHint ? "What to remove" : "Prompt",
        default: promptBind.value,
        placeholder: "Describe it",
        bind: { node: promptBind.node, field: promptBind.field },
      });
    }
  }

  // Seed: bound when present, never required for tools.
  const seedBinds = literalInputs(api, /^(seed|noise_seed)$/).map(
    (s) => ({ node: s.node, field: s.field }),
  );
  if (seedBinds.length > 0) {
    params.push({
      type: "seed",
      key: "seed",
      label: "Seed",
      bind: seedBinds.length === 1 ? seedBinds[0] : seedBinds,
    });
  }

  // Frame-count inputs feeding a sampler or a Video Slice, literal or
  // linked to a Length primitive: rewritten at run time to the prepared
  // clip's frame count, capped at each template default.
  const frameInputs = Object.entries(api).flatMap(([nodeId, n]) =>
    Object.keys(n.inputs ?? {})
      .filter((f) =>
        /^(length|num_frames|frames|frame_count|slice_length|slice_count|frame_load_cap)$/.test(
          f,
        ),
      )
      .map((f) => resolveLiteral(api, nodeId, f)),
  );
  const frames = frameInputs
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .map((f) => ({ node: f.node, field: f.field, cap: f.value }));
  const frameBinds = frames.length > 0 ? frames : undefined;

  // Output size: one node with resolvable width+height literals wins. When
  // both dims resolve on more than one node the control is ambiguous.
  const sizePairs = Object.keys(api).flatMap((nodeId) => {
    const w = resolveLiteral(api, nodeId, "width");
    const h = resolveLiteral(api, nodeId, "height");
    return w && h ? [{ width: w, height: h }] : [];
  });
  const size = sizePairs.length === 1 ? sizePairs[0] : undefined;

  // A literal CreateVideo fps fixes the output frame rate; the input clip is
  // re-encoded to it before queueing.
  const fpsLit = Object.keys(api)
    .filter((id) => api[id].class_type === "CreateVideo")
    .map((id) => resolveLiteral(api, id, "fps"))
    .find((f) => f !== null);
  const inputFps = fpsLit?.value;

  // Reframe: the ImagePadForOutpaint node takes pads derived from the source
  // size and the chosen target aspect; the aspect itself is a bind-free
  // choice the runner consumes.
  let padsNode: string | undefined;
  const padNodes = Object.keys(api).filter(
    (id) => api[id].class_type === "ImagePadForOutpaint",
  );
  if (tool.controls?.aspect) {
    if (padNodes.length === 0) {
      problems.push("aspect: no ImagePadForOutpaint node found");
    } else {
      padsNode = padNodes[0];
      params.push({
        type: "choice",
        key: "aspect",
        label: "Aspect",
        default: REFRAME_ASPECTS[0],
        options: REFRAME_ASPECTS.map((a) => ({ value: a, label: a })),
      });
    }
  }

  // FPS boost: the multiplier literal, or the primitive behind a linked
  // multiplier input (the interpolation template wires a PrimitiveInt).
  if (tool.controls?.multiplier) {
    let mult = literalInputs(api, /^(multiplier|factor|interpolation_factor)$/);
    if (mult.length === 0) {
      const linked = Object.entries(api).flatMap(([nodeId, n]) =>
        Object.entries(n.inputs ?? {})
          .filter(
            ([f, v]) =>
              /^(multiplier|factor|interpolation_factor)$/.test(f) && isLink(v),
          )
          .map(([f, v]) => ({ node: nodeId, field: f, src: (v as [string, number])[0] })),
      );
      for (const l of linked) {
        const prim = api[l.src];
        const pv = prim?.inputs?.value;
        if (
          (prim?.class_type === "PrimitiveInt" ||
            prim?.class_type === "PrimitiveFloat") &&
          typeof pv === "number"
        ) {
          mult = [{ node: l.src, field: "value", value: pv }];
        }
      }
    }
    if (mult.length === 1 && [2, 4].includes(mult[0].value)) {
      const m = mult[0];
      params.push({
        type: "choice",
        key: "multiplier",
        label: "Multiplier",
        default: m.value,
        options: [2, 4].map((v) => ({
          value: v,
          label: `${v}x`,
        })),
        bind: { node: m.node, field: m.field },
      });
    } else if (mult.length > 1) {
      problems.push(`multiplier: ambiguous, ${mult.length} candidates`);
    }
  }

  // Upscale: a lone resolution combo controls the output size.
  if (tool.controls?.size) {
    const sizeFields = Object.entries(api).flatMap(([nodeId, n]) =>
      Object.entries(n.inputs ?? {})
        .filter(
          ([field, v]) => /^resolution$/i.test(field) && !isLink(v),
        )
        .map(([field, v]) => ({ node: nodeId, field, value: v, cls: n.class_type ?? "" })),
    );
    if (sizeFields.length === 1) {
      const s = sizeFields[0];
      const spec =
        objectInfo.nodes[s.cls]?.input?.required?.[s.field] ??
        objectInfo.nodes[s.cls]?.input?.optional?.[s.field];
      const options = spec
        ? (comboOptions(spec) ?? []).filter(
            (o): o is string | number => typeof o === "string" || typeof o === "number",
          )
        : [];
      if (options.length > 0 && options.includes(s.value as string | number)) {
        params.push({
          type: "choice",
          key: "size",
          label: "Resolution",
          default: s.value as string | number,
          options: options.map((o) => ({ value: o, label: String(o) })),
          bind: { node: s.node, field: s.field },
        });
      }
    }
  }

  const candidate = {
    id,
    name: tool.label,
    description: tool.description,
    category: "edit",
    order: 60,
    engine: "workflow",
    model: { id: tool.id, label: tool.label, license: "open" },
    source: { template: tool.template ?? "" },
    inputs,
    params,
    outputs,
  };
  const parsed = presetSchema.safeParse(candidate);
  if (!parsed.success) {
    problems.push(
      `schema: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
    return { preset: null, problems, models };
  }
  return {
    preset: parsed.data,
    problems,
    models,
    frames: frameBinds,
    size,
    inputFps,
    padsNode,
  };
}
