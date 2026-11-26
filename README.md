# Stride

A front-end-only dashboard for a Strava activity export. It shows all activity types, totals,
distance, moving time, activity counts or elevation gain over time, a type breakdown, and a searchable activity journal.
Type, year and (when a year is selected) month filters apply to the totals, charts and journal;
text search filters the journal.
Distance is in kilometres, elevation in metres and time is moving time. Missing measurements
are excluded from totals and shown as a dash in the journal. The time chart groups all-time
data by year, or by calendar month when a year is selected. Its stacked bars show each activity
type; use the chart menu to switch between distance, moving time, activity count, elevation gain
and Relative Effort. Relative Effort totals include only activities with scores, and the chart
shows how many activities have scores.
The daily chart shows daily totals for the same metrics, plus trailing 7-day and 30-day averages
per day, including the current day. Rest days count as zero. At the start of the filtered
date range, averages use the days available so far; zooming does not recalculate them.
For Relative Effort, days with activities but no scores are excluded from averages, while
days with some scores use the available scores. Drag across the chart or use the date fields
to zoom, and reset to see the full filtered range.
The activity journal links activity names to Strava in a new tab and shows Strava's Relative
Effort when present; missing scores appear as a dash. Viewing an activity on Strava depends on
its privacy settings and your access to it.

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
again is safe. Reimport an export to add Relative Effort to previously imported activities.
Only the CSV is used, not individual activity files. The export's detailed
distance column is converted from metres for display; date and time are displayed as recorded
in the export, without timezone conversion. Use `--output path/to/file.json` to select another
dataset destination. The app expects the default `public/data/activities.json`.

The export and generated dataset are ignored by Git because they contain personal activity
information. They remain on your machine, but **anyone who can access a deployed site can
download its data**. Treat `dist/` as private too. No data is sent to a server by the app.

## GitHub Pages

Push changes to `main` to build and deploy the site automatically using GitHub Actions. You can
also run the workflow manually from the Actions tab. In the repository's **Settings → Pages**,
set the build and deployment source to **GitHub Actions**. The project site is available at
`https://<owner>.github.io/<repository>/` after the workflow succeeds. GitHub Pages availability
for private repositories depends on your GitHub plan.

The workflow deploys an empty dashboard unless `public/data/activities.json` is committed.
To publish your activity data, first consider that **the entire dataset may be publicly
downloadable**, even if the repository is private. If you choose to publish it, import your data
locally and explicitly add the ignored dataset:

```sh
git add -f public/data/activities.json
git commit -m "Add activity data"
git push origin main
```

Once tracked, subsequent imports can be committed and pushed normally. Do not commit the
original export directory. Removing data from a later deployment does not guarantee that earlier
copies are no longer available.

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
