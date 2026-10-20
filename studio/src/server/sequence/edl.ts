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
      ``,
    );
  });
  return lines.join("\r\n");
}
