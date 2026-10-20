import { describe, expect, it } from "vitest";
import { buildEdl } from "./edl";
import { buildFcpxml, type FcpxmlItem } from "./fcpxml";

/**
 * Fixture: two clips at 24fps/1080p with 12-frame handles.
 * Clip 1 "Orbit" in=0,out=48: head 0, tail 12, media 60 frames.
 * Clip 2 "Dive" in=4,out=28 (2s source, 48 total): head clamped to 4,
 * tail 12, media 40 frames. Record layout 0-48 / 48-72.
 */
const items: FcpxmlItem[] = [
  {
    name: "Orbit.mp4",
    mediaPath: "/data/exports/x/media/01_orbit.mp4",
    mediaFrames: 60,
    start: 0,
    duration: 48,
    recordIn: 0,
  },
  {
    name: "Dive & Drop.mp4",
    mediaPath: "/data/exports/x/media/02_dive_drop.mp4",
    mediaFrames: 40,
    start: 4,
    duration: 24,
    recordIn: 48,
  },
];

describe("buildFcpxml", () => {
  it("emits FCPXML 1.10 with assets and an asset-clip spine", () => {
    const xml = buildFcpxml({
      name: "phaino_sequence",
      fps: 24,
      resolution: "1080p",
      items,
    });
    expect(xml).toMatchSnapshot();
    expect(xml).toContain('<fcpxml version="1.10">');
    expect(xml).toContain('name="FFVideoFormat1080p24"');
    expect(xml).toContain('frameDuration="1/24s"');
    expect(xml).toContain('start="0s"');
    // Clip 2 record-in 48 => offset 3600s + 48/24s = 86448/24s
    expect(xml).toContain('offset="86448/24s"');
    // XML escaping on the name
    expect(xml).toContain("Dive &amp; Drop.mp4");
  });
});

describe("buildEdl", () => {
  it("emits CMX3600 with record starting at 01:00:00:00", () => {
    const edl = buildEdl({
      title: "phaino_sequence",
      fps: 24,
      items: items.map((i) => ({
        clipName: i.name,
        sourceFile: i.mediaPath.split("/").pop()!,
        srcIn: i.start,
        srcOut: i.start + i.duration,
        recIn: i.recordIn,
        recOut: i.recordIn + i.duration,
      })),
    });
    expect(edl).toMatchSnapshot();
    expect(edl).toContain("TITLE: phaino_sequence\r\n");
    expect(edl).toContain("FCM: NON-DROP FRAME");
    expect(edl).toContain(
      "001  AX      V    C        00:00:00:00 00:00:02:00 01:00:00:00 01:00:02:00",
    );
    // Clip 2: srcIn 4f, srcOut 28f, rec 01:00:02:00 - 01:00:03:00
    expect(edl).toContain(
      "002  AX      V    C        00:00:00:04 00:00:01:04 01:00:02:00 01:00:03:00",
    );
    expect(edl).toContain("* FROM CLIP NAME: Orbit.mp4");
    expect(edl).toContain("* SOURCE FILE: 01_orbit.mp4");
  });
});
