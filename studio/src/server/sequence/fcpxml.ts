import { pathToFileURL } from "node:url";
import type { Fps } from "./timecode";
import { RESOLUTIONS, type SequenceResolution } from "./timecode";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A frame count as a rational duration ("72/24s"), or "0s" for zero. */
function dur(frames: number, fps: Fps): string {
  return frames === 0 ? "0s" : `${frames}/${fps}s`;
}

export type FcpxmlItem = {
  name: string;
  /** Absolute path to the conformed media file. */
  mediaPath: string;
  mediaFrames: number;
  /** First used frame inside the media file (the head handle). */
  start: number;
  /** Used length in frames. */
  duration: number;
  /** Gapless record position in project frames. */
  recordIn: number;
};

/** FCPXML 1.10 for the whole sequence, tcStart 01:00:00:00. */
export function buildFcpxml({
  name,
  fps,
  resolution,
  items,
}: {
  name: string;
  fps: Fps;
  resolution: SequenceResolution;
  items: FcpxmlItem[];
}): string {
  const [width, height] = RESOLUTIONS[resolution];
  const formatName =
    resolution === "4K"
      ? `FFVideoFormat3840x2160p${fps}`
      : `FFVideoFormat1080p${fps}`;
  const total = items.reduce((sum, i) => sum + i.duration, 0);

  const resources = [
    `    <format id="r1" name="${formatName}" frameDuration="1/${fps}s" width="${width}" height="${height}" colorSpace="1-1-1 (Rec. 709)"/>`,
  ];
  items.forEach((item, i) => {
    const src = pathToFileURL(item.mediaPath).href;
    resources.push(
      `    <asset id="r${i + 2}" name="${esc(item.name)}" start="0s" duration="${dur(item.mediaFrames, fps)}" hasVideo="1" format="r1" videoSources="1">`,
      `      <media-rep kind="original-media" src="${esc(src)}"/>`,
      `    </asset>`,
    );
  });

  const spine = items.map((item, i) => {
    const offsetFrames = 3600 * fps + item.recordIn;
    return [
      `          <asset-clip ref="r${i + 2}" name="${esc(item.name)}" offset="${dur(offsetFrames, fps)}" start="${dur(item.start, fps)}" duration="${dur(item.duration, fps)}" format="r1" tcFormat="NDF"/>`,
    ].join("\n");
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!DOCTYPE fcpxml>`,
    `<fcpxml version="1.10">`,
    `  <resources>`,
    ...resources,
    `  </resources>`,
    `  <library>`,
    `    <event name="Phaino">`,
    `      <project name="${esc(name)}">`,
    `        <sequence format="r1" duration="${dur(total, fps)}" tcStart="3600s" tcFormat="NDF">`,
    `          <spine>`,
    ...spine,
    `          </spine>`,
    `        </sequence>`,
    `      </project>`,
    `    </event>`,
    `  </library>`,
    `</fcpxml>`,
    ``,
  ].join("\n");
}
