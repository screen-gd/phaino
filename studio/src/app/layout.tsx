import "@fontsource-variable/mona-sans/wdth.css";
import "@fontsource-variable/outfit";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { buildNavMenus } from "@/components/navMenus";
import { getEnv } from "@/server/env";
import { listPresets } from "@/server/presets/load";

export const metadata: Metadata = {
  metadataBase: new URL(getEnv().siteUrl),
  title: "Phaino",
  description:
    "Open-source AI video and image studio on Comfy Cloud. Every shot opens as a ComfyUI workflow.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const menus = buildNavMenus(listPresets());
  return (
    <html lang="en" className="dark">
      <body>
        <AppShell menus={menus}>{children}</AppShell>
      </body>
    </html>
  );
}
