/** Pure ffmpeg arg builder for the editor's full render (mp4 H.264/AAC). */
import { layout, transitionFrames, type Media, type Sequence } from "./model";
import { outputSize, type Fps } from "./timecode";

export type RenderMedia = {
  id: string;
  absPath: string;
  kind: Media["kind"];
  hasAudio: boolean;
};

export type RenderCommand = {
  args: string[];
  /** Total output frames, for progress. */
  totalFrames: number;
};

const TITLE_SIZES = { s: 0.035, m: 0.05, l: 0.075 } as const;

/**
 * Escape text for drawtext inside a filter_complex graph. The value is
 * emitted inside '...' quotes, so backslash, quote and percent need one
 * level of escaping each.
 */
export function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    // % needs two levels: '\\%' unescapes to '\%' for drawtext.
    .replace(/%/g, "\\\\%")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/]/g, "\\]")
    .replace(/;/g, "\\;");
}

const sec = (frames: number, fps: Fps) => frames / fps;
const fmt = (n: number) => {
  const s = String(Math.round(n * 1000) / 1000);
  return s === "-0" ? "0" : s;
};

function sizeFilter(
  w: number,
  h: number,
  fit: Sequence["fit"],
): string {
  return fit === "cover"
    ? `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`
    : `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;
}

/**
 * Build one ffmpeg invocation rendering the whole sequence: video clips with
 * cuts, crossfades and dips, per-clip audio with volume/fades, the audio lane
 * delayed into the mix, and drawtext titles.
 */
export function buildRenderCommand(
  seq: Sequence,
  media: Map<string, RenderMedia>,
  { fontFile, out }: { fontFile: string; out: string },
): RenderCommand {
  const fps = seq.fps;
  const [w, h] = outputSize(seq.aspect, seq.resolution);
  const lay = layout(seq);
  const filters: string[] = [];
  const inputs: string[] = [];

  // One input per media used by video clips, stills looped.
  const mediaIndex = new Map<string, number>();
  let inputCount = 0;
  const pushInput = (m: RenderMedia) => {
    if (mediaIndex.has(m.id)) return;
    if (m.kind === "image") {
      inputs.push("-loop", "1", "-framerate", String(fps), "-i", m.absPath);
    } else {
      inputs.push("-i", m.absPath);
    }
    mediaIndex.set(m.id, inputCount++);
  };
  for (const clip of seq.clips) {
    const m = media.get(clip.mediaId);
    if (!m) throw new Error(`Missing media ${clip.mediaId}`);
    pushInput(m);
  }
  for (const a of seq.audio) {
    const m = media.get(a.mediaId);
    if (!m) throw new Error(`Missing media ${a.mediaId}`);
    pushInput(m);
  }
  // Silence source for clips without an audio stream and an empty audio lane.
  const silenceIdx = inputCount;
  inputs.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo");

  // A stream can only feed one filter: split inputs shared between clips.
  const usage = new Map<string, { v: number; a: number }>();
  const usageOf = (id: string) => usage.get(id) ?? { v: 0, a: 0 };
  for (const c of seq.clips) { const u = usageOf(c.mediaId); u.v++; u.a++; usage.set(c.mediaId, u); }
  for (const a of seq.audio) { const u = usageOf(a.mediaId); u.a++; usage.set(a.mediaId, u); }
  const silentClips =
    seq.clips.filter((c) => !media.get(c.mediaId)!.hasAudio).length +
    seq.audio.filter((a) => !media.get(a.mediaId)!.hasAudio).length;

  const vSlot = new Map<string, number>();
  const aSlot = new Map<string, number>();
  for (const [id, idx] of mediaIndex) {
    const u = usage.get(id)!;
    if (u.v > 1) {
      filters.push(
        `[${idx}:v]split=${u.v}${Array.from({ length: u.v }, (_, k) => `[vs${idx}_${k}]`).join("")}`,
      );
    }
    if (u.a > 1 && media.get(id)?.hasAudio) {
      filters.push(
        `[${idx}:a]asplit=${u.a}${Array.from({ length: u.a }, (_, k) => `[as${idx}_${k}]`).join("")}`,
      );
    }
  }
  if (silentClips > 1) {
    filters.push(
      `[${silenceIdx}:a]asplit=${silentClips}${Array.from({ length: silentClips }, (_, k) => `[s_${k}]`).join("")}`,
    );
  }
  let silenceUsed = 0;
  const vIn = (id: string) => {
    const idx = mediaIndex.get(id)!;
    const u = usage.get(id)!;
    if (u.v <= 1) return `${idx}:v`;
    const k = vSlot.get(id) ?? 0;
    vSlot.set(id, k + 1);
    return `vs${idx}_${k}`;
  };
  const aIn = (m: RenderMedia) => {
    if (!m.hasAudio) {
      return silentClips > 1 ? `s_${silenceUsed++}` : `${silenceIdx}:a`;
    }
    const idx = mediaIndex.get(m.id)!;
    const u = usage.get(m.id)!;
    if (u.a <= 1) return `${idx}:a`;
    const k = aSlot.get(m.id) ?? 0;
    aSlot.set(m.id, k + 1);
    return `as${idx}_${k}`;
  };

  // Per-clip video + audio chains.
  seq.clips.forEach((clip, i) => {
    const m = media.get(clip.mediaId)!;
    const vi = vIn(clip.mediaId);
    const next = seq.clips[i + 1];
    const len = clip.out - clip.in;
    const dip = next ? transitionFrames(clip, next) : 0;
    const parts = [
      `fps=${fps}`,
      `trim=start_frame=${clip.in}:end_frame=${clip.out}`,
      // settb so xfade/concat links share a timebase.
      "setpts=PTS-STARTPTS",
      "settb=AVTB",
      sizeFilter(w, h, seq.fit),
    ];
    const fadeIn = Math.max(
      clip.fadeIn,
      i > 0 && seq.clips[i - 1].transition.type === "dip"
        ? transitionFrames(seq.clips[i - 1], clip)
        : 0,
    );
    const fadeOut = Math.max(
      clip.fadeOut,
      clip.transition.type === "dip" ? dip : 0,
    );
    if (fadeIn > 0) {
      parts.push(`fade=t=in:st=0:d=${fmt(sec(fadeIn, fps))}`);
    }
    if (fadeOut > 0) {
      parts.push(
        `fade=t=out:st=${fmt(sec(len - fadeOut, fps))}:d=${fmt(sec(fadeOut, fps))}`,
      );
    }
    filters.push(`[${vi}]${parts.join(",")}[v${i}]`);

    // Audio: the media stream when it has one, silence otherwise.
    const volume = clip.muted ? 0 : clip.volume;
    const audioChain = [
      `atrim=start=${fmt(sec(clip.in, fps))}:end=${fmt(sec(clip.out, fps))}`,
      "asetpts=PTS-STARTPTS",
    ];
    if (fadeIn > 0) audioChain.push(`afade=t=in:st=0:d=${fmt(sec(fadeIn, fps))}`);
    if (fadeOut > 0) {
      audioChain.push(
        `afade=t=out:st=${fmt(sec(len - fadeOut, fps))}:d=${fmt(sec(fadeOut, fps))}`,
      );
    }
    audioChain.push(`volume=${fmt(volume)}`);
    if (m.hasAudio) {
      filters.push(`[${aIn(m)}]${audioChain.join(",")}[a${i}]`);
    } else {
      // atrim on silence needs a bounded span; trim to the clip length.
      filters.push(
        `[${aIn(m)}]atrim=start=0:end=${fmt(sec(len, fps))},asetpts=PTS-STARTPTS,volume=${fmt(volume)}[a${i}]`,
      );
    }
  });

  // Join video + audio pairs at every boundary.
  if (seq.clips.length === 1) {
    filters.push(`[v0]format=yuv420p[vout]`, `[a0]anull[aout]`);
  } else {
    let v = "[v0]";
    let a = "[a0]";
    for (let i = 0; i < seq.clips.length - 1; i++) {
      const clip = seq.clips[i];
      const next = seq.clips[i + 1];
      const trans =
        clip.transition.type === "crossfade" ? transitionFrames(clip, next) : 0;
      const outV = `[x${i}v]`;
      const outA = `[x${i}a]`;
      if (trans > 0) {
        filters.push(
          `${v}[v${i + 1}]xfade=transition=fade:duration=${fmt(sec(trans, fps))}:offset=${fmt(sec(lay.clips[i + 1].recordIn, fps))}${outV}`,
          `${a}[a${i + 1}]acrossfade=d=${fmt(sec(trans, fps))}:c1=tri:c2=tri${outA}`,
        );
      } else {
        filters.push(
          `${v}[v${i + 1}]concat=n=2:v=1:a=0${outV}`,
          `${a}[a${i + 1}]concat=n=2:v=0:a=1${outA}`,
        );
      }
      v = outV;
      a = outA;
    }
    filters.push(`${v}format=yuv420p[vout]`, `${a}anull[aout]`);
  }

  // Audio lane: delay each clip to its record start, mix over the track.
  const musicIns: string[] = [];
  seq.audio.forEach((clip, i) => {
    const m = media.get(clip.mediaId)!;
    const len = clip.out - clip.in;
    const chain = [
      `atrim=start=${fmt(sec(clip.in, fps))}:end=${fmt(sec(clip.out, fps))}`,
      "asetpts=PTS-STARTPTS",
      `volume=${fmt(clip.volume)}`,
    ];
    if (clip.fadeIn > 0) {
      chain.push(`afade=t=in:st=0:d=${fmt(sec(clip.fadeIn, fps))}`);
    }
    if (clip.fadeOut > 0) {
      chain.push(
        `afade=t=out:st=${fmt(sec(len - clip.fadeOut, fps))}:d=${fmt(sec(clip.fadeOut, fps))}`,
      );
    }
    const ms = Math.round(sec(clip.start, fps) * 1000);
    chain.push(`adelay=${ms}|${ms}`);
    filters.push(`[${aIn(m)}]${chain.join(",")}[m${i}]`);
    musicIns.push(`[m${i}]`);
  });
  const mixInputs = ["[aout]", ...musicIns];
  filters.push(
    `${mixInputs.join("")}amix=inputs=${mixInputs.length}:normalize=0[mixed]`,
    // A music tail must not extend past the video.
    `[mixed]atrim=start=0:end=${fmt(sec(lay.totalFrames, fps))}[aud]`,
  );

  // Titles, composited in record time.
  const font = fontFile.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "");
  const fontArg = fontFile ? `fontfile='${font}':` : "";
  let vout = "vout";
  seq.titles.forEach((t, i) => {
    const size = Math.round(h * TITLE_SIZES[t.size]);
    const y =
      t.position === "top"
        ? `h*0.07`
        : t.position === "center"
          ? `(h-text_h)/2`
          : `h*0.75`;
    const next = `[t${i}v]`;
    filters.push(
      `[${vout}]drawtext=${fontArg}text='${escapeDrawtext(t.text)}':fontsize=${size}:x=(w-text_w)/2:y=${y}:fontcolor=white:shadowcolor=black@0.6:shadowx=1:shadowy=1:enable='between(t,${fmt(sec(t.start, fps))},${fmt(sec(t.start + t.duration, fps))})'${next}`,
    );
    vout = `t${i}v`;
  });

  const args = [
    "-y",
    "-hide_banner",
    "-nostats",
    "-progress", "pipe:1",
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", `[${vout}]`,
    "-map", "[aud]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-r", String(fps),
    out,
  ];
  return { args, totalFrames: lay.totalFrames };
}
