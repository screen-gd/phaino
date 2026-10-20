/** 1234 -> "1.2k", 842 -> "842". */
export function formatStars(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count);
}
