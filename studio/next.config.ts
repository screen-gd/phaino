import type { NextConfig } from "next";
import path from "node:path";

const webpTraces = ["../presets/**/*.webp", "../models/cache/**/*.webp"];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(import.meta.dirname, ".."),
  outputFileTracingIncludes: {
    "/**": [
      "../presets/**/*.json",
      "../models/manifest.json",
      "../models/cache/**/*.json",
      "./src/server/comfy/object_info.snapshot.json",
      "../tracker/tasks.json",
    ],
    // Thumbnails are only read by the thumb route and fork creation.
    "/api/presets/*/thumb": webpTraces,
    "/api/forks": webpTraces,
  },
  outputFileTracingExcludes: {
    // Route keys match by substring, so "/api/forks" also hits the [id]
    // children, which don't read thumbnails. Strip them back off.
    "/api/forks/*": webpTraces,
  },
};

export default nextConfig;
