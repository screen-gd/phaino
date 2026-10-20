import "server-only";

import path from "node:path";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv, type StudioEnv } from "@/server/env";
import { resolveOutput } from "@/server/social/media";
import { QueuedJsonFile } from "@/server/social/store";
import {
  clampTrim,
  clipFrames,
  emptySequence,
  normalizeSequence,
  rescaleSequence,
  sequenceSchema,
  type Sequence,
} from "./model";
import { makePoster, probeVideo } from "./probe";
import { snapFps, snapResolution, type Fps } from "./timecode";

function bad(message: string): SocialError {
  return new SocialError({
    code: "invalid_input",
    operation: "sequence",
    message,
  });
}

export type SequencePatch = {
  fps?: Fps;
  resolution?: "1080p" | "4K";
  handles?: 0 | 12 | 24;
  clips?: { id: string; in: number; out: number }[];
};

/**
 * The single-user sequence at ${dataDir}/sequence.json.
 * `env` is injectable for tests; defaults to getEnv().
 */
export function openSequenceStore(env: StudioEnv = getEnv()) {
  const file = new QueuedJsonFile<Sequence>(
    path.join(env.dataDir, "sequence.json"),
    emptySequence,
  );

  async function read(): Promise<Sequence> {
    const parsed = sequenceSchema.safeParse(await file.read());
    return parsed.success ? parsed.data : emptySequence();
  }

  return {
    getSequence: read,

    async updateSequence(patch: SequencePatch): Promise<Sequence> {
      return file.update(async (data) => {
        const parsed = sequenceSchema.safeParse(data);
        let seq = parsed.success ? parsed.data : emptySequence();
        if (
          patch.fps !== undefined ||
          patch.resolution !== undefined ||
          patch.handles !== undefined
        ) {
          if (patch.fps !== undefined) seq = rescaleSequence(seq, patch.fps);
          seq = {
            ...seq,
            resolution: patch.resolution ?? seq.resolution,
            handles: patch.handles ?? seq.handles,
            settingsTouched: true,
          };
        }
        if (patch.clips !== undefined) {
          const byId = new Map(seq.clips.map((c) => [c.id, c]));
          const ids = patch.clips.map((c) => c.id);
          if (
            ids.length !== seq.clips.length ||
            ids.some((id) => !byId.has(id))
          ) {
            throw bad("clips must list every clip id exactly once");
          }
          seq = {
            ...seq,
            clips: patch.clips.map((p) => {
              const clip = byId.get(p.id)!;
              const t = clampTrim(clip, seq.fps, p.in, p.out);
              return { ...clip, in: t.in, out: t.out };
            }),
          };
        }
        const normalized = normalizeSequence(seq);
        Object.assign(data, normalized);
        return normalized;
      });
    },

    async appendClip(relPath: string): Promise<Sequence> {
      const resolved = resolveOutput(env.dataDir, relPath);
      if (resolved.kind !== "video") {
        throw bad("Only video outputs can join the sequence");
      }
      const probed = await probeVideo(resolved.absPath);
      const id = crypto.randomUUID();
      await makePoster(
        resolved.absPath,
        path.join(env.dataDir, "posters", `${id}.jpg`),
      );
      return file.update(async (data) => {
        const parsed = sequenceSchema.safeParse(data);
        const seq = parsed.success ? parsed.data : emptySequence();
        const wasEmpty = seq.clips.length === 0;
        const fps = wasEmpty && !seq.settingsTouched
          ? snapFps(probed.fps)
          : seq.fps;
        const resolution =
          wasEmpty && !seq.settingsTouched
            ? snapResolution(probed.width, probed.height)
            : seq.resolution;
        const clip = {
          id,
          path: relPath,
          name: path.basename(relPath),
          srcFps: probed.fps,
          width: probed.width,
          height: probed.height,
          durationSec: probed.durationSec,
          in: 0,
          out: 0,
        };
        clip.out = clipFrames(clip, fps);
        const normalized = normalizeSequence({
          ...seq,
          fps,
          resolution,
          clips: [...seq.clips, clip],
        });
        Object.assign(data, normalized);
        return normalized;
      });
    },

    async removeClip(id: string): Promise<Sequence> {
      return file.update(async (data) => {
        const parsed = sequenceSchema.safeParse(data);
        const seq = parsed.success ? parsed.data : emptySequence();
        if (!seq.clips.some((c) => c.id === id)) throw bad("Unknown clip");
        const normalized = normalizeSequence({
          ...seq,
          clips: seq.clips.filter((c) => c.id !== id),
        });
        Object.assign(data, normalized);
        return normalized;
      });
    },
  };
}

export type SequenceStore = ReturnType<typeof openSequenceStore>;

let cached: SequenceStore | undefined;
export function getSequenceStore(): SequenceStore {
  return (cached ??= openSequenceStore());
}
