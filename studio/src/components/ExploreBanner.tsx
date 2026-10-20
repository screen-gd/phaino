import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ExploreBanner() {
  return (
    <section className="relative overflow-hidden rounded-panel border border-line" aria-label="Orbit preset">
      <img
        src="/explore/hero.webp"
        alt="A lone figure watching waves on a cinematic black and white shoreline"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative mx-auto flex min-h-[300px] max-w-[900px] flex-col items-center justify-center px-5 py-10 text-center sm:min-h-[320px] sm:px-10">
        <h2 className="font-display text-h1 font-extrabold uppercase leading-[1.05] tracking-tight font-stretch-[112.5%] md:text-display">
          Every frame. Wide open.
        </h2>
        <p className="mt-4 text-body text-t2">A slow 90° orbit around any still. LTX 2.5.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button size="lg" render={<Link href="/camera?preset=orbit" />}>
            Try Orbit
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/workflows/orbit" />}>
            Open the workflow
          </Button>
        </div>
      </div>
    </section>
  );
}
