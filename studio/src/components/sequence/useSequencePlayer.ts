"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioClip, Clip, Media } from "@/server/sequence/model";
import type { Fps } from "@/server/sequence/timecode";
import {
  clockFrame,
  layoutClips,
  locate,
  type StripLayout,
} from "./stripMath";

export function mediaUrl(mediaId: string): string {
  return `/api/sequence/media/${mediaId}`;
}

type Dir = 1 | -1;

/** The audio clip active at a record frame, if any. */
export function activeAudio(
  clips: AudioClip[],
  frame: number,
): { clip: AudioClip; offset: number } | null {
  for (const clip of clips) {
    const len = clip.out - clip.in;
    if (frame >= clip.start && frame < clip.start + len) {
      return { clip, offset: frame - clip.start };
    }
  }
  return null;
}

/** Crossfade state at a record frame: next clip index and B's opacity. */
export function crossfadeAt(
  layout: StripLayout<Clip>,
  frame: number,
): { bIndex: number; alpha: number } | null {
  for (let i = 0; i < layout.clips.length - 1; i++) {
    const a = layout.clips[i];
    const b = layout.clips[i + 1];
    const t = a.transition;
    if (t.type !== "crossfade" || t.frames <= 0) continue;
    if (frame >= b.recordIn && frame < a.recordOut) {
      return { bIndex: i + 1, alpha: (frame - b.recordIn) / t.frames };
    }
  }
  return null;
}

/**
 * Two video elements: the visible one plus a second that fades in over
 * crossfades. A hidden audio element follows the A1 lane. Forward playback
 * runs on a master wall-clock (clockFrame); the video element is slaved to
 * the clip under the playhead and image clips just let the clock run.
 * Frame is a record frame; J/L shuttle at 1x/2x/4x.
 */
export function useSequencePlayer({
  clips,
  audio,
  media,
  fps,
}: {
  clips: Clip[];
  audio: AudioClip[];
  media: Map<string, Media>;
  fps: Fps;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  const idxRef = useRef(0);
  const lastTickRef = useRef(0);
  const revAccRef = useRef(0);
  const audioRef2 = useRef(audio);
  const mediaRef = useRef(media);
  const fpsRef = useRef<Fps>(fps);

  const [frame, setFrameState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [dir, setDir] = useState<Dir>(1);
  const frameRef = useRef(0);
  const rateRef = useRef(1);
  // Forward playback clock: null while paused or reversing.
  const clockRef = useRef<{
    startFrame: number;
    startTs: number;
    rate: number;
  } | null>(null);

  const layoutRef = useRef<StripLayout<Clip>>(layoutClips(clips));

  useEffect(() => {
    audioRef2.current = audio;
    mediaRef.current = media;
    fpsRef.current = fps;
    layoutRef.current = layoutClips(clips);
  }, [clips, audio, media, fps]);

  const setFrame = useCallback((f: number) => {
    frameRef.current = f;
    setFrameState(f);
  }, []);

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const urlOf = useCallback(
    (clip: Clip | undefined): string | null => {
      const m = clip && mediaRef.current.get(clip.mediaId);
      return m ? mediaUrl(m.id) : null;
    },
    [],
  );

  /** Volume/mute for the visible element from the clip under it. */
  const applyVolume = useCallback((clip: Clip | undefined) => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !clip || clip.muted;
    v.volume = clip ? Math.min(1, Math.max(0, clip.volume)) : 0;
  }, []);

  /** Keep the A1 lane audible: one hidden element follows the playhead. */
  const syncAudio = useCallback(
    (f: number, isPlaying: boolean) => {
      const el = audioRef.current;
      if (!el) return;
      const active = activeAudio(audioRef2.current, f);
      if (!active) {
        el.pause();
        return;
      }
      const m = mediaRef.current.get(active.clip.mediaId);
      if (!m) return;
      const url = mediaUrl(m.id);
      if (!el.src.endsWith(url)) el.src = url;
      const want = active.clip.in / fpsRef.current + active.offset / fpsRef.current;
      if (Math.abs(el.currentTime - want) > 0.35) el.currentTime = want;
      el.volume = Math.min(1, Math.max(0, active.clip.volume));
      if (isPlaying && el.paused) void el.play().catch(() => undefined);
      if (!isPlaying && !el.paused) el.pause();
    },
    [],
  );

  /** During a crossfade, the second element shows clip B at `alpha`. */
  const setCrossfade = useCallback((f: number) => {
    const v2 = nextRef.current;
    if (!v2) return;
    const xf = crossfadeAt(layoutRef.current, f);
    if (!xf) {
      if (v2.style.opacity !== "0") v2.style.opacity = "0";
      v2.pause();
      return;
    }
    const b = layoutRef.current.clips[xf.bIndex];
    // A still B is rendered by SequencePlayer's image layer at `alpha`.
    if (mediaRef.current.get(b.clip.mediaId)?.kind === "image") {
      if (v2.style.opacity !== "0") v2.style.opacity = "0";
      v2.pause();
      return;
    }
    const url = urlOf(b.clip);
    if (url && !v2.src.endsWith(url)) v2.src = url;
    const want =
      b.clip.in / fpsRef.current + (f - b.recordIn) / fpsRef.current;
    if (Math.abs(v2.currentTime - want) > 0.5) v2.currentTime = want;
    v2.volume = b.clip.muted ? 0 : Math.min(1, b.clip.volume);
    v2.muted = b.clip.muted;
    const v = videoRef.current;
    if (v && !v.paused && v2.paused) void v2.play().catch(() => undefined);
    v2.style.opacity = String(xf.alpha);
  }, [urlOf]);

  const seek = useCallback(
    (f: number) => {
      const layout = layoutRef.current;
      const clamped = Math.min(Math.max(0, Math.round(f)), Math.max(0, layout.totalFrames));
      const v = videoRef.current;
      if (!v || layout.clips.length === 0) {
        setFrame(0);
        return;
      }
      const { index, entry } = locate(layout, Math.min(clamped, layout.totalFrames - 1));
      idxRef.current = index;
      const clipFrame = Math.min(
        entry.clip.in + (clamped - entry.recordIn),
        entry.clip.out,
      );
      const m = mediaRef.current.get(entry.clip.mediaId);
      if (m?.kind === "image") {
        // The still is rendered by the <img> layer, not the video element.
        v.pause();
      } else {
        const url = urlOf(entry.clip);
        if (url && !v.src.endsWith(url)) v.src = url;
        v.currentTime = clipFrame / fpsRef.current + 0.0005;
      }
      applyVolume(entry.clip);
      // A seek re-anchors the playback clock to the new frame.
      if (clockRef.current) {
        clockRef.current = {
          startFrame: clamped,
          startTs: performance.now(),
          rate: rateRef.current,
        };
      }
      setFrame(clamped);
      setCrossfade(clamped);
      syncAudio(clamped, !v.paused);
    },
    [applyVolume, setCrossfade, setFrame, syncAudio, urlOf],
  );

  // rAF tick functions live in refs so a loop can reschedule itself.
  const forwardTickRef = useRef<FrameRequestCallback | null>(null);
  const reverseTickRef = useRef<FrameRequestCallback | null>(null);

  /**
   * Forward rAF loop: the master clock owns the frame; the video element is
   * re-slaved when the clip under the playhead changes and drift-corrected
   * past 0.25s. Image clips pause the element and let the clock run.
   */
  useEffect(() => {
    forwardTickRef.current = (ts) => {
      const v = videoRef.current;
      const layout = layoutRef.current;
      const clock = clockRef.current;
      if (!v || !clock || layout.clips.length === 0) return;
      const fps = fpsRef.current;
      const raw = clockFrame({
        startFrame: clock.startFrame,
        startTs: clock.startTs,
        now: ts,
        fps,
        rate: clock.rate,
      });
      if (raw >= layout.totalFrames) {
        setFrame(layout.totalFrames);
        setPlaying(false);
        clockRef.current = null;
        v.pause();
        const v2 = nextRef.current;
        if (v2) {
          v2.style.opacity = "0";
          v2.pause();
        }
        syncAudio(layout.totalFrames, false);
        return;
      }
      // The first rAF timestamp can predate startTs by a tick; never step
      // back below the frame the clock started on.
      const f = Math.max(0, Math.max(clock.startFrame, raw));
      setFrame(f);
      const { index, entry } = locate(layout, f);
      const isImage =
        mediaRef.current.get(entry.clip.mediaId)?.kind === "image";
      if (index !== idxRef.current) {
        idxRef.current = index;
        if (isImage) {
          v.pause();
        } else {
          const url = urlOf(entry.clip);
          if (url && !v.src.endsWith(url)) v.src = url;
          v.playbackRate = clock.rate;
          v.currentTime =
            entry.clip.in / fps + (f - entry.recordIn) / fps;
          applyVolume(entry.clip);
          void v.play().catch(() => setPlaying(false));
        }
      } else if (!isImage) {
        const want = entry.clip.in / fps + (f - entry.recordIn) / fps;
        if (Math.abs(v.currentTime - want) > 0.25) v.currentTime = want;
        if (v.paused) void v.play().catch(() => setPlaying(false));
      }
      setCrossfade(f);
      syncAudio(f, true);
      if (forwardTickRef.current) {
        rafRef.current = requestAnimationFrame(forwardTickRef.current);
      }
    };
    reverseTickRef.current = (ts) => {
      const dt = lastTickRef.current ? (ts - lastTickRef.current) / 1000 : 0;
      lastTickRef.current = ts;
      revAccRef.current += dt * rateRef.current * fpsRef.current;
      if (revAccRef.current >= 1) {
        const step = Math.floor(revAccRef.current);
        revAccRef.current -= step;
        const f = frameRef.current - step;
        if (f <= 0) {
          seek(0);
          setPlaying(false);
          setDir(1);
          return;
        }
        seek(f);
      }
      if (reverseTickRef.current) {
        rafRef.current = requestAnimationFrame(reverseTickRef.current);
      }
    };
  }, [applyVolume, seek, setCrossfade, setFrame, syncAudio, urlOf]);

  const pause = useCallback(() => {
    clockRef.current = null;
    stopLoop();
    videoRef.current?.pause();
    nextRef.current?.pause();
    audioRef.current?.pause();
    setPlaying(false);
  }, [stopLoop]);

  const playForward = useCallback(
    (bump: boolean) => {
      const layout = layoutRef.current;
      if (layout.clips.length === 0) return;
      const v = videoRef.current;
      if (!v) return;
      const next = bump ? (dir === 1 && playing ? Math.min(rate * 2, 4) : 1) : 1;
      setRate(next);
      rateRef.current = next;
      setDir(1);
      setPlaying(true);
      stopLoop();
      if (frameRef.current >= layout.totalFrames) seek(0);
      // (Re)start the master clock from the current frame at the new rate.
      clockRef.current = {
        startFrame: frameRef.current,
        startTs: performance.now(),
        rate: next,
      };
      const { index, entry } = locate(
        layout,
        Math.min(frameRef.current, Math.max(0, layout.totalFrames - 1)),
      );
      idxRef.current = index;
      if (mediaRef.current.get(entry.clip.mediaId)?.kind === "image") {
        v.pause();
      } else {
        const url = urlOf(entry.clip);
        if (url && !v.src.endsWith(url)) v.src = url;
        v.playbackRate = next;
        v.currentTime =
          entry.clip.in / fpsRef.current +
          (frameRef.current - entry.recordIn) / fpsRef.current;
        applyVolume(entry.clip);
        void v.play().catch(() => setPlaying(false));
      }
      syncAudio(frameRef.current, true);
      lastTickRef.current = 0;
      if (forwardTickRef.current) {
        rafRef.current = requestAnimationFrame(forwardTickRef.current);
      }
    },
    [applyVolume, dir, playing, rate, seek, stopLoop, syncAudio, urlOf],
  );

  const playReverse = useCallback(() => {
    const layout = layoutRef.current;
    if (layout.clips.length === 0) return;
    const v = videoRef.current;
    v?.pause();
    clockRef.current = null;
    const next = dir === -1 && playing ? Math.min(rate * 2, 4) : 1;
    setRate(next);
    rateRef.current = next;
    setDir(-1);
    setPlaying(true);
    stopLoop();
    lastTickRef.current = 0;
    revAccRef.current = 0;
    if (reverseTickRef.current) {
      rafRef.current = requestAnimationFrame(reverseTickRef.current);
    }
  }, [dir, playing, rate, stopLoop]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else playForward(false);
  }, [playing, pause, playForward]);

  const reset = useCallback(() => {
    pause();
    setRate(1);
    rateRef.current = 1;
    setDir(1);
    if (videoRef.current) videoRef.current.playbackRate = 1;
  }, [pause]);

  const step = useCallback(
    (d: number) => {
      pause();
      seek(frameRef.current + d);
    },
    [pause, seek],
  );

  // Sync the video when the clip list changes while paused.
  useEffect(() => {
    seek(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, fps]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  return {
    videoRef,
    nextRef,
    audioRef,
    frame,
    playing,
    rate,
    dir,
    seek,
    toggle,
    playForward,
    playReverse,
    pause,
    reset,
    step,
  };
}
