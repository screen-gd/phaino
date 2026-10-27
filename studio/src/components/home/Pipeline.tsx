import Link from "next/link";

const FCPXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r1" name="FFVideoFormat1920x1080p24" frameDuration="1/24s" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
    <asset id="r2" name="Orbit.mp4" start="0s" duration="60/24s" hasVideo="1" format="r1" videoSources="1">
      <media-rep kind="original-media" src="media/01_orbit.mp4"/>
    </asset>
    <asset id="r3" name="Dive &amp; Drop.mp4" start="0s" duration="40/24s" hasVideo="1" format="r1" videoSources="1">
      <media-rep kind="original-media" src="media/02_dive_drop.mp4"/>
    </asset>
  </resources>
  <library>
    <!-- … -->`;

/** Section 5: generate, sequence, export — plus a real FCPXML sample. */
export function Pipeline() {
  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-8">
        <Link href="/camera" className="group block">
          <span className="font-mono text-caption text-t3">01</span>
          <span className="mt-1 block text-h3 font-semibold text-t1">
            Generate
          </span>
          <span className="mt-1 block text-caption text-t3">
            Presets and models
          </span>
        </Link>
        <span className="hidden text-t3 sm:block" aria-hidden="true">
          →
        </span>
        <Link href="/editor" className="group block">
          <span className="font-mono text-caption text-t3">02</span>
          <span className="mt-1 block text-h3 font-semibold text-t1">
            Sequence
          </span>
          <span className="mt-1 block text-caption text-t3">
            Cut, titles and music
          </span>
        </Link>
        <span className="hidden text-t3 sm:block" aria-hidden="true">
          →
        </span>
        <div>
          <span className="font-mono text-caption text-t3">03</span>
          <span className="mt-1 block text-h3 font-semibold text-t1">
            Export
          </span>
          <span className="mt-1 block text-caption text-t3">
            Resolve · Premiere · Final Cut
          </span>
          <span className="mt-1 block font-mono text-caption text-t3">
            FCPXML 1.10 · CMX3600 EDL
          </span>
        </div>
      </div>
      <pre className="mt-10 max-h-80 overflow-auto border border-line bg-s1 p-4 font-mono text-caption leading-relaxed text-t2">
        {FCPXML}
      </pre>
      <p className="mt-2 font-mono text-caption text-t3">
        Sample export of a two-clip sequence.
      </p>
    </div>
  );
}
