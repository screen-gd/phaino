import "server-only";

import path from "node:path";
import { ApiError } from "@/server/errors";
import { getEnv, type StudioEnv } from "@/server/env";
import { resolveOutput } from "@/server/outputs";
import { QueuedJsonFile } from "@/server/jsonFile";
import {
  CUT,
  emptySequence,
  mediaFor,
  mediaFrames,
  normalizeSequence,
  parseSequence,
  rescaleSequence,
  type AudioClip,
  type Clip,
  type Media,
  type Sequence,
  type Title,
} from "./model";
import { makePoster, probeAudio, probeVideo } from "./probe";
import { snapFps, snapResolution, secondsToFrames, type Fps } from "./timecode";

function bad(message: string): ApiError {
  return new ApiError({
    code: "invalid_input",
    operation: "sequence",
    message,
  });
}

const UPLOAD_TYPES: Record<string, Media["kind"]> = {
  ".mp4": "video",
  ".mov": "video",
  ".webm": "video",
  ".m4a": "audio",
  ".mp3": "audio",
  ".wav": "audio",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
};

export const UPLOAD_EXTS = Object.keys(UPLOAD_TYPES);
export const UPLOAD_MAX_BYTES = 500 * 1024 * 1024;

/**
 * Resolve a media path to an absolute file: a generated output (relPath under
 * outputs/) or an editor upload (uploads/editor/...). Rejects `..` escapes and
 * unknown types.
 */
export function resolveMediaPath(
  dataDir: string,
  relPath: string,
): { absPath: string; kind: Media["kind"] } {
  if (typeof relPath !== "string" || relPath.length === 0) {
    throw bad("Missing media path");
  }
  if (path.isAbsolute(relPath)) throw bad("Absolute paths are not allowed");
  if (relPath.startsWith("uploads/")) {
    const root = path.join(dataDir, "uploads", "editor");
    const abs = path.resolve(dataDir, relPath);
    const rel = path.relative(root, abs);
    if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
      throw bad("Path escapes the uploads directory");
    }
    const kind = UPLOAD_TYPES[path.extname(abs).toLowerCase()];
    if (!kind) throw bad("Unsupported file type");
    return { absPath: abs, kind };
  }
  const resolved = resolveOutput(dataDir, relPath);
  return { absPath: resolved.absPath, kind: resolved.kind };
}

export type SequencePatch = {
  fps?: Fps;
  resolution?: "1080p" | "4K";
  aspect?: Sequence["aspect"];
  fit?: Sequence["fit"];
  handles?: 0 | 12 | 24;
  /** Full replacements; clip ids may be new (split/duplicate reuse mediaIds). */
  clips?: (Omit<Clip, "volume" | "muted" | "fadeIn" | "fadeOut" | "transition"> &
    Partial<Clip>)[];
  audio?: (Omit<AudioClip, "volume" | "fadeIn" | "fadeOut"> &
    Partial<AudioClip>)[];
  titles?: Title[];
};

const newClipDefaults = {
  volume: 1,
  muted: false,
  fadeIn: 0,
  fadeOut: 0,
  transition: { ...CUT },
};

/** Probe a file and build the media entry (poster for video/image). */
async function probeMedia(
  env: StudioEnv,
  absPath: string,
  relPath: string,
  kind: Media["kind"],
): Promise<Media> {
  const id = crypto.randomUUID();
  if (kind === "audio") {
    const p = await probeAudio(absPath);
    return {
      id,
      path: relPath,
      name: path.basename(relPath),
      kind,
      srcFps: 0,
      width: 0,
      height: 0,
      durationSec: p.durationSec,
      hasAudio: true,
    };
  }
  if (kind === "image") {
    return {
      id,
      path: relPath,
      name: path.basename(relPath),
      kind,
      srcFps: 0,
      width: 0,
      height: 0,
      // Still: trimmable up to 60 s.
      durationSec: 60,
      hasAudio: false,
    };
  }
  const p = await probeVideo(absPath);
  await makePoster(absPath, path.join(env.dataDir, "posters", `${id}.jpg`));
  return {
    id,
    path: relPath,
    name: path.basename(relPath),
    kind,
    srcFps: p.fps,
    width: p.width,
    height: p.height,
    durationSec: p.durationSec,
    hasAudio: p.hasAudio,
  };
}

/**
 * The single-user sequence at ${dataDir}/sequence.json (version 2).
 * `env` is injectable for tests; defaults to getEnv().
 */
export function openSequenceStore(env: StudioEnv = getEnv()) {
  const file = new QueuedJsonFile<Sequence>(
    path.join(env.dataDir, "sequence.json"),
    emptySequence,
  );

  const parse = (raw: unknown): Sequence =>
    parseSequence(raw) ?? emptySequence();

  async function read(): Promise<Sequence> {
    return parse(await file.read());
  }

  async function importMedia(relPath: string): Promise<Media> {
    const resolved = resolveMediaPath(env.dataDir, relPath);
    return file.update(async (data) => {
      const seq = parse(data);
      const existing = seq.media.find(
        (m) => m.path === relPath && m.kind === resolved.kind,
      );
      if (existing) {
        Object.assign(data, seq);
        return existing;
      }
      const media = await probeMedia(
        env,
        resolved.absPath,
        relPath,
        resolved.kind,
      );
      const next = { ...seq, media: [...seq.media, media] };
      Object.assign(data, next);
      return media;
    });
  }

  return {
    getSequence: read,

    async updateSequence(patch: SequencePatch): Promise<Sequence> {
      return file.update(async (data) => {
        const seq = parse(data);
        let next = seq;
        if (
          patch.fps !== undefined ||
          patch.resolution !== undefined ||
          patch.aspect !== undefined ||
          patch.fit !== undefined ||
          patch.handles !== undefined
        ) {
          if (patch.fps !== undefined) next = rescaleSequence(next, patch.fps);
          next = {
            ...next,
            resolution: patch.resolution ?? next.resolution,
            aspect: patch.aspect ?? next.aspect,
            fit: patch.fit ?? next.fit,
            handles: patch.handles ?? next.handles,
            settingsTouched: true,
          };
        }
        const requireMedia = (id: string, lane: "video" | "audio") => {
          const m = mediaFor(next, id);
          if (!m) throw bad(`Unknown media "${id}"`);
          if (lane === "video" && m.kind === "audio") {
            throw bad(`Audio media "${id}" cannot join the video track`);
          }
          if (lane === "audio" && m.kind === "image") {
            throw bad(`Image media "${id}" cannot join the audio track`);
          }
        };
        if (patch.clips !== undefined) {
          for (const c of patch.clips) requireMedia(c.mediaId, "video");
          next = {
            ...next,
            clips: patch.clips.map((c) => ({ ...newClipDefaults, ...c })),
          };
        }
        if (patch.audio !== undefined) {
          for (const a of patch.audio) requireMedia(a.mediaId, "audio");
          next = {
            ...next,
            audio: patch.audio.map((a) => ({ ...a, volume: a.volume ?? 1, fadeIn: a.fadeIn ?? 0, fadeOut: a.fadeOut ?? 0 })),
          };
        }
        if (patch.titles !== undefined) {
          next = { ...next, titles: patch.titles };
        }
        const normalized = normalizeSequence(next);
        Object.assign(data, normalized);
        return normalized;
      });
    },

    /** Import a media file (dedupes by path+kind) and return its entry. */
    importMedia,

    /**
     * Import + append: video/image to the end of the video track (images as a
     * 3 s still), audio to the end of the audio track.
     */
    async appendClip(relPath: string): Promise<Sequence> {
      const media = await importMedia(relPath);
      return file.update(async (data) => {
        const seq = parse(data);
        const wasEmpty = seq.clips.length === 0;
        const fps =
          wasEmpty && !seq.settingsTouched && media.kind === "video" && media.srcFps > 0
            ? snapFps(media.srcFps)
            : seq.fps;
        const resolution =
          wasEmpty && !seq.settingsTouched && media.width > 0
            ? snapResolution(media.width, media.height)
            : seq.resolution;
        let next: Sequence = { ...seq, fps, resolution };
        if (media.kind === "audio") {
          const end = seq.audio.reduce((m, a) => Math.max(m, a.start + (a.out - a.in)), 0);
          const clip: AudioClip = {
            id: crypto.randomUUID(),
            mediaId: media.id,
            start: end,
            in: 0,
            out: mediaFrames(media, fps),
            volume: 1,
            fadeIn: 0,
            fadeOut: 0,
          };
          next = { ...next, audio: [...seq.audio, clip] };
        } else {
          const len =
            media.kind === "image"
              ? secondsToFrames(3, fps)
              : mediaFrames(media, fps);
          const clip: Clip = {
            id: crypto.randomUUID(),
            mediaId: media.id,
            in: 0,
            out: len,
            volume: 1,
            muted: false,
            fadeIn: 0,
            fadeOut: 0,
            transition: { ...CUT },
          };
          next = { ...next, clips: [...seq.clips, clip] };
        }
        const normalized = normalizeSequence(next);
        Object.assign(data, normalized);
        return normalized;
      });
    },

    async removeClip(id: string): Promise<Sequence> {
      return file.update(async (data) => {
        const seq = parse(data);
        if (!seq.clips.some((c) => c.id === id)) throw bad("Unknown clip");
        const normalized = normalizeSequence({
          ...seq,
          clips: seq.clips.filter((c) => c.id !== id),
        });
        Object.assign(data, normalized);
        return normalized;
      });
    },

    /** Drop the media plus every clip and audio clip that uses it. */
    async removeMedia(id: string): Promise<Sequence> {
      return file.update(async (data) => {
        const seq = parse(data);
        if (!mediaFor(seq, id)) throw bad("Unknown media");
        const normalized = normalizeSequence({
          ...seq,
          media: seq.media.filter((m) => m.id !== id),
          clips: seq.clips.filter((c) => c.mediaId !== id),
          audio: seq.audio.filter((a) => a.mediaId !== id),
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
