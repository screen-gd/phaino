import type { Preset } from "@/server/presets/schema";
import type { ListedPreset } from "@/server/presets/load";
import { presetPreview } from "@/lib/preset-preview";

/** Serializable preset data for ToolStudio — no bind node ids. */
export type StudioParam =
  | {
      type: "text";
      key: string;
      label: string;
      default: string;
      placeholder?: string;
      advanced?: boolean;
    }
  | { type: "seed"; key: string; label: string; advanced?: boolean }
  | {
      type: "choice";
      key: string;
      label: string;
      default: string | number | boolean;
      options: { value: string | number | boolean; label: string }[];
      advanced?: boolean;
    }
  | {
      type: "int";
      key: string;
      label: string;
      default: number;
      min: number;
      max: number;
      advanced?: boolean;
    }
  | {
      type: "float";
      key: string;
      label: string;
      default: number;
      min: number;
      max: number;
      step: number;
      advanced?: boolean;
    };

export type StudioInput = {
  key: string;
  label: string;
  required: boolean;
};

export type StudioPreset = {
  id: string;
  name: string;
  description: string;
  chip?: string;
  model: { id: string; label: string };
  isFork?: boolean;
  partner?: boolean;
  estimate?: { count: number; medianSeconds: number | null };
  thumbUrl: string;
  inputs: StudioInput[];
  params: StudioParam[];
};

export type JobStatusClient =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

/** The jobs API row shape, mirrored for the client. */
export type StudioJob = {
  id: string;
  presetId: string;
  category: string;
  status: JobStatusClient;
  params: Record<string, string | number | boolean>;
  inputs: Record<string, string>;
  comfyJobId: string | null;
  progress: number;
  message: string | null;
  error: string | null;
  outputs: string[];
  createdAt: string;
  updatedAt: string;
};

/** Map a server preset to the serializable ToolStudio shape. */
export function toStudioPreset(p: Preset | ListedPreset): StudioPreset {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    chip: p.chip,
    model: { id: p.model.id, label: p.model.label },
    isFork: "origin" in p ? p.origin === "fork" : undefined,
    partner: p.model.license === "partner",
    thumbUrl: presetPreview(p),
    inputs: p.inputs.map(({ key, label, required }) => ({ key, label, required })),
    params: p.params.map((param): StudioParam => {
      switch (param.type) {
        case "text":
          return {
            type: "text",
            key: param.key,
            label: param.label,
            default: param.default,
            placeholder: param.placeholder,
            advanced: param.advanced,
          };
        case "seed":
          return { type: "seed", key: param.key, label: param.label };
        case "choice":
          return {
            type: "choice",
            key: param.key,
            label: param.label,
            default: param.default,
            options: param.options.map((o) => ({
              value: o.value,
              label: o.label,
            })),
            advanced: param.advanced,
          };
        case "int":
          return {
            type: "int",
            key: param.key,
            label: param.label,
            default: param.default,
            min: param.min,
            max: param.max,
            advanced: param.advanced,
          };
        case "float":
          return {
            type: "float",
            key: param.key,
            label: param.label,
            default: param.default,
            min: param.min,
            max: param.max,
            step: param.step,
            advanced: param.advanced,
          };
      }
    }),
  };
}

