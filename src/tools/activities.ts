import { getActivities } from "../store.js";
import type { ActivitiesQuery, ActivityType } from "../types.js";

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  WALKING: "Marche",
  RUNNING: "Course",
  CYCLING: "Vélo",
  IN_VEHICLE: "Véhicule",
  IN_CAR: "Voiture",
  IN_BUS: "Bus",
  IN_TRAIN: "Train",
  IN_SUBWAY: "Métro",
  IN_TRAM: "Tramway",
  IN_FERRY: "Ferry",
  FLYING: "Avion",
  SKIING: "Ski",
  SAILING: "Bateau",
  STILL: "Immobile",
  UNKNOWN_ACTIVITY_TYPE: "Inconnu",
};

export function getActivitiesSummary(query: ActivitiesQuery): object {
  let activities = getActivities();

  if (query.start) {
    const start = new Date(query.start);
    activities = activities.filter((a) => a.startTime >= start);
  }
  if (query.end) {
    const end = new Date(query.end);
    activities = activities.filter((a) => a.startTime <= end);
  }
  if (query.activityTypes && query.activityTypes.length > 0) {
    activities = activities.filter((a) => query.activityTypes!.includes(a.activityType));
  }
  if (query.minDistanceMeters !== undefined) {
    activities = activities.filter((a) => (a.distanceMeters ?? 0) >= query.minDistanceMeters!);
  }
  if (query.maxDistanceMeters !== undefined) {
    activities = activities.filter((a) => (a.distanceMeters ?? Infinity) <= query.maxDistanceMeters!);
  }

  // Per-type stats
  const byType = new Map<ActivityType, { count: number; totalDistance: number; totalMinutes: number }>();
  for (const a of activities) {
    const s = byType.get(a.activityType) ?? { count: 0, totalDistance: 0, totalMinutes: 0 };
    s.count++;
    s.totalDistance += a.distanceMeters ?? 0;
    s.totalMinutes += a.durationMinutes;
    byType.set(a.activityType, s);
  }

  const stats = [...byType.entries()].map(([type, s]) => ({
    activityType: type,
    label: ACTIVITY_LABELS[type] ?? type,
    count: s.count,
    totalDistanceKm: Math.round(s.totalDistance / 100) / 10,
    totalMinutes: Math.round(s.totalMinutes),
    avgDistanceKm: s.count > 0 ? Math.round(s.totalDistance / s.count / 100) / 10 : 0,
  })).sort((a, b) => b.count - a.count);

  const entries = activities.map((a) => ({
    start: a.startTime.toISOString(),
    end: a.endTime.toISOString(),
    activityType: a.activityType,
    label: ACTIVITY_LABELS[a.activityType] ?? a.activityType,
    distanceKm: a.distanceMeters !== undefined ? Math.round(a.distanceMeters / 100) / 10 : null,
    durationMinutes: Math.round(a.durationMinutes),
    confidence: a.confidence,
    startLat: a.startLat,
    startLng: a.startLng,
    endLat: a.endLat,
    endLng: a.endLng,
  }));

  return {
    count: activities.length,
    stats,
    entries,
  };
}
