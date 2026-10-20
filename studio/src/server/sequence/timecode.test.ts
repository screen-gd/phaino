import { describe, expect, it } from "vitest";
import {
  framesToSeconds,
  framesToTimecode,
  secondsToFrames,
  snapFps,
  snapResolution,
} from "./timecode";

describe("framesToTimecode", () => {
  it("formats at 24, 25 and 30 fps", () => {
    expect(framesToTimecode(0, 24)).toBe("00:00:00:00");
    expect(framesToTimecode(23, 24)).toBe("00:00:00:23");
    expect(framesToTimecode(24, 24)).toBe("00:00:01:00");
    expect(framesToTimecode(25, 25)).toBe("00:00:01:00");
    expect(framesToTimecode(30, 30)).toBe("00:00:01:00");
    expect(framesToTimecode(75, 25)).toBe("00:00:03:00");
    expect(framesToTimecode(90, 30)).toBe("00:00:03:00");
  });

  it("rolls over minutes and hours", () => {
    expect(framesToTimecode(60 * 24 + 5, 24)).toBe("00:01:00:05");
    expect(framesToTimecode(3600 * 24, 24)).toBe("01:00:00:00");
    expect(framesToTimecode(3600 * 30 + 15, 30)).toBe("01:00:00:15");
  });

  it("throws on negative frames", () => {
    expect(() => framesToTimecode(-1, 24)).toThrow();
  });
});

describe("secondsToFrames", () => {
  it("floors fractional results", () => {
    expect(secondsToFrames(2, 24)).toBe(48);
    expect(secondsToFrames(1.99999, 24)).toBe(47);
    expect(secondsToFrames(3, 24)).toBe(72);
  });
});

describe("framesToSeconds", () => {
  it("converts back", () => {
    expect(framesToSeconds(48, 24)).toBe(2);
  });
});

describe("snapFps", () => {
  it("snaps NTSC and high rates to the supported set", () => {
    expect(snapFps(23.976)).toBe(24);
    expect(snapFps(29.97)).toBe(30);
    expect(snapFps(25)).toBe(25);
    expect(snapFps(60)).toBe(30);
  });
});

describe("snapResolution", () => {
  it("4K over a 2200px long edge, else 1080p", () => {
    expect(snapResolution(3840, 2160)).toBe("4K");
    expect(snapResolution(1920, 1080)).toBe("1080p");
    expect(snapResolution(2200, 1200)).toBe("1080p");
    expect(snapResolution(1080, 2201)).toBe("4K");
  });
});
