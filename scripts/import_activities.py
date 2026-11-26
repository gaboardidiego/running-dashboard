"""Merge a Strava activities CSV into the dashboard's local JSON dataset."""

import argparse
import csv
import json
import math
import sys
from datetime import datetime
from pathlib import Path
from typing import TypedDict


class Activity(TypedDict):
    id: str
    date: str
    name: str
    type: str
    description: str
    distance_m: float | None
    moving_time_s: float | None
    elapsed_time_s: float | None
    elevation_gain_m: float | None
    average_heart_rate: float | None


def number(value: str, field: str, row_number: int) -> float | None:
    if not value.strip():
        return None
    try:
        result = float(value)
    except ValueError as exc:
        raise ValueError(f"Row {row_number}: invalid {field}: {value!r}") from exc
    if not math.isfinite(result) or result < 0:
        raise ValueError(f"Row {row_number}: invalid {field}: {value!r}")
    return result


def read_export(path: Path) -> list[Activity]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.reader(stream)
        try:
            headers = next(reader)
        except StopIteration as exc:
            raise ValueError("The export CSV is empty") from exc

        required = [
            "Activity ID",
            "Activity Date",
            "Activity Name",
            "Activity Type",
            "Activity Description",
            "Distance",
            "Moving Time",
            "Elapsed Time",
            "Elevation Gain",
            "Average Heart Rate",
        ]
        missing = [field for field in required if field not in headers]
        if missing:
            raise ValueError(f"Missing columns: {', '.join(missing)}")
        # Strava repeats Distance: the first is kilometres, the last is metres.
        if headers.count("Distance") < 2:
            raise ValueError("Expected both summary and detailed Distance columns")
        indices = {field: len(headers) - 1 - headers[::-1].index(field) for field in required}
        activities: list[Activity] = []
        seen: set[str] = set()
        for row_number, row in enumerate(reader, 2):
            if len(row) != len(headers):
                raise ValueError(
                    f"Row {row_number}: expected {len(headers)} columns, got {len(row)}"
                )

            values = {field: row[index].strip() for field, index in indices.items()}

            activity_id = values["Activity ID"]
            if not activity_id or activity_id in seen:
                raise ValueError(
                    f"Row {row_number}: missing or duplicate Activity ID {activity_id!r}"
                )
            seen.add(activity_id)
            try:
                date = datetime.strptime(values["Activity Date"], "%b %d, %Y, %I:%M:%S %p")
            except ValueError as exc:
                raise ValueError(f"Row {row_number}: invalid Activity Date") from exc
            activity_type = values["Activity Type"]
            if not activity_type:
                raise ValueError(f"Row {row_number}: missing Activity Type")
            activities.append(
                {
                    "id": activity_id,
                    "date": date.isoformat(),
                    "name": values["Activity Name"],
                    "type": activity_type,
                    "description": values["Activity Description"],
                    "distance_m": number(values["Distance"], "Distance", row_number),
                    "moving_time_s": number(values["Moving Time"], "Moving Time", row_number),
                    "elapsed_time_s": number(values["Elapsed Time"], "Elapsed Time", row_number),
                    "elevation_gain_m": number(
                        values["Elevation Gain"], "Elevation Gain", row_number
                    ),
                    "average_heart_rate": number(
                        values["Average Heart Rate"], "Average Heart Rate", row_number
                    ),
                }
            )
    return activities


def merge_activities(existing: list[Activity], incoming: list[Activity]) -> list[Activity]:
    merged = {activity["id"]: activity for activity in existing}
    merged.update({activity["id"]: activity for activity in incoming})
    return sorted(
        merged.values(), key=lambda activity: (activity["date"], activity["id"]), reverse=True
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export", type=Path, help="Export directory or activities.csv")
    parser.add_argument(
        "--output", type=Path, default=Path("public/data/activities.json"), help="Output JSON file"
    )
    args = parser.parse_args()
    source = args.export / "activities.csv" if args.export.is_dir() else args.export
    try:
        incoming = read_export(source)
        existing: list[Activity] = []
        if args.output.exists():
            with args.output.open(encoding="utf-8") as stream:
                data = json.load(stream)
            if (
                not isinstance(data, dict)
                or data.get("version") != 1
                or not isinstance(data.get("activities"), list)
            ):
                raise ValueError("Unsupported or invalid existing dataset")
            existing = data["activities"]
        merged = merge_activities(existing, incoming)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # Replace only after parsing and serialization have succeeded.
        serialized = json.dumps({"version": 1, "activities": merged}, ensure_ascii=False) + "\n"
        temporary = args.output.with_suffix(args.output.suffix + ".tmp")
        temporary.write_text(serialized, encoding="utf-8")
        temporary.replace(args.output)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"Import failed: {exc}", file=sys.stderr)
        return 1
    print(f"Imported {len(incoming)} activities; dataset contains {len(merged)} activities.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
