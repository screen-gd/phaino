import Link from "next/link";
import { FooterDither } from "@/components/FooterDither";
import { FooterWordmark } from "@/components/FooterWordmark";
import { GitHubIcon } from "@/components/icons";
import { FEATURES } from "@/lib/features";
import type { Preset } from "@/server/presets/schema";
import type { StudioModel } from "@/components/toolStudioData";

const REPO = "https://github.com/screen-gd/phaino";

export function ExploreFooter({
  presets,
  models = [],
}: {
  presets: Preset[];
  models?: StudioModel[];
}) {
  const camera = presets.filter((preset) => preset.category === "camera");
  const groups = [
    {
      title: "Create",
      links: [
        { label: "AI image", href: "/image" },
        { label: "AI video", href: "/video" },
        { label: "Camera moves", href: "/camera" },
        { label: "Library", href: "/library" },
      ],
    },
    ...(["image", "video"] satisfies Preset["category"][]).map((kind) => ({
      title: kind === "image" ? "Image models" : "Video models",
      links: [
        ...models
          .filter((m) => m.kind === kind)
          .slice(0, 6)
          .map((m) => ({
            label: m.label,
            href: `/${kind}?preset=${m.defaultPresetId}`,
          })),
        { label: `All ${kind} models`, href: `/${kind}` },
      ],
    })),
    {
      title: "Camera moves",
      links: camera.map((preset) => ({ label: preset.name, href: `/camera?preset=${preset.id}` })),
    },
    {
      title: "Resources",
      links: [
        { label: "All workflows", href: "/workflows" },
        { label: "Connect Comfy Cloud", href: "/settings" },
        { label: "GitHub Γåù", href: REPO, external: true },
        { label: "Documentation Γåù", href: `${REPO}#readme`, external: true },
        { label: "Report an issue Γåù", href: `${REPO}/issues`, external: true },
      ],
    },
  ];

  return (
    <div className="mt-20">
      <section aria-labelledby="feature-directory-title" className="border-t border-line px-4 py-16 sm:py-20">
        <h2 id="feature-directory-title" className="text-center text-h2 font-semibold tracking-tight text-t1">Explore more features</h2>
        <div className="mx-auto mt-7 flex max-w-5xl flex-wrap justify-center gap-2">
          {FEATURES.filter((feature) => feature.status !== "soon").map((feature) => (
            <Link key={feature.href} href={feature.href} className="rounded-md border border-line bg-s1 px-3 py-2 text-body text-t2 hover:underline underline-offset-4">{feature.label}</Link>
          ))}
          {camera.map((preset) => (
            <Link key={preset.id} href={`/camera?preset=${preset.id}`} className="rounded-md border border-line bg-s1 px-3 py-2 text-body text-t2 hover:underline underline-offset-4">{preset.name}</Link>
          ))}
        </div>
      </section>

      <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-line px-4 py-12 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-4 text-caption font-medium text-t3">{group.title}</h3>
            <ul className="space-y-2.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-body text-t2 hover:text-ac"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-body text-t2 hover:text-ac"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <footer aria-label="Phaino" className="relative -mx-4 -mb-10 overflow-hidden">
        <FooterDither />
        <div className="relative z-10">
          <section
            aria-label="Get Phaino"
            className="px-4 pt-10 sm:px-6"
          >
            <div className="flex flex-wrap justify-center gap-2.5 max-[480px]:w-full max-[480px]:[&>*]:flex-1">
              <a
                href={REPO}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[50px] items-center justify-center gap-3 rounded-full bg-ac px-[22px] text-body font-[550] whitespace-nowrap text-on transition-[transform,background-color] duration-150 hover:bg-[#ff6d3a] active:scale-[0.97]"
              >
                <GitHubIcon className="h-[18px] w-[18px]" />
                Get Phaino on GitHub
              </a>
              <a
                href="https://x.com/Screeendev"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[50px] items-center justify-center gap-3 rounded-full border border-white/25 bg-black/65 px-[22px] text-body font-[550] whitespace-nowrap text-white transition-[transform,background-color,border-color] duration-150 hover:border-white/50 hover:bg-black/85 active:scale-[0.97]"
              >
                Follow @Screeendev
              </a>
            </div>
          </section>
          <FooterWordmark />
          <div className="flex flex-wrap items-center justify-between gap-[30px] px-4 py-[30px] text-caption text-[#d4d4d4] max-[800px]:gap-[15px] max-[480px]:pt-[22px] sm:px-6">
            <span className="max-[480px]:w-full">┬⌐ 2026 Phaino</span>
            <span className="max-[800px]:hidden">Built on ComfyUI.</span>
            <div className="flex gap-[26px] text-[#e6e6e6] max-[800px]:gap-[18px] max-[480px]:gap-[23px]">
              <a
                href={`${REPO}/blob/main/LICENSE`}
                target="_blank"
                rel="noreferrer"
                className="py-2 transition-colors duration-150 hover:text-ac"
              >
                MIT
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

