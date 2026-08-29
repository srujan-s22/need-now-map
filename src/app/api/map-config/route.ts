import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const mapKey = process.env.MAP_KEY;
  const tileUrl = mapKey
    ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${mapKey}`
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  return NextResponse.json(
    {
      tileUrl,
      hasKey: Boolean(mapKey),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
