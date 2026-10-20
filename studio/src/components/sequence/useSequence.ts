"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CUT,
  layout,
  type AudioClip,
  type Clip,
  type Media,
  type Sequence,
  type Title,
} from "@/server/sequence/model";
import type { Fps } from "@/server/sequence/timecode";

type LayoutShape = ReturnType<typeof layout>;

type SequenceResponse = {
  sequence: Sequence;
  layout: LayoutShape;
};

type SettingsPatch = {
  fps?: Fps;
  resolution?: Sequence["resolution"];
  aspect?: Sequence["aspect"];
  fit?: Sequence["fit"];
  handles?: Sequence["handles"];
};

export type Lane = "video" | "audio" | "title";
export type Selection = { lane: Lane; id: string } | null;

type Snapshot = { clips: Clip[]; audio: AudioClip[]; titles: Title[] };

const snapshot = (s: Sequence): Snapshot => ({
  clips: s.clips,
  audio: s.audio,
  titles: s.titles,
});

const sameDoc = (a: Snapshot, b: Snapshot) =>
  a.clips === b.clips && a.audio === b.audio && a.titles === b.titles;

/**
 * The editor document: optimistic local edits, debounced PUT, an undo/redo
 * stack, and reconciliation with the normalized server response.
 */
export function useSequence() {
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const seqRef = useRef<Sequence | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncUndoFlags = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sequence")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((data: SequenceResponse) => {
        if (cancelled) return;
        seqRef.current = data.sequence;
        setSequence(data.sequence);
      })
      .catch(() => setError("Could not load the sequence"));
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const applyLayout = useCallback(
    (data: SequenceResponse) => {
      seqRef.current = data.sequence;
      setSequence(data.sequence);
      setDirty(false);
    },
    [],
  );

  /** PUT the three track lists; the server normalizes and returns layout. */
  const postPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      const res = await fetch("/api/sequence", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => null)) as
        | (SequenceResponse & { error?: string })
        | null;
      if (!res.ok || !data?.sequence) {
        throw new Error(data?.error ?? "Could not save the sequence");
      }
      applyLayout(data);
    },
    [applyLayout],
  );

  const schedulePost = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const s = seqRef.current;
      if (!s) return;
      try {
        await postPatch({ clips: s.clips, audio: s.audio, titles: s.titles });
      } catch {
        setError("Could not save the sequence");
      }
    }, 500);
  }, [postPatch]);

  /**
   * One undoable edit: snapshot, apply, mark dirty, debounce the PUT.
   * `undoable=false` covers in-flight previews (trim drags).
   */
  const edit = useCallback(
    (fn: (s: Sequence) => Partial<Sequence>, undoable = true) => {
      const s = seqRef.current;
      if (!s) return;
      const next = { ...s, ...fn(s) };
      const snap = snapshot(next);
      const before = snapshot(s);
      if (sameDoc(snap, before)) return;
      if (undoable) {
        undoStack.current.push(before);
        if (undoStack.current.length > 100) undoStack.current.shift();
        redoStack.current = [];
        syncUndoFlags();
      }
      seqRef.current = next;
      setSequence(next);
      setDirty(true);
      schedulePost();
    },
    [schedulePost, syncUndoFlags],
  );

  /** Push an undo point without editing (call before a preview gesture). */
  const mark = useCallback(() => {
    const s = seqRef.current;
    if (!s) return;
    undoStack.current.push(snapshot(s));
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
    syncUndoFlags();
  }, [syncUndoFlags]);

  const undo = useCallback(() => {
    const s = seqRef.current;
    const prev = undoStack.current.pop();
    if (!s || !prev) return;
    redoStack.current.push(snapshot(s));
    seqRef.current = { ...s, ...prev };
    setSequence(seqRef.current);
    setDirty(true);
    syncUndoFlags();
    schedulePost();
  }, [schedulePost, syncUndoFlags]);

  const redo = useCallback(() => {
    const s = seqRef.current;
    const next = redoStack.current.pop();
    if (!s || !next) return;
    undoStack.current.push(snapshot(s));
    seqRef.current = { ...s, ...next };
    setSequence(seqRef.current);
    setDirty(true);
    syncUndoFlags();
    schedulePost();
  }, [schedulePost, syncUndoFlags]);

  /* Lane edits */

  const replaceClip = useCallback(
    (id: string, patch: Partial<Clip>, undoable = true) =>
      edit(
        (s) => ({
          clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
        undoable,
      ),
    [edit],
  );

  const replaceAudio = useCallback(
    (id: string, patch: Partial<AudioClip>, undoable = true) =>
      edit(
        (s) => ({
          audio: s.audio.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }),
        undoable,
      ),
    [edit],
  );

  const replaceTitle = useCallback(
    (id: string, patch: Partial<Title>, undoable = true) =>
      edit(
        (s) => ({
          titles: s.titles.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }),
        undoable,
      ),
    [edit],
  );

  const reorder = useCallback(
    (from: number, to: number) => {
      const s = seqRef.current;
      if (!s || from === to) return;
      const clips = [...s.clips];
      const [m] = clips.splice(from, 1);
      clips.splice(to, 0, m);
      edit(() => ({ clips }));
    },
    [edit],
  );

  const removeClip = useCallback(
    (id: string) => {
      edit((s) => ({ clips: s.clips.filter((c) => c.id !== id) }));
    },
    [edit],
  );

  const removeSelection = useCallback(
    (sel: Selection) => {
      if (!sel) return;
      edit((s) =>
        sel.lane === "video"
          ? { clips: s.clips.filter((c) => c.id !== sel.id) }
          : sel.lane === "audio"
            ? { audio: s.audio.filter((a) => a.id !== sel.id) }
            : { titles: s.titles.filter((t) => t.id !== sel.id) },
      );
    },
    [edit],
  );

  /** Split the video clip covering `frame` (or `id`) at a record frame. */
  const splitAt = useCallback(
    (frame: number, id?: string): string | null => {
      const s = seqRef.current;
      if (!s) return null;
      const lay = layout(s);
      const i = id
        ? s.clips.findIndex((c) => c.id === id)
        : lay.clips.findIndex(
            (e) => frame >= e.recordIn && frame < e.recordOut,
          );
      if (i < 0) return null;
      const entry = lay.clips[i];
      const clip = s.clips[i];
      const delta = frame - entry.recordIn;
      if (delta <= 0 || delta >= clip.out - clip.in) return null;
      const newId = crypto.randomUUID();
      edit((s2) => {
        const clips = [...s2.clips];
        const a: Clip = {
          ...clip,
          out: clip.in + delta,
          transition: { ...CUT },
          fadeOut: 0,
        };
        const b: Clip = {
          ...clip,
          id: newId,
          in: clip.in + delta,
          fadeIn: 0,
        };
        clips.splice(i, 1, a, b);
        return { clips };
      });
      return newId;
    },
    [edit],
  );

  const duplicateClip = useCallback(
    (id: string): string | null => {
      const s = seqRef.current;
      if (!s) return null;
      const i = s.clips.findIndex((c) => c.id === id);
      if (i < 0) return null;
      const newId = crypto.randomUUID();
      edit((s2) => {
        const clips = [...s2.clips];
        clips.splice(i + 1, 0, { ...s2.clips[i], id: newId, transition: s2.clips[i].transition });
        return { clips };
      });
      return newId;
    },
    [edit],
  );

  /** Split an audio clip at a record frame. */
  const splitAudioAt = useCallback(
    (frame: number, id: string): string | null => {
      const s = seqRef.current;
      if (!s) return null;
      const i = s.audio.findIndex((a) => a.id === id);
      if (i < 0) return null;
      const a = s.audio[i];
      const delta = frame - a.start;
      if (delta <= 0 || delta >= a.out - a.in) return null;
      const newId = crypto.randomUUID();
      edit((s2) => {
        const audio = [...s2.audio];
        audio.splice(
          i,
          1,
          { ...a, out: a.in + delta, fadeOut: 0 },
          { ...a, id: newId, start: a.start + delta, in: a.in + delta, fadeIn: 0 },
        );
        return { audio };
      });
      return newId;
    },
    [edit],
  );

  const addTitle = useCallback(
    (start: number): string => {
      const id = crypto.randomUUID();
      edit((s) => ({
        titles: [
          ...s.titles,
          {
            id,
            text: "Title",
            start: Math.max(0, Math.round(start)),
            duration: 3 * s.fps,
            position: "lower" as const,
            size: "m" as const,
          },
        ],
      }));
      return id;
    },
    [edit],
  );

  const appendClip = useCallback(
    async (path: string): Promise<boolean> => {
      setError(null);
      const res = await fetch("/api/sequence/clips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = (await res.json().catch(() => null)) as
        | (SequenceResponse & { error?: string })
        | null;
      if (!res.ok || !data?.sequence) {
        setError(data?.error ?? "Could not add the clip");
        return false;
      }
      applyLayout(data);
      return true;
    },
    [applyLayout],
  );

  const uploadMedia = useCallback(
    async (file: File): Promise<boolean> => {
      setError(null);
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/sequence/media/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as
        | (SequenceResponse & { media?: Media; error?: string })
        | null;
      if (!res.ok || !data?.sequence) {
        setError(data?.error ?? "Upload failed");
        return false;
      }
      applyLayout(data);
      return true;
    },
    [applyLayout],
  );

  const removeMedia = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      const res = await fetch(`/api/sequence/media/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as
        | (SequenceResponse & { error?: string })
        | null;
      if (!res.ok || !data?.sequence) {
        setError(data?.error ?? "Could not remove the media");
        return false;
      }
      applyLayout(data);
      return true;
    },
    [applyLayout],
  );

  const updateSettings = useCallback(
    async (patch: SettingsPatch) => {
      setError(null);
      setDirty(true);
      try {
        await postPatch(patch);
      } catch {
        setError("Could not save settings");
      }
    },
    [postPatch],
  );

  return {
    sequence,
    error,
    dirty,
    canUndo,
    canRedo,
    edit,
    mark,
    undo,
    redo,
    replaceClip,
    replaceAudio,
    replaceTitle,
    reorder,
    removeClip,
    removeSelection,
    splitAt,
    splitAudioAt,
    duplicateClip,
    addTitle,
    appendClip,
    uploadMedia,
    removeMedia,
    updateSettings,
  };
}
