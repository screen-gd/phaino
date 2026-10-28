"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { StudioJob } from "./toolStudioData";

const HISTORY_KEY = "phaino:preview-history";
const HISTORY_CAP = 36;
const EMPTY: StudioJob[] = [];

const DemoContext = createContext<{
  enabled: boolean;
  jobs: StudioJob[];
  addJob: (job: StudioJob) => void;
} | null>(null);

let history: StudioJob[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function readHistory(): StudioJob[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return EMPTY;
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data)
      ? (data as StudioJob[]).slice(0, HISTORY_CAP)
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Reads localStorage once on first client access; the reference stays stable
// so useSyncExternalStore does not loop.
function loadHistory(): StudioJob[] {
  loaded = true;
  history = readHistory();
  return history;
}

function getHistory(): StudioJob[] {
  return loaded ? history : loadHistory();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  void getHistory();
  return () => {
    listeners.delete(onChange);
  };
}

/** Sample previews persist in this browser via localStorage. */
export function DemoProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  // The server snapshot is empty so SSR and hydration match; the stored
  // history arrives on the first client render pass.
  const jobs = useSyncExternalStore(subscribe, getHistory, () => EMPTY);
  const addJob = useCallback((job: StudioJob) => {
    history = [job, ...getHistory()].slice(0, HISTORY_CAP);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* Storage full or blocked; previews still work for this tab. */
    }
    listeners.forEach((l) => l());
  }, []);
  return <DemoContext value={{ enabled, jobs, addJob }}>{children}</DemoContext>;
}

export function useDemo() {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("DemoProvider is missing");
  return demo;
}
