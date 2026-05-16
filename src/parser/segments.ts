import { readFileSync } from "fs";
import type {
  SegmentsFile,
  SemanticSegment,
  NormalisedVisit,
  NormalisedActivity,
  NormalisedLocation,
  ActivityType,
} from "../types.js";

function parseLatLng(latLng: string): { lat: number; lng: number } {
  const [latStr, lngStr] = latLng.split(",");
  return {
    lat: parseFloat(latStr.replace("°", "").trim()),
    lng: parseFloat(lngStr.replace("°", "").trim()),
  };
}

function durationMinutes(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
}

function probabilityToConfidence(p: number | undefined): string {
  if (p === undefined) return "UNKNOWN";
  if (p >= 0.8) return "HIGH";
  if (p >= 0.5) return "MEDIUM";
  return "LOW";
}

function parseSegment(
  seg: SemanticSegment
): (NormalisedVisit | NormalisedActivity | NormalisedLocation)[] {
  const results: (NormalisedVisit | NormalisedActivity | NormalisedLocation)[] = [];

  if (seg.visit?.topCandidate?.placeLocation?.latLng) {
    const { lat, lng } = parseLatLng(seg.visit.topCandidate.placeLocation.latLng);
    results.push({
      type: "visit",
      startTime: new Date(seg.startTime),
      endTime: new Date(seg.endTime),
      lat,
      lng,
      placeId: seg.visit.topCandidate.placeId,
      confidence: seg.visit.probability ?? 0,
      durationMinutes: durationMinutes(seg.startTime, seg.endTime),
    });
  }

  if (seg.activity) {
    const act = seg.activity;
    const startLatLng = act.start?.latLng ? parseLatLng(act.start.latLng) : null;
    const endLatLng = act.end?.latLng ? parseLatLng(act.end.latLng) : null;
    if (startLatLng && endLatLng) {
      const rawType = act.topCandidate?.type ?? "UNKNOWN_ACTIVITY_TYPE";
      const activityType = (
        rawType === "UNKNOWN_ACTIVITY_TYPE" ? "UNKNOWN_ACTIVITY_TYPE" : rawType
      ) as ActivityType;
      results.push({
        type: "activity",
        startTime: new Date(seg.startTime),
        endTime: new Date(seg.endTime),
        activityType,
        distanceMeters: act.distanceMeters,
        startLat: startLatLng.lat,
        startLng: startLatLng.lng,
        endLat: endLatLng.lat,
        endLng: endLatLng.lng,
        confidence: probabilityToConfidence(act.topCandidate?.probability),
        durationMinutes: durationMinutes(seg.startTime, seg.endTime),
      });
    }
  }

  if (seg.timelinePath) {
    for (const point of seg.timelinePath) {
      const { lat, lng } = parseLatLng(point.point);
      results.push({
        type: "raw",
        time: new Date(point.time),
        lat,
        lng,
        accuracy: 0,
      });
    }
  }

  return results;
}

export function parseSegmentsFile(
  filePath: string
): (NormalisedVisit | NormalisedActivity | NormalisedLocation)[] {
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as SegmentsFile;
  return raw.semanticSegments.flatMap(parseSegment);
}

export function isSegmentsFile(data: unknown): data is SegmentsFile {
  return (
    typeof data === "object" &&
    data !== null &&
    "semanticSegments" in data &&
    Array.isArray((data as SegmentsFile).semanticSegments)
  );
}
