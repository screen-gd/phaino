import type { Preset } from "@/server/presets/schema";
import type { StudioModel } from "@/components/toolStudioData";
import type { IconName } from "./icons";

export type MenuRow = {
  title: string;
  description: string;
  href: string;
  icon?: IconName;
  badge?: "New" | "Soon";
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
        },
        {
          title: "Characters",
          href: "/characters",
          description: "Consistent characters across shots",
          icon: "characters",
          badge: "Soon",
        },
        {
          title: "Edit",
          href: "/edit",
          description: "Upscale and inpaint",
          icon: "edit",
          badge: "Soon",
        },
        {
          title: "Workflows",
          href: "/workflows",
          description: "Open any image as a workflow",
          icon: "workflows",
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
        },
        {
          title: "Camera moves",
          href: "/camera",
          description: `${cameraPresets.length} cinematic moves`,
          icon: "camera",
          badge: "New",
        },
        {
          title: "Effects",
          href: "/effects",
          description: "One-click VFX",
          icon: "effects",
          badge: "Soon",
        },
        {
          title: "Avatars",
          href: "/avatars",
          description: "Lipsync",
          icon: "avatars",
          badge: "Soon",
        },
        {
          title: "Export",
          href: "/export",
          description: "FCPXML and EDL",
          icon: "export",
          badge: "Soon",
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

