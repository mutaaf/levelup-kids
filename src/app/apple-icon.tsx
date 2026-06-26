import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS Add-to-Home-Screen icon. iOS applies its own rounded mask, but we
// fill edge-to-edge anyway so the visible area is solid indigo with a
// crisp 'L' inset.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(140deg, #6366f1 0%, #4f46e5 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 118,
          fontWeight: 800,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          letterSpacing: "-0.06em",
          lineHeight: 1,
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
