/** Vercel hosts the mockup by default; local installations keep the real backend. */
export function isDemoMode(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.PHAINO_DEMO === "on" ||
    (env.VERCEL === "1" && env.PHAINO_DEMO !== "off");
}
