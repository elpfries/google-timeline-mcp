import { filterByDateRange } from "../store.js";
import type { TimelineEntry, DateRangeQuery } from "../types.js";

function formatEntry(e: TimelineEntry): object {
  if (e.type === "visit") {
    return {
      type: "visit",
      start: e.startTime.toISOString(),
      end: e.endTime.toISOString(),
      durationMinutes: Math.round(e.durationMinutes),
      name: e.name ?? null,
      address: e.address ?? null,
      lat: e.lat,
      lng: e.lng,
      confidence: e.confidence,
    };
  }
  if (e.type === "activity") {
    return {
      type: "activity",
      start: e.startTime.toISOString(),
      end: e.endTime.toISOString(),
      durationMinutes: Math.round(e.durationMinutes),
      activityType: e.activityType,
      distanceMeters: e.distanceMeters ?? null,
      confidence: e.confidence,
      startLat: e.startLat,
      startLng: e.startLng,
      endLat: e.endLat,
      endLng: e.endLng,
    };
  }
  return {
    type: "raw",
    time: e.time.toISOString(),
    lat: e.lat,
    lng: e.lng,
    accuracy: e.accuracy,
    source: e.source ?? null,
  };
}

export function getLocationsByDateRange(query: DateRangeQuery): object {
  const start = new Date(query.start);
  const end = new Date(query.end);

  if (isNaN(start.getTime())) throw new Error(`Invalid start date: ${query.start}`);
  if (isNaN(end.getTime())) throw new Error(`Invalid end date: ${query.end}`);
  if (start > end) throw new Error("start must be before end");

  let entries = filterByDateRange(start, end);

  if (query.types && query.types.length > 0) {
    entries = entries.filter((e) => query.types!.includes(e.type as "visit" | "activity" | "raw"));
  }

  return {
    count: entries.length,
    start: start.toISOString(),
    end: end.toISOString(),
    entries: entries.map(formatEntry),
  };
}
