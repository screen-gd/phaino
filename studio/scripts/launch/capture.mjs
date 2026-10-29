// Capture launch-video UI shots from a running Phaino with headless Chromium.
// No screen recording: each shot is a scripted page visit saved as MP4.
// Usage: node scripts/launch/capture.mjs [baseUrl] [shot...]
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../../.data/launch");
const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const SIZE = { width: 1920, height: 1080 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ease the page scroll to y over ms, so the capture reads as a camera move. */
async function glide(page, y, ms) {
  await page.evaluate(
    ([to, dur]) =>
      new Promise((done) => {
        const from = window.scrollY;
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur);
          const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
          window.scrollTo(0, from + (to - from) * e);
          if (k < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      }),
    [y, ms],
  );
}

const SHOTS = {
  async home(page) {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await wait(1500);
    // End on the partner banner when this build has it, else Trending presets.
    const banner = page.locator("#partner-banner-title");
    const target = (await banner.count()) ? banner : page.getByRole("heading", { name: "Trending presets" });
    const box = await target.first().boundingBox();
    await glide(page, Math.max(0, (box?.y ?? 1600) - 300), 6000);
    await wait(1200);
  },
  async picker(page) {
    await page.goto(`${BASE}/video`, { waitUntil: "networkidle" });
    await wait(800);
    await page.locator('button[aria-label^="Model:"]').first().click();
    await wait(900);
    for (const name of ["Kling", "Seedance", "Veo"]) {
      await page.getByRole("option", { name: new RegExp(`^${name}`) }).first().hover();
      await wait(500);
    }
    await page.getByRole("option", { name: /^Kling/ }).first().click();
    await wait(1800);
  },
  async workflow(page) {
    await page.goto(`${BASE}/workflows/orbit`, { waitUntil: "networkidle" });
    await wait(1500);
    await page.mouse.move(SIZE.width / 2, SIZE.height / 2);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -40);
      await wait(160);
    }
    await wait(1500);
  },
  async editor(page) {
    await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
    await wait(4000);
  },
  async agent(page) {
    await page.goto(pathToFileURL(path.join(here, "agent.html")).href);
    await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
    await wait(1200);
  },
};

const names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(SHOTS);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const name of names) {
  const tmp = path.join(OUT, `.${name}`);
  rmSync(tmp, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    recordVideo: { dir: tmp, size: SIZE },
  });
  const page = await context.newPage();
  // Hide Next's dev indicators when capturing from `pnpm dev`.
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
  const started = Date.now();
  await SHOTS[name](page);
  await context.close();
  const webm = path.join(tmp, readdirSync(tmp)[0]);
  const mp4 = path.join(OUT, `${name}.mp4`);
  // Drop the blank first frames while the page loads, then encode for the Editor.
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-ss", "0.6", "-i", webm,
    "-r", "24", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", mp4,
  ]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`${name}: ${mp4} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}
await browser.close();
