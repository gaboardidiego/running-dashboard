# Stride

A front-end-only dashboard for a Strava activity export. It shows all activity types, totals,
distance, moving time, activity counts or elevation gain over time, a type breakdown, and a searchable activity journal.
Type and year filters apply to the totals, charts and journal; text search filters the journal.
Distance is in kilometres, elevation in metres and time is moving time. Missing measurements
are excluded from totals and shown as a dash in the journal. The time chart groups all-time
data by year, or by calendar month when a year is selected. Its stacked bars show each activity
type; use the chart menu to switch between distance, moving time, activity count and elevation gain.

## Get started

Requires Node.js 22.12+ on the 22.x line, 24.x, or 26+, npm and
[uv](https://docs.astral.sh/uv/).

```sh
npm install
uv sync
uv run python scripts/import_activities.py export_14409380
npm run dev
```

Open the address printed by Vite. Build a static site with `npm run build`; `npm run preview`
serves the build locally. A static host must serve the generated `dist/` directory. No backend
or account is required.

## Updating data

Import another export directory (or its `activities.csv`) using the same command:

```sh
uv run python scripts/import_activities.py /path/to/new-export
```

The importer merges by Strava activity ID: existing records absent from the new export are
retained, matching records are updated, and new records are added. Running the same import
again is safe. Only the CSV is used, not individual activity files. The export's detailed
distance column is converted from metres for display; date and time are displayed as recorded
in the export, without timezone conversion. Use `--output path/to/file.json` to select another
dataset destination. The app expects the default `public/data/activities.json`.

The export and generated dataset are ignored by Git because they contain personal activity
information. They remain on your machine, but **anyone who can access a deployed site can
download its data**. Treat `dist/` as private too. No data is sent to a server by the app.

## Checks

```sh
npm run lint
npm run format:check
npm test
npm run build
uv run ruff check .
uv run ruff format --check .
uv run ty check
uv run pytest
```
