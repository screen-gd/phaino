import { featureById, type FeatureId, type FeatureStatus } from "@/lib/features";

export type NavSection = {
  href: string;
  label: string;
  group: "core" | "studio";
  /** Feature id when the entry comes from the feature directory. */
  id?: string;
  status?: FeatureStatus;
};

type SectionSeed = Omit<NavSection, "status" | "id"> & { id?: FeatureId };

// Soon entries stay visible in the header but go to /roadmap, not the stubs.
const NAV: readonly SectionSeed[] = [
  { href: "/", label: "Explore", group: "core" },
  { href: "/image", label: "Image", group: "core", id: "image" },
  { href: "/video", label: "Video", group: "core", id: "video" },
  { href: "/library", label: "Library", group: "core", id: "library" },
  { href: "/audio", label: "Audio", group: "core", id: "audio" },
  { href: "/mcp", label: "MCP", group: "core", id: "mcp" },
  { href: "/developers", label: "API", group: "core", id: "api" },
  { href: "/camera", label: "Camera moves", group: "studio", id: "camera" },
  { href: "/effects", label: "Effects", group: "studio", id: "effects" },
  { href: "/characters", label: "Characters", group: "studio", id: "characters" },
  { href: "/avatars", label: "Avatars", group: "studio", id: "avatars" },
  { href: "/edit", label: "Edit", group: "studio", id: "edit" },
  { href: "/workflows", label: "Workflows", group: "studio", id: "workflows" },
  { href: "/showcase", label: "Showcase", group: "studio", id: "showcase" },
  { href: "/editor", label: "Editor", group: "studio", id: "editor" },
];

export const SECTIONS: readonly NavSection[] = NAV.map((section) => {
  const feature = section.id ? featureById(section.id) : undefined;
  return {
    ...section,
    href: feature ? (feature.status === "soon" ? "/roadmap" : feature.href) : section.href,
    status: feature?.status,
  };
});
