import { existsSync, statSync, readFileSync } from "fs";
import { parseRecordsFile, isRecordsFile } from "./parser/records.js";
import { parseSemanticFile, parseSemanticDirectory, isSemanticFile } from "./parser/semantic.js";
import { parseSegmentsFile, isSegmentsFile } from "./parser/segments.js";
import type { TimelineEntry, NormalisedVisit, NormalisedActivity, NormalisedLocation } from "./types.js";

let _entries: TimelineEntry[] = [];
let _loaded = false;

export function loadData(dataPath: string): { count: number; types: Record<string, number> } {
  if (!existsSync(dataPath)) throw new Error(`Path not found: ${dataPath}`);

  const stat = statSync(dataPath);
  let raw: TimelineEntry[] = [];

  if (stat.isDirectory()) {
    raw = parseSemanticDirectory(dataPath);
  } else {
    const content = JSON.parse(readFileSync(dataPath, "utf-8"));
    if (isRecordsFile(content)) {
      raw = parseRecordsFile(dataPath);
    } else if (isSemanticFile(content)) {
      raw = parseSemanticFile(dataPath);
    } else if (isSegmentsFile(content)) {
      raw = parseSegmentsFile(dataPath);
    } else {
      throw new Error(
        "Unrecognised file format. Expected the Android Timeline export JSON (semanticSegments), or older Records.json / Semantic Location History JSON."
      );
    }
  }

  _entries = raw.sort((a, b) => getTime(a) - getTime(b));
  _loaded = true;

  const types: Record<string, number> = {};
  for (const e of _entries) {
    types[e.type] = (types[e.type] ?? 0) + 1;
  }
  return { count: _entries.length, types };
}

function getTime(e: TimelineEntry): number {
  if (e.type === "raw") return e.time.getTime();
  return e.startTime.getTime();
}

export function requireLoaded(): TimelineEntry[] {
  if (!_loaded || _entries.length === 0) {
    throw new Error("No data loaded. Call load_data first with a path to your Google Timeline export.");
  }
  return _entries;
}

export function isLoaded(): boolean {
  return _loaded;
}

export function getEntries(): TimelineEntry[] {
  return _entries;
}

export function filterByDateRange(start: Date, end: Date): TimelineEntry[] {
  return requireLoaded().filter((e) => {
    const t = getTime(e);
    return t >= start.getTime() && t <= end.getTime();
  });
}

export function getVisits(): NormalisedVisit[] {
  return requireLoaded().filter((e): e is NormalisedVisit => e.type === "visit");
}

export function getActivities(): NormalisedActivity[] {
  return requireLoaded().filter((e): e is NormalisedActivity => e.type === "activity");
}

export function getRawLocations(): NormalisedLocation[] {
  return requireLoaded().filter((e): e is NormalisedLocation => e.type === "raw");
}

// Haversine distance in metres
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
