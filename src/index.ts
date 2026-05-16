#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadData, isLoaded } from "./store.js";
import { getLocationsByDateRange } from "./tools/date-range.js";
import { getPlacesVisited } from "./tools/places.js";
import { getActivitiesSummary } from "./tools/activities.js";
import { findVisitsNear } from "./tools/nearby.js";
import type {
  DateRangeQuery,
  PlacesQuery,
  ActivitiesQuery,
  NearbyQuery,
  ActivityType,
} from "./types.js";

const server = new Server(
  { name: "google-timeline-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "load_data",
      description:
        "Load a Google Timeline export JSON file. Must be called before any query tool. Designed for the Android Timeline export available from Settings > Location > Location Services > Timeline > Export Timeline Data. Also accepts older Records.json and Semantic Location History JSON structures.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absolute path to the exported JSON file",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "get_locations_by_date_range",
      description:
        "Return all timeline entries (visits, activities, raw GPS points) within a date range.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "string", description: "ISO 8601 start datetime (e.g. 2024-01-01T00:00:00Z)" },
          end: { type: "string", description: "ISO 8601 end datetime" },
          types: {
            type: "array",
            items: { type: "string", enum: ["visit", "activity", "raw"] },
            description: "Filter to specific entry types (default: all)",
          },
        },
        required: ["start", "end"],
      },
    },
    {
      name: "get_places_visited",
      description:
        "Return a summary of places visited, grouped and ranked by visit count. Requires visit data in the loaded export.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "string", description: "ISO 8601 start datetime (optional)" },
          end: { type: "string", description: "ISO 8601 end datetime (optional)" },
          minVisits: { type: "number", description: "Minimum number of visits to include a place" },
          minDurationMinutes: { type: "number", description: "Minimum visit duration in minutes" },
          nameContains: { type: "string", description: "Filter places by name substring (case-insensitive)" },
        },
        required: [],
      },
    },
    {
      name: "get_activities",
      description:
        "Return transport and movement activities (walking, driving, cycling, etc.) with per-type statistics.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "string", description: "ISO 8601 start datetime (optional)" },
          end: { type: "string", description: "ISO 8601 end datetime (optional)" },
          activityTypes: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "WALKING", "RUNNING", "CYCLING", "IN_VEHICLE", "IN_CAR",
                "IN_BUS", "IN_TRAIN", "IN_SUBWAY", "IN_TRAM", "IN_FERRY",
                "FLYING", "SKIING", "SAILING", "STILL", "UNKNOWN_ACTIVITY_TYPE",
              ],
            },
            description: "Filter to specific activity types",
          },
          minDistanceMeters: { type: "number", description: "Minimum distance in metres" },
          maxDistanceMeters: { type: "number", description: "Maximum distance in metres" },
        },
        required: [],
      },
    },
    {
      name: "find_visits_near",
      description:
        "Find all timeline entries within a given radius (metres) of a GPS coordinate.",
      inputSchema: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude of the centre point" },
          lng: { type: "number", description: "Longitude of the centre point" },
          radiusMeters: { type: "number", description: "Search radius in metres" },
          start: { type: "string", description: "ISO 8601 start datetime (optional)" },
          end: { type: "string", description: "ISO 8601 end datetime (optional)" },
          types: {
            type: "array",
            items: { type: "string", enum: ["visit", "activity", "raw"] },
            description: "Filter to specific entry types (default: all)",
          },
        },
        required: ["lat", "lng", "radiusMeters"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "load_data": {
        const { path } = args as { path: string };
        result = loadData(path);
        break;
      }
      case "get_locations_by_date_range": {
        if (!isLoaded()) throw new Error("No data loaded. Call load_data first.");
        result = getLocationsByDateRange(args as unknown as DateRangeQuery);
        break;
      }
      case "get_places_visited": {
        if (!isLoaded()) throw new Error("No data loaded. Call load_data first.");
        result = getPlacesVisited(args as unknown as PlacesQuery);
        break;
      }
      case "get_activities": {
        if (!isLoaded()) throw new Error("No data loaded. Call load_data first.");
        result = getActivitiesSummary(args as unknown as ActivitiesQuery);
        break;
      }
      case "find_visits_near": {
        if (!isLoaded()) throw new Error("No data loaded. Call load_data first.");
        result = findVisitsNear(args as unknown as NearbyQuery);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is reserved for MCP JSON-RPC
  process.stderr.write("google-timeline-mcp running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
