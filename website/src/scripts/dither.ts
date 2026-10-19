/* Ordered-dither wash, ported from dither-kit's DitherGradient (tripwire.sh/dither-kit) with
   direction "up": solid at the bottom edge, dissolving to transparent as it rises.
   Static: one paint per resize, no animation loop. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((value) => (value + 0.5) / 16);

type DitherGradient = { color: [number, number, number]; cell: number; opacity: number };

export function initDitherGradient(canvas: HTMLCanvasElement, gradient: DitherGradient) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const [r, g, b] = gradient.color;
  const paint = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    const cols = Math.min(960, Math.max(4, Math.round(width / gradient.cell)));
    const rows = Math.min(600, Math.max(4, Math.round(height / gradient.cell)));
    canvas.width = cols;
    canvas.height = rows;
    const image = ctx.createImageData(cols, rows);
    for (let y = 0; y < rows; y++) {
      const density = ((y + 0.5) / rows) ** 1.6;
      for (let x = 0; x < cols; x++) {
        const lit = density > (BAYER4[((y & 3) << 2) | (x & 3)] ?? 1);
        const alpha = (lit ? 0.35 + 0.65 * density : 0.12 * density) * gradient.opacity;
        if (alpha <= 0.004) continue;
        const index = (y * cols + x) * 4;
        image.data[index] = r;
        image.data[index + 1] = g;
        image.data[index + 2] = b;
        image.data[index + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(image, 0, 0);
  };
  paint();
  new ResizeObserver(paint).observe(canvas);
}
