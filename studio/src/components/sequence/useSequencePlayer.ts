"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Clip } from "@/server/sequence/model";
import type { Fps } from "@/server/sequence/timecode";
import { layoutClips, locate, type StripLayout } from "./stripMath";

export function clipUrl(clip: Clip): string {
  return `/api/outputs/${clip.path.split("/").map(encodeURIComponent).join("/")}`;
}

type Dir = 1 | -1;

/**
 * One visible video swapping src at each cut, plus a hidden preloader.
 * Frame is a sequence frame; J/L shuttle at 1x/2x/4x.
 */
export function useSequencePlayer({
  clips,
  fps,
}: {
  clips: Clip[];
  fps: Fps;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const idxRef = useRef(0);
  const lastTickRef = useRef(0);
  const revAccRef = useRef(0);
  const clipsRef = useRef(clips);
  const fpsRef = useRef<Fps>(fps);

  const [frame, setFrameState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [dir, setDir] = useState<Dir>(1);
  const frameRef = useRef(0);
  const rateRef = useRef(1);

  const layoutRef = useRef<StripLayout<Clip>>(layoutClips(clips));

  useEffect(() => {
    clipsRef.current = clips;
    fpsRef.current = fps;
    layoutRef.current = layoutClips(clips);
  }, [clips, fps]);

  const setFrame = useCallback((f: number) => {
    frameRef.current = f;
    setFrameState(f);
  }, []);

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  /** Point the hidden video at the clip after index i. */
  const preloadNext = useCallback((i: number) => {
    const v = hiddenRef.current;
    const next = layoutRef.current.clips[i + 1]?.clip;
    if (!v || !next) {
      if (v) v.removeAttribute("src");
      return;
    }
    const url = clipUrl(next);
    if (!v.src.endsWith(url)) v.src = url;
    v.currentTime = next.in / fpsRef.current;
  }, []);

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
      const url = clipUrl(entry.clip);
      if (!v.src.endsWith(url)) v.src = url;
      v.currentTime = clipFrame / fpsRef.current + 0.0005;
      setFrame(clamped);
      preloadNext(index);
    },
    [preloadNext, setFrame],
  );

  // rAF tick functions live in refs so a loop can reschedule itself.
  const forwardTickRef = useRef<FrameRequestCallback | null>(null);
  const reverseTickRef = useRef<FrameRequestCallback | null>(null);

  /** Forward rAF loop: read currentTime, cut to the next clip at `out`. */
  useEffect(() => {
    forwardTickRef.current = () => {
      const v = videoRef.current;
      const layout = layoutRef.current;
      if (!v || layout.clips.length === 0) return;
      const i = idxRef.current;
      const entry = layout.clips[i];
      if (!entry) return;
      const f = entry.recordIn + Math.floor(v.currentTime * fpsRef.current + 1e-4) - entry.clip.in;
      setFrame(Math.min(f, entry.recordOut));
      if (v.currentTime >= entry.clip.out / fpsRef.current || v.ended) {
        const next = layout.clips[i + 1];
        if (!next) {
          setPlaying(false);
          v.pause();
          return;
        }
        idxRef.current = i + 1;
        const url = clipUrl(next.clip);
        v.src = url;
        v.currentTime = next.clip.in / fpsRef.current;
        v.playbackRate = rateRef.current;
        void v.play().catch(() => setPlaying(false));
        preloadNext(i + 1);
      }
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
  }, [preloadNext, seek, setFrame]);

  const pause = useCallback(() => {
    stopLoop();
    videoRef.current?.pause();
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
      v.playbackRate = next;
      void v.play().catch(() => setPlaying(false));
      lastTickRef.current = 0;
      if (forwardTickRef.current) {
        rafRef.current = requestAnimationFrame(forwardTickRef.current);
      }
    },
    [dir, playing, rate, seek, stopLoop],
  );

  const playReverse = useCallback(() => {
    const layout = layoutRef.current;
    if (layout.clips.length === 0) return;
    const v = videoRef.current;
    v?.pause();
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
    hiddenRef,
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
