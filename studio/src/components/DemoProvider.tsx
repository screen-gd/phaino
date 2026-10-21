"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { StudioJob } from "./toolStudioData";

const DemoContext = createContext<{
  enabled: boolean;
  jobs: StudioJob[];
  addJob: (job: StudioJob) => void;
} | null>(null);

/** Sample history lives only in this browser tab, across app navigation. */
export function DemoProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const addJob = useCallback((job: StudioJob) => {
    setJobs((previous) => [job, ...previous].slice(0, 36));
  }, []);
  return <DemoContext value={{ enabled, jobs, addJob }}>{children}</DemoContext>;
}

export function useDemo() {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("DemoProvider is missing");
  return demo;
}
