import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import type {
  SemanticFile,
  NormalisedVisit,
  NormalisedActivity,
  TimelineObject,
  ActivityType,
} from "../types.js";

function durationMinutes(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
}

function parseObject(obj: TimelineObject): NormalisedVisit | NormalisedActivity | null {
  if (obj.placeVisit) {
    const pv = obj.placeVisit;
    return {
      type: "visit",
      startTime: new Date(pv.duration.startTimestamp),
      endTime: new Date(pv.duration.endTimestamp),
      lat: pv.location.latitudeE7 / 1e7,
      lng: pv.location.longitudeE7 / 1e7,
      name: pv.location.name,
      address: pv.location.address,
      placeId: pv.location.placeId,
      confidence: pv.visitConfidence,
      durationMinutes: durationMinutes(pv.duration.startTimestamp, pv.duration.endTimestamp),
    };
  }

  if (obj.activitySegment) {
    const as_ = obj.activitySegment;
    return {
      type: "activity",
      startTime: new Date(as_.duration.startTimestamp),
      endTime: new Date(as_.duration.endTimestamp),
      activityType: as_.activityType as ActivityType,
      distanceMeters: as_.distance,
      startLat: as_.startLocation.latitudeE7 / 1e7,
      startLng: as_.startLocation.longitudeE7 / 1e7,
      endLat: as_.endLocation.latitudeE7 / 1e7,
      endLng: as_.endLocation.longitudeE7 / 1e7,
      confidence: as_.confidence,
      durationMinutes: durationMinutes(as_.duration.startTimestamp, as_.duration.endTimestamp),
    };
  }

  return null;
}

export function parseSemanticFile(filePath: string): (NormalisedVisit | NormalisedActivity)[] {
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as SemanticFile;
  return raw.timelineObjects
    .map(parseObject)
    .filter((e): e is NormalisedVisit | NormalisedActivity => e !== null);
}

export function parseSemanticDirectory(dirPath: string): (NormalisedVisit | NormalisedActivity)[] {
  const results: (NormalisedVisit | NormalisedActivity)[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (extname(entry) === ".json") {
        try {
          const raw = JSON.parse(readFileSync(full, "utf-8"));
          if (isSemanticFile(raw)) {
            results.push(...parseSemanticFile(full));
          }
        } catch {
          // skip unparseable files
        }
      }
    }
  }

  walk(dirPath);
  return results;
}

export function isSemanticFile(data: unknown): data is SemanticFile {
  return (
    typeof data === "object" &&
    data !== null &&
    "timelineObjects" in data &&
    Array.isArray((data as SemanticFile).timelineObjects)
  );
}
