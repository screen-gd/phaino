import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { remuxSourceAudio, type AudioRemuxDeps } from "./audio";

function deps(hasAudio: boolean): AudioRemuxDeps & { args: string[][] } {
  const args: string[][] = [];
  return {
    args,
    hasAudio: vi.fn(async () => hasAudio),
    ffmpeg: vi.fn(async (a: string[]) => {
      args.push(a);
      fs.writeFileSync(a[a.length - 1], "muxed");
    }),
    rename: vi.fn(async (from: string, to: string) => {
      fs.renameSync(from, to);
    }),
  };
}

describe("remuxSourceAudio", () => {
  it("skips the remux when the source has no audio stream", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-audio-"));
    const result = path.join(dir, "out.mp4");
    const source = path.join(dir, "src.mp4");
    fs.writeFileSync(result, "result");
    fs.writeFileSync(source, "source");
    const d = deps(false);

    await expect(remuxSourceAudio(result, source, d)).resolves.toBe(false);
    expect(d.ffmpeg).not.toHaveBeenCalled();
    expect(fs.readFileSync(result, "utf8")).toBe("result");
  });

  it("maps the result video to the source audio and replaces the file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-audio-"));
    const result = path.join(dir, "out.mp4");
    const source = path.join(dir, "src.mp4");
    fs.writeFileSync(result, "result");
    fs.writeFileSync(source, "source");
    const d = deps(true);

    await expect(remuxSourceAudio(result, source, d)).resolves.toBe(true);
    expect(d.args).toHaveLength(1);
    const args = d.args[0];
    expect(args).toEqual([
      "-y",
      "-i", result,
      "-i", source,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "copy",
      "-c:a", "aac",
      "-shortest",
      `${result}.audiomux.mp4`,
    ]);
    expect(fs.readFileSync(result, "utf8")).toBe("muxed");
    expect(fs.existsSync(`${result}.audiomux.mp4`)).toBe(false);
  });
});
