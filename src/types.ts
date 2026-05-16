// Google Timeline export types (Android export plus older Google JSON formats)

// ─── Records.json (raw GPS) ───────────────────────────────────────────────────

export interface RawActivity {
  activity: { type: string; confidence: number }[];
  timestamp: string;
}

export interface RawLocation {
  latitudeE7: number;
  longitudeE7: number;
  accuracy: number;
  timestamp: string;
  altitude?: number;
  verticalAccuracy?: number;
  velocity?: number;
  heading?: number;
  source?: string;
  deviceTag?: number;
  activity?: RawActivity[];
}

export interface RecordsFile {
  locations: RawLocation[];
}

// ─── Semantic Location History (YYYY_MONTH.json) ─────────────────────────────

export interface SemanticLocation {
  latitudeE7: number;
  longitudeE7: number;
  placeId?: string;
  address?: string;
  name?: string;
  locationConfidence?: number;
  semanticType?: string;
}

export interface TimelineDuration {
  startTimestamp: string;
  endTimestamp: string;
}

export interface PlaceVisit {
  location: SemanticLocation;
  duration: TimelineDuration;
  placeConfidence: string;
  visitConfidence: number;
  centerLatE7?: number;
  centerLngE7?: number;
  otherCandidateLocations?: SemanticLocation[];
  editConfirmationStatus?: string;
}

export interface ActivitySegment {
  startLocation: { latitudeE7: number; longitudeE7: number };
  endLocation: { latitudeE7: number; longitudeE7: number };
  duration: TimelineDuration;
  distance?: number;
  activityType: ActivityType;
  confidence: string;
  activities?: { activityType: string; probability: number }[];
  waypointPath?: {
    waypoints: { latE7: number; lngE7: number }[];
    source?: string;
    distanceMeters?: number;
    travelMode?: string;
    confidence?: number;
  };
}

export type ActivityType =
  | "WALKING"
  | "RUNNING"
  | "CYCLING"
  | "IN_VEHICLE"
  | "IN_CAR"
  | "IN_BUS"
  | "IN_TRAIN"
  | "IN_SUBWAY"
  | "IN_TRAM"
  | "IN_FERRY"
  | "FLYING"
  | "SKIING"
  | "SAILING"
  | "STILL"
  | "UNKNOWN_ACTIVITY_TYPE";

export interface TimelineObject {
  placeVisit?: PlaceVisit;
  activitySegment?: ActivitySegment;
}

export interface SemanticFile {
  timelineObjects: TimelineObject[];
}

// ─── Segments format (new Google Timeline export "Vos trajets") ───────────────

export interface SegmentLatLng {
  latLng: string; // e.g. "48.878411°, 2.18172°"
}

export interface SegmentVisit {
  hierarchyLevel?: number;
  probability?: number;
  topCandidate?: {
    placeId?: string;
    semanticType?: string;
    probability?: number;
    placeLocation?: SegmentLatLng;
  };
}

export interface SegmentActivity {
  start?: SegmentLatLng;
  end?: SegmentLatLng;
  distanceMeters?: number;
  topCandidate?: {
    type: string;
    probability?: number;
  };
}

export interface SegmentTimelinePoint {
  point: string; // e.g. "48.878411°, 2.18172°"
  time: string;
}

export interface SemanticSegment {
  startTime: string;
  endTime: string;
  startTimeTimezoneUtcOffsetMinutes?: number;
  endTimeTimezoneUtcOffsetMinutes?: number;
  visit?: SegmentVisit;
  activity?: SegmentActivity;
  timelinePath?: SegmentTimelinePoint[];
}

export interface SegmentsFile {
  semanticSegments: SemanticSegment[];
}

// ─── Normalised internal types ────────────────────────────────────────────────

export interface NormalisedVisit {
  type: "visit";
  startTime: Date;
  endTime: Date;
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  placeId?: string;
  confidence: number;
  durationMinutes: number;
}

export interface NormalisedActivity {
  type: "activity";
  startTime: Date;
  endTime: Date;
  activityType: ActivityType;
  distanceMeters?: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  confidence: string;
  durationMinutes: number;
}

export interface NormalisedLocation {
  type: "raw";
  time: Date;
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number;
  source?: string;
  detectedActivities?: { activity: string; confidence: number }[];
}

export type TimelineEntry = NormalisedVisit | NormalisedActivity | NormalisedLocation;

// ─── Tool input/output types ──────────────────────────────────────────────────

export interface DateRangeQuery {
  start: string; // ISO 8601
  end: string;
  types?: ("visit" | "activity" | "raw")[];
}

export interface PlacesQuery {
  start?: string;
  end?: string;
  minVisits?: number;
  minDurationMinutes?: number;
  nameContains?: string;
}

export interface ActivitiesQuery {
  start?: string;
  end?: string;
  activityTypes?: ActivityType[];
  minDistanceMeters?: number;
  maxDistanceMeters?: number;
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  radiusMeters: number;
  start?: string;
  end?: string;
  types?: ("visit" | "activity" | "raw")[];
}
