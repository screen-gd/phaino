"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Clip, Sequence } from "@/server/sequence/model";
import { layoutClips } from "./stripMath";
import type { Fps } from "@/server/sequence/timecode";

/** What the sequence routes return: the record positions only. */
export type SequenceResponse = {
  sequence: Sequence;
  layout: { clips: { recordIn: number; recordOut: number }[]; totalFrames: number };
};

/** Load, optimistic edits, debounced sync and one-level undo for the strip. */
export function useSequence() {
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editCounter = useRef(0);
  const undoRef = useRef<Clip[] | null>(null);
  const seqRef = useRef<Sequence | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    seqRef.current = sequence;
  }, [sequence]);

  useEffect(() => {
    let alive = true;
    fetch("/api/sequence")
      .then((r) => r.json())
      .then((data: SequenceResponse) => {
        if (alive) setSequence(data.sequence);
      })
      .catch(() => {
        if (alive) setError("Could not load the sequence");
      });
    return () => {
      alive = false;
    };
  }, []);

  /** PUT a patch; apply the response only if no newer edit landed meanwhile. */
  const put = useCallback(async (patch: Record<string, unknown>) => {
    const sentAt = editCounter.current;
    const res = await fetch("/api/sequence", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => null)) as
      | (SequenceResponse & { error?: string })
      | null;
    if (!res.ok || !data?.sequence) {
      setError(data?.error ?? "Could not save the sequence");
      return;
    }
    setError(null);
    if (editCounter.current === sentAt) setSequence(data.sequence);
  }, []);

  const scheduleClipsPut = useCallback(
    (clips: Clip[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void put({
          clips: clips.map((c) => ({ id: c.id, in: c.in, out: c.out })),
        });
      }, 250);
    },
    [put],
  );

  /** Optimistic clip change; commits a debounced PUT of the whole order. */
  const commitClips = useCallback(
    (next: Clip[], { snapshot = true }: { snapshot?: boolean } = {}) => {
      if (snapshot && seqRef.current) {
        undoRef.current = seqRef.current.clips;
        setCanUndo(true);
      }
      setSequence((seq) => (seq ? { ...seq, clips: next } : seq));
      editCounter.current += 1;
      scheduleClipsPut(next);
    },
    [scheduleClipsPut],
  );

  /** Snapshot the strip before a trim drag starts (undo anchor). */
  const beginTrim = useCallback(() => {
    if (seqRef.current) {
      undoRef.current = seqRef.current.clips;
      setCanUndo(true);
    }
  }, []);

  /** Live trim preview during a drag: no snapshot, no PUT. */
  const previewTrim = useCallback((id: string, i: number, o: number) => {
    editCounter.current += 1;
    setSequence((seq) =>
      seq
        ? {
            ...seq,
            clips: seq.clips.map((c) => (c.id === id ? { ...c, in: i, out: o } : c)),
          }
        : seq,
    );
  }, []);

  const reorder = useCallback(
    (from: number, to: number) => {
      const seq = seqRef.current;
      if (!seq) return;
      const next = seq.clips.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      undoRef.current = seq.clips;
      setCanUndo(true);
      editCounter.current += 1;
      setSequence({ ...seq, clips: next });
      scheduleClipsPut(next);
    },
    [scheduleClipsPut],
  );

  const removeClip = useCallback(async (id: string) => {
    editCounter.current += 1;
    const res = await fetch(`/api/sequence/clips/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as SequenceResponse | null;
    if (res.ok && data?.sequence) setSequence(data.sequence);
    else setError("Could not remove the clip");
  }, []);

  const appendClip = useCallback(async (path: string) => {
    const res = await fetch("/api/sequence/clips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const data = (await res.json().catch(() => null)) as
      | (SequenceResponse & { error?: string })
      | null;
    if (res.ok && data?.sequence) {
      setSequence(data.sequence);
      setError(null);
      return true;
    }
    setError(data?.error ?? "Could not add the clip");
    return false;
  }, []);

  const updateSettings = useCallback(
    (patch: { fps?: Fps; resolution?: "1080p" | "4K"; handles?: 0 | 12 | 24 }) => {
      editCounter.current += 1;
      setSequence((seq) =>
        seq ? { ...seq, ...patch, settingsTouched: true } : seq,
      );
      void put(patch);
    },
    [put],
  );

  const undo = useCallback(() => {
    const prev = undoRef.current;
    if (!prev) return;
    undoRef.current = null;
    setCanUndo(false);
    editCounter.current += 1;
    setSequence((seq) => (seq ? { ...seq, clips: prev } : seq));
    void put({ clips: prev.map((c) => ({ id: c.id, in: c.in, out: c.out })) });
  }, [put]);

  return {
    sequence,
    error,
    layout: sequence
      ? layoutClips(sequence.clips)
      : { clips: [], totalFrames: 0 },
    commitClips,
    beginTrim,
    previewTrim,
    reorder,
    removeClip,
    appendClip,
    updateSettings,
    undo,
    canUndo,
  };
}

