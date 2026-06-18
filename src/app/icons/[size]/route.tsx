import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

export const runtime = "edge";

// /icons/192 → 192×192 PNG with the LevelUp Kids mark.
// /icons/512 → 512×512 PNG.
// /icons/512-maskable → 512×512 maskable (extra padding so the icon
// survives the OS-level circular mask).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
): Promise<Response> {
  const { size: raw } = await params;
  const [sizeStr, ...rest] = raw.split("-");
  const size = Math.min(Math.max(parseInt(sizeStr ?? "192", 10), 32), 1024);
  if (!Number.isFinite(size)) return NextResponse.json({ error: "bad size" }, { status: 400 });
  const maskable = rest.includes("maskable");
  const padding = maskable ? size * 0.15 : 0;
  const fontSize = (size - padding * 2) * 0.62;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#d2562b",
          color: "#faf7f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding,
          fontSize,
          fontWeight: 700,
          fontFamily: "serif",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        L
      </div>
    ),
    { width: size, height: size },
  );
}
