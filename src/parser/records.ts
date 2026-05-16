import { readFileSync } from "fs";
import type { RecordsFile, NormalisedLocation, NormalisedActivity, ActivityType } from "../types.js";

const ACTIVITY_MAP: Record<string, ActivityType> = {
  WALKING: "WALKING",
  RUNNING: "RUNNING",
  CYCLING: "CYCLING",
  ON_BICYCLE: "CYCLING",
  IN_VEHICLE: "IN_VEHICLE",
  IN_ROAD_VEHICLE: "IN_VEHICLE",
  IN_RAIL_VEHICLE: "IN_TRAIN",
  FLYING: "FLYING",
  STILL: "STILL",
  UNKNOWN: "UNKNOWN_ACTIVITY_TYPE",
};

export function parseRecordsFile(filePath: string): (NormalisedLocation | NormalisedActivity)[] {
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as RecordsFile;

  return raw.locations.map((loc): NormalisedLocation => {
    const detectedActivities = loc.activity?.flatMap((a) =>
      a.activity.map((act) => ({
        activity: ACTIVITY_MAP[act.type] ?? act.type,
        confidence: act.confidence,
      }))
    );

    return {
      type: "raw",
      time: new Date(loc.timestamp),
      lat: loc.latitudeE7 / 1e7,
      lng: loc.longitudeE7 / 1e7,
      accuracy: loc.accuracy,
      altitude: loc.altitude,
      source: loc.source,
      detectedActivities,
    };
  });
}

export function isRecordsFile(data: unknown): data is RecordsFile {
  return (
    typeof data === "object" &&
    data !== null &&
    "locations" in data &&
    Array.isArray((data as RecordsFile).locations)
  );
}
