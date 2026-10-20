import type { Transition } from "./model";
import { framesToTimecode, type Fps } from "./timecode";

export type EdlItem = {
  clipName: string;
  sourceFile: string;
  /** Source in/out in conformed media, project frames. */
  srcIn: number;
  srcOut: number;
  /** Record in/out in project frames, timeline starting at 01:00:00:00. */
  recIn: number;
  recOut: number;
  /** Effective transition INTO the next clip (crossfade writes a D event). */
  transition?: Transition;
};

/** CMX3600 EDL, CRLF, non-drop. Record start is 01:00:00:00. */
export function buildEdl({
  title,
  fps,
  items,
}: {
  title: string;
  fps: Fps;
  items: EdlItem[];
}): string {
  const tc = (f: number) => framesToTimecode(f, fps);
  const base = 3600 * fps;
  const lines = [`TITLE: ${title}`, `FCM: NON-DROP FRAME`, ``];
  items.forEach((item, i) => {
    const num = String(i + 1).padStart(3, "0");
    const reel = "AX".padEnd(8, " ");
    lines.push(
      `${num}  ${reel}V    C        ${tc(item.srcIn)} ${tc(item.srcOut)} ${tc(base + item.recIn)} ${tc(base + item.recOut)}`,
      `* FROM CLIP NAME: ${item.clipName}`,
      `* SOURCE FILE: ${item.sourceFile}`,
    );
    if (
      item.transition &&
      item.transition.type === "crossfade" &&
      item.transition.frames > 0
    ) {
      const d = String(Math.round(item.transition.frames)).padStart(3, "0");
      lines.push(
        `${num}  ${reel}V    D    ${d}   ${tc(base + item.recOut - item.transition.frames)} ${tc(base + item.recOut)} ${tc(base + item.recOut - item.transition.frames)} ${tc(base + item.recOut)}`,
        `* TRANSITION: CROSS DISSOLVE`,
      );
    }
    lines.push(``);
  });
  return lines.join("\r\n");
}
