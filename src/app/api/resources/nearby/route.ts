import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { searchNearbyCapabilities } from "@/lib/geospatial";
import { rankOperationalResources } from "@/lib/resourceRanker";
import { ResourceCapability } from "@/types/investigation";

export async function GET(req: NextRequest) {
  // Enforce Authority Session Security
  const authorized = await isAuthorized();
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized. Authority authentication required to access operational resource intelligence." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const capability = searchParams.get("capability") as ResourceCapability | null;
  const radiusKm = parseInt(searchParams.get("radiusKm") || "10", 10);

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "Missing required query parameters: lat, lng" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates provided." }, { status: 400 });
  }

  const capabilitiesToQuery: ResourceCapability[] = capability
    ? [capability]
    : ["fire_suppression", "trauma_care", "power_grid_isolation", "water_grid_isolation", "public_works_clearing"];

  const searchResult = await searchNearbyCapabilities(lat, lng, capabilitiesToQuery, radiusKm);
  const ranked = rankOperationalResources(searchResult.evidence, capabilitiesToQuery);

  return NextResponse.json(
    {
      lat,
      lng,
      radiusKm,
      count: ranked.length,
      resources: ranked,
      retrievedAt: new Date().toISOString(),
      source: "OpenStreetMap / Overpass API",
    },
    { status: 200 }
  );
}
