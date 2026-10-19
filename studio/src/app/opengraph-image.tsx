import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Phaino — open-source AI video and image studio on Comfy Cloud";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const outfit = await readFile(
    path.join(
      process.cwd(),
      "node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff",
    ),
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 44,
      }}
    >
      <svg width={160} height={160} viewBox="0 0 100 100" fill="#FF5B22">
        <path d="M0 19 Q0 9.5 9 9 Q55 3 100 1 V20 Q45 30 0 55 Z" />
        <path d="M100 30 V100 H4 Q0 100 0 96 V70 Q50 42 100 30 Z" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <span
          style={{
            fontFamily: "Outfit",
            fontSize: 120,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          Phaino
        </span>
        <span style={{ fontSize: 34, color: "#a1a1a1", fontFamily: "Outfit" }}>
          Open-source AI video and image studio on Comfy Cloud
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Outfit",
          data: outfit,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
