"use client";

import { useState, useEffect } from "react";

const DEFAULT_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

// Module-level cache so all map instances share a single fetch without multiple network requests
let cachedTileUrl: string | null = null;
let fetchPromise: Promise<string> | null = null;

async function fetchMapTileUrl(): Promise<string> {
  if (cachedTileUrl) return cachedTileUrl;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/map-config");
      if (res.ok) {
        const data = await res.json();
        if (data?.tileUrl) {
          cachedTileUrl = data.tileUrl;
          return data.tileUrl;
        }
      }
    } catch (err) {
      console.warn("Failed to load server map configuration, using default basemap:", err);
    }
    cachedTileUrl = DEFAULT_TILE_URL;
    return DEFAULT_TILE_URL;
  })();

  return fetchPromise;
}

export function useMapConfig() {
  const [tileUrl, setTileUrl] = useState<string>(cachedTileUrl || DEFAULT_TILE_URL);

  useEffect(() => {
    let isMounted = true;

    if (!cachedTileUrl) {
      fetchMapTileUrl().then((url) => {
        if (isMounted) {
          setTileUrl(url);
        }
      });
    } else if (tileUrl !== cachedTileUrl) {
      setTileUrl(cachedTileUrl);
    }

    return () => {
      isMounted = false;
    };
  }, [tileUrl]);

  return { tileUrl };
}
