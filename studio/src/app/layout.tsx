import "@fontsource-variable/mona-sans/wdth.css";
import "@fontsource-variable/outfit";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { DemoProvider } from "@/components/DemoProvider";
import { isDemoMode } from "@/lib/demo-mode";
import { buildNavMenus } from "@/components/navMenus";
import { getEnv } from "@/server/env";
import { getGitHubStars } from "@/server/github";
import { toStudioModels } from "@/server/models/view";
import { listPresets } from "@/server/presets/load";

const DESCRIPTION =
  "Open-source AI video and image studio on Comfy Cloud. Every shot opens as a ComfyUI workflow.";

export const metadata: Metadata = {
  metadataBase: new URL(getEnv().siteUrl),
  title: { default: "Phaino", template: "%s · Phaino" },
  description: DESCRIPTION,
  openGraph: {
    title: "Phaino",
    description: DESCRIPTION,
    siteName: "Phaino",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const menus = buildNavMenus(listPresets(), [
    ...toStudioModels("image"),
    ...toStudioModels("video"),
  ]);
  const stars = await getGitHubStars();
  return (
    <html lang="en" className="dark">
      <body>
        <DemoProvider enabled={isDemoMode()}>
          <AppShell menus={menus} stars={stars}>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
