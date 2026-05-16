# google-timeline-mcp

`google-timeline-mcp` is a local MCP server for querying Google Timeline exports.

It is designed around the Google Timeline export file available on Android devices from:

`Settings > Location > Location Services > Timeline > Export Timeline Data`

The server reads that JSON export, normalizes it into a small internal model, and exposes the data through Model Context Protocol tools so an MCP-compatible client can ask questions such as:

- Which places did I visit most often?
- What activities happened during a date range?
- Which timeline entries are near a given coordinate?
- What raw points, visits, and trips exist between two timestamps?

The server runs entirely locally over stdio. It does not call Google APIs and does not require a database.

## Features

- Load Google Timeline export files produced from an Android device
- Query visits, movement activities, and raw location points
- Filter results by date range, entry type, distance, and activity type
- Summarize frequently visited places
- Search entries near a latitude/longitude point
- Use the data from any MCP-compatible client

## Supported Input Format

The primary supported format is the Google Timeline export JSON produced directly on Android from:

`Settings > Location > Location Services > Timeline > Export Timeline Data`

In practice, this is the newer Timeline segment format containing `semanticSegments`, with localized file names such as `Vos trajets.json`.

The codebase also contains parsers for older Google Timeline JSON structures, including:

- `Records.json` style raw location exports
- Semantic Location History JSON files containing `timelineObjects`

## How It Works

The server parses the supported Google Timeline export and normalizes it into three internal entry types:

- `visit`: place visits with start time, end time, coordinates, and optional place metadata
- `activity`: movement segments such as walking, cycling, driving, or transit
- `raw`: raw GPS points with timestamps and accuracy metadata

These normalized entries are then exposed through MCP tools.

## Available MCP Tools

### `load_data`

Loads a Google Timeline export file.

Input:

```json
{
  "path": "/absolute/path/to/export.json"
}
```

### `get_locations_by_date_range`

Returns visits, activities, and raw points within a time window.

Input:

```json
{
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-31T23:59:59Z",
  "types": ["visit", "activity", "raw"]
}
```

### `get_places_visited`

Returns places grouped and ranked by visit count.

Input:

```json
{
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-12-31T23:59:59Z",
  "minVisits": 2,
  "minDurationMinutes": 15,
  "nameContains": "Paris"
}
```

### `get_activities`

Returns activity entries and per-type statistics.

Input:

```json
{
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-31T23:59:59Z",
  "activityTypes": ["WALKING", "CYCLING", "IN_VEHICLE"],
  "minDistanceMeters": 100,
  "maxDistanceMeters": 10000
}
```

### `find_visits_near`

Finds timeline entries near a coordinate within a radius in meters.

Input:

```json
{
  "lat": 48.8566,
  "lng": 2.3522,
  "radiusMeters": 250,
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-12-31T23:59:59Z",
  "types": ["visit", "activity", "raw"]
}
```

## Installation

### Prerequisites

- Node.js 20 or newer is recommended
- npm

### Install From Source

```bash
git clone https://github.com/elpfries/google-timeline-mcp.git
cd google-timeline-mcp
npm install
npm run build
```

## License

Apache-2.0. See [LICENSE](LICENSE).

### Run Locally

```bash
npm start
```

Or directly:

```bash
node dist/index.js
```

## MCP Client Configuration

This server communicates over stdio, so it can be registered in any MCP-compatible client that supports launching a local command.

Example configuration:

```json
{
  "mcpServers": {
    "google-timeline": {
      "command": "node",
      "args": [
        "/absolute/path/to/google-timeline-mcp/dist/index.js"
      ]
    }
  }
}
```

After the server is registered:

1. Call `load_data` with the absolute path to your Android Timeline export file.
2. Use one of the query tools to inspect visits, activities, or nearby entries.

## Development

```bash
npm install
npm run build
npm run typecheck
npm run dev
```

Available scripts:

- `npm run build`: compile TypeScript to `dist/`
- `npm run typecheck`: run the TypeScript compiler without emitting files
- `npm run dev`: watch mode for TypeScript compilation
- `npm start`: run the compiled MCP server

## Project Structure

```text
src/
  index.ts         MCP server entry point
  store.ts         in-memory store and shared helpers
  types.ts         export and normalized data types
  parser/          format-specific parsers
  tools/           MCP query tool implementations
```

## Privacy Notes

Google Timeline exports contain sensitive personal location history.

- Keep your export files local
- Do not commit personal Timeline export data to Git
- Prefer absolute local file paths when using `load_data`

## Status

This is a lightweight local MCP server focused on exploring Google Timeline exports through a consistent query interface. It is a good fit for personal analysis, MCP experimentation, and building location-aware workflows on top of your exported data.