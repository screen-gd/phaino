"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Backend } from "@/lib/backend";

type StudioState = {
  backend: Backend;
  setBackend: (backend: Backend) => void;
};

export const useStudio = create<StudioState>()(
  persist(
    (set) => ({
      backend: "local",
      setBackend: (backend) => set({ backend }),
    }),
    { name: "cutaway-studio" },
  ),
);
