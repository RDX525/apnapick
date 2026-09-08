import { ImageResponse } from "next/og";

export const alt = "ApnaPick — intent-first local discovery for Pune";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#07131a",
        color: "#f8fafc",
        padding: "72px",
      }}
    >
      <div style={{ display: "flex", fontSize: 42, letterSpacing: "-0.04em" }}>
        Apna<span style={{ color: "#65c9d1" }}>Pick</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            maxWidth: 920,
            fontSize: 76,
            lineHeight: 1.02,
            letterSpacing: "-0.045em",
          }}
        >
          Find the best local places for what you need.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#a8b1c2" }}>
          Trusted, intent-first discovery across Pune.
        </div>
      </div>
    </div>,
    size,
  );
}
