import { requireLoaded, distanceMeters } from "../store.js";
import type { NearbyQuery, TimelineEntry } from "../types.js";

function getCoords(e: TimelineEntry): { lat: number; lng: number } | null {
  if (e.type === "visit") return { lat: e.lat, lng: e.lng };
  if (e.type === "raw") return { lat: e.lat, lng: e.lng };
  // For activities, check both start and end
  return { lat: e.startLat, lng: e.startLng };
}

function formatEntry(e: TimelineEntry, dist: number): object {
  const base = { distanceMeters: Math.round(dist) };
  if (e.type === "visit") {
    return {
      ...base,
      type: "visit",
      start: e.startTime.toISOString(),
      end: e.endTime.toISOString(),
      name: e.name ?? null,
      address: e.address ?? null,
      lat: e.lat,
      lng: e.lng,
      durationMinutes: Math.round(e.durationMinutes),
      confidence: e.confidence,
    };
  }
  if (e.type === "activity") {
    return {
      ...base,
      type: "activity",
      start: e.startTime.toISOString(),
      end: e.endTime.toISOString(),
      activityType: e.activityType,
      distanceKm: e.distanceMeters !== undefined ? Math.round(e.distanceMeters / 100) / 10 : null,
      startLat: e.startLat,
      startLng: e.startLng,
      endLat: e.endLat,
      endLng: e.endLng,
    };
  }
  return {
    ...base,
    type: "raw",
    time: e.time.toISOString(),
    lat: e.lat,
    lng: e.lng,
    accuracy: e.accuracy,
  };
}

export function findVisitsNear(query: NearbyQuery): object {
  if (query.radiusMeters <= 0) throw new Error("radiusMeters must be > 0");

  let entries = requireLoaded();

  if (query.types && query.types.length > 0) {
    entries = entries.filter((e) => query.types!.includes(e.type as "visit" | "activity" | "raw"));
  }
  if (query.start) {
    const start = new Date(query.start);
    entries = entries.filter((e) => (e.type === "raw" ? e.time : e.startTime) >= start);
  }
  if (query.end) {
    const end = new Date(query.end);
    entries = entries.filter((e) => (e.type === "raw" ? e.time : e.startTime) <= end);
  }

  const results: { entry: TimelineEntry; dist: number }[] = [];

  for (const e of entries) {
    const coords = getCoords(e);
    if (!coords) continue;
    const dist = distanceMeters(query.lat, query.lng, coords.lat, coords.lng);
    if (dist <= query.radiusMeters) {
      results.push({ entry: e, dist });
    }

    // Also check end location for activities
    if (e.type === "activity") {
      const endDist = distanceMeters(query.lat, query.lng, e.endLat, e.endLng);
      if (endDist <= query.radiusMeters && endDist < dist) {
        results[results.length - 1] = { entry: e, dist: endDist };
      }
    }
  }

  results.sort((a, b) => a.dist - b.dist);

  return {
    count: results.length,
    center: { lat: query.lat, lng: query.lng },
    radiusMeters: query.radiusMeters,
    entries: results.map(({ entry, dist }) => formatEntry(entry, dist)),
  };
}
