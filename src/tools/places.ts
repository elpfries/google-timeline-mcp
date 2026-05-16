import { getVisits } from "../store.js";
import type { NormalisedVisit, PlacesQuery } from "../types.js";

interface PlaceSummary {
  name: string | null;
  address: string | null;
  placeId: string | null;
  lat: number;
  lng: number;
  visitCount: number;
  totalMinutes: number;
  firstVisit: string;
  lastVisit: string;
  avgDurationMinutes: number;
}

export function getPlacesVisited(query: PlacesQuery): object {
  let visits = getVisits();

  if (query.start) {
    const start = new Date(query.start);
    visits = visits.filter((v) => v.startTime >= start);
  }
  if (query.end) {
    const end = new Date(query.end);
    visits = visits.filter((v) => v.startTime <= end);
  }
  if (query.minDurationMinutes) {
    visits = visits.filter((v) => v.durationMinutes >= query.minDurationMinutes!);
  }
  if (query.nameContains) {
    const needle = query.nameContains.toLowerCase();
    visits = visits.filter((v) => v.name?.toLowerCase().includes(needle));
  }

  // Group by placeId if available, otherwise by rounded coordinates
  const groups = new Map<string, NormalisedVisit[]>();
  for (const v of visits) {
    const key = v.placeId ?? `${v.lat.toFixed(4)},${v.lng.toFixed(4)}`;
    const group = groups.get(key) ?? [];
    group.push(v);
    groups.set(key, group);
  }

  let summaries: PlaceSummary[] = [];
  for (const [, group] of groups) {
    const sorted = group.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const totalMinutes = group.reduce((s, v) => s + v.durationMinutes, 0);
    summaries.push({
      name: group.find((v) => v.name)?.name ?? null,
      address: group.find((v) => v.address)?.address ?? null,
      placeId: group[0].placeId ?? null,
      lat: group.reduce((s, v) => s + v.lat, 0) / group.length,
      lng: group.reduce((s, v) => s + v.lng, 0) / group.length,
      visitCount: group.length,
      totalMinutes: Math.round(totalMinutes),
      avgDurationMinutes: Math.round(totalMinutes / group.length),
      firstVisit: sorted[0].startTime.toISOString(),
      lastVisit: sorted[sorted.length - 1].startTime.toISOString(),
    });
  }

  if (query.minVisits) {
    summaries = summaries.filter((s) => s.visitCount >= query.minVisits!);
  }

  summaries.sort((a, b) => b.visitCount - a.visitCount);

  return { count: summaries.length, places: summaries };
}
