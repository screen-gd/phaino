import type { Preset } from "@/server/presets/schema";
import type { StudioModel } from "@/components/toolStudioData";
import { featureById, type FeatureStatus } from "@/lib/features";
import type { IconName } from "./icons";

export type MenuRow = {
  title: string;
  description: string;
  href: string;
  icon?: IconName;
  status?: FeatureStatus;
  thumb?: string;
};

export type TwoColumnMenu = {
  features: MenuRow[];
  models: MenuRow[];
};

export type NavMenus = {
  image: TwoColumnMenu;
  video: TwoColumnMenu;
  camera: MenuRow[];
};

/** Status from the feature directory; live renders no tag. */
const statusOf = (id: string) => featureById(id)?.status;

// Soon rows stay listed but point at the roadmap, not stub pages.
const SOON_HREF = "/roadmap";

/** Header mega-menu data built from the preset catalog and model registry. */
export function buildNavMenus(
  presets: Preset[],
  models: StudioModel[] = [],
): NavMenus {
  const cameraPresets = presets.filter((p) => p.category === "camera");
  return {
    image: {
      features: [
        {
          title: "Create Image",
          href: "/image",
          description: "Generate images from a prompt",
          icon: "image",
          status: statusOf("image"),
        },
        {
          title: "Characters",
          href: SOON_HREF,
          description: "Consistent characters across shots",
          icon: "characters",
          status: statusOf("characters"),
        },
        {
          title: "Workflows",
          href: "/workflows",
          description: "Open any image as a workflow",
          icon: "workflows",
          status: statusOf("workflows"),
        },
      ],
      models: models
        .filter((m) => m.kind === "image")
        .map(
          (m): MenuRow => ({
            title: m.label,
            description: m.modeLabels,
            href: `/image?preset=${m.defaultPresetId}`,
            icon: "image",
          }),
        ),
    },
    video: {
      features: [
        {
          title: "Create Video",
          href: "/video",
          description: "Image or text to video",
          icon: "video",
          status: statusOf("video"),
        },
        {
          title: "Camera moves",
          href: "/camera",
          description: `${cameraPresets.length} cinematic moves`,
          icon: "camera",
          status: statusOf("camera"),
        },
        {
          title: "Effects",
          href: SOON_HREF,
          description: "One-click VFX",
          icon: "effects",
          status: statusOf("effects"),
        },
        {
          title: "Avatars",
          href: SOON_HREF,
          description: "Lipsync",
          icon: "avatars",
          status: statusOf("avatars"),
        },
        {
          title: "Edit Video",
          href: "/edit",
          description: "Upscale, reframe, relight",
          icon: "edit",
          status: statusOf("edit"),
        },
        {
          title: "Editor",
          href: "/editor",
          description: "Cut, titles and music",
          icon: "export",
          status: statusOf("editor"),
        },
      ],
      models: models
        .filter((m) => m.kind === "video")
        .map(
          (m): MenuRow => ({
            title: m.label,
            description: m.modeLabels,
            href: `/video?preset=${m.defaultPresetId}`,
            icon: "video",
          }),
        ),
    },
    camera: cameraPresets.map(
      (p): MenuRow => ({
        title: p.name,
        description: p.description,
        href: `/camera?preset=${p.id}`,
        thumb: `/api/presets/${p.id}/thumb`,
      }),
    ),
  };
}
