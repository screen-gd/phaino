import "@fontsource-variable/archivo";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Cutaway",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
