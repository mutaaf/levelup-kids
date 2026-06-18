import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#d2562b",
          color: "#faf7f2",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
          fontWeight: 700,
          fontFamily: "serif",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
