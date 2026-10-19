import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Public URL of a tool's optional preview loop (public/explore/tools/<tool>.mp4),
 * or null when no file exists. Checked on the server at render time.
 */
export function toolLoopUrl(tool: string): string | null {
  const file = path.join(process.cwd(), "public", "explore", "tools", `${tool}.mp4`);
  return fs.existsSync(file) ? `/explore/tools/${tool}.mp4` : null;
}
