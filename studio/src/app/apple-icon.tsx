import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same mark paths as src/components/Logo.tsx (PhainoMark).
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FF5B22",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={101} height={101} viewBox="0 0 100 100" fill="#160700">
        <path d="M0 19 Q0 9.5 9 9 Q55 3 100 1 V20 Q45 30 0 55 Z" />
        <path d="M100 30 V100 H4 Q0 100 0 96 V70 Q50 42 100 30 Z" />
      </svg>
    </div>,
    size,
  );
}
