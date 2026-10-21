import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(import.meta.dirname, ".."),
  outputFileTracingIncludes: {
    "/**": [
      "../presets/**/*",
      "../models/manifest.json",
      "../models/cache/**/*",
      "./src/server/comfy/object_info.snapshot.json",
      "../tracker/tasks.json",
    ],
  },
};

export default nextConfig;
