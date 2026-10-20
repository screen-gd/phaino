import Link from "next/link";
import { DitherBackdrop } from "@/components/DitherBackdrop";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden">
      <DitherBackdrop />
      <div className="relative z-10 flex flex-col items-center px-4 pb-24 text-center">
        <p className="font-wordmark text-[clamp(120px,26vw,360px)] font-extrabold leading-[0.85] tracking-[-0.04em] text-[#f2f2f2]">
          404
        </p>
        <p className="font-display text-xl text-t2">
          This page isn&apos;t in the studio.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="h-11 rounded-full px-6" render={<Link href="/" />}>
            Back to Explore
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 rounded-full px-6"
            render={<Link href="/workflows" />}
          >
            Browse workflows
          </Button>
        </div>
      </div>
    </div>
  );
}
