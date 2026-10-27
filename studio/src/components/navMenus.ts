import type { Preset } from "@/server/presets/schema";
import type { StudioModel } from "@/components/toolStudioData";
import { featureById, type FeatureId, type FeatureStatus } from "@/lib/features";
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

/** Feature links follow release status in the shared directory. */
function featureLink(id: FeatureId) {
  const feature = featureById(id);
  if (!feature) throw new Error(`Unknown feature "${id}"`);
  return {
    href: feature.status === "soon" ? "/roadmap" : feature.href,
    status: feature.status,
  };
}

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
          description: "Generate images from a prompt",
          icon: "image",
          ...featureLink("image"),
        },
        {
          title: "Characters",
          description: "Consistent characters across shots",
          icon: "characters",
          ...featureLink("characters"),
        },
        {
          title: "Workflows",
          description: "Open any image as a workflow",
          icon: "workflows",
          ...featureLink("workflows"),
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
          description: "Image or text to video",
          icon: "video",
          ...featureLink("video"),
        },
        {
          title: "Camera moves",
          description: `${cameraPresets.length} cinematic moves`,
          icon: "camera",
          ...featureLink("camera"),
        },
        {
          title: "Effects",
          description: "One-click reframe, upscale and smooth motion",
          icon: "effects",
          ...featureLink("effects"),
        },
        {
          title: "Avatars",
          description: "Lipsync",
          icon: "avatars",
          ...featureLink("avatars"),
        },
        {
          title: "Edit Video",
          description: "Upscale, reframe, relight",
          icon: "edit",
          ...featureLink("edit"),
        },
        {
          title: "Editor",
          description: "Cut, titles and music",
          icon: "export",
          ...featureLink("editor"),
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
