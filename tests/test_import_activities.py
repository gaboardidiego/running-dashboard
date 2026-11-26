import csv
import json

import pytest

from scripts.import_activities import main, merge_activities, read_export

HEADERS = [
    "Activity ID",
    "Activity Date",
    "Activity Name",
    "Activity Type",
    "Activity Description",
    "Distance",
    "Elapsed Time",
    "Moving Time",
    "Distance",
    "Elapsed Time",
    "Elevation Gain",
    "Average Heart Rate",
]


def write_export(path, rows):
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(HEADERS)
        writer.writerows(rows)


def row(activity_id="123", name="Morning run", distance="12345"):
    return [
        activity_id,
        "Nov 24, 2026, 5:21:57 PM",
        name,
        "Run",
        "A good day",
        "12.35",
        "3700",
        "3500",
        distance,
        "3700.0",
        "100",
        "",
    ]


def test_export_uses_detailed_distance_and_optional_values(tmp_path):
    source = tmp_path / "activities.csv"
    write_export(source, [row()])
    activity = read_export(source)[0]
    assert activity["distance_m"] == 12345
    assert activity["date"] == "2026-11-24T17:21:57"
    assert activity["average_heart_rate"] is None
    assert activity["relative_effort"] is None


def test_relative_effort_imports_values_and_preserves_missing_and_zero(tmp_path):
    source = tmp_path / "activities.csv"
    with source.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow([*HEADERS, "Relative Effort", "Relative Effort"])
        writer.writerows(
            [
                [*row("1"), "58", "58.0"],
                [*row("2"), "", ""],
                [*row("3"), "0", "0.0"],
            ]
        )
    assert [activity["relative_effort"] for activity in read_export(source)] == [58, None, 0]


def test_invalid_relative_effort_is_rejected(tmp_path):
    source = tmp_path / "activities.csv"
    with source.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow([*HEADERS, "Relative Effort"])
        writer.writerow([*row(), "-1"])
    with pytest.raises(ValueError, match="invalid Relative Effort"):
        read_export(source)


def test_merge_updates_matching_id_and_keeps_old_activities(tmp_path):
    source = tmp_path / "activities.csv"
    write_export(source, [row("1"), row("2")])
    existing = read_export(source)
    write_export(source, [row("1", name="Updated")])
    merged = merge_activities(existing, read_export(source))
    assert len(merged) == 2
    assert next(activity for activity in merged if activity["id"] == "1")["name"] == "Updated"
    assert merge_activities(merged, read_export(source)) == merged


def test_invalid_input_does_not_replace_existing_dataset(tmp_path, monkeypatch, capsys):
    source = tmp_path / "activities.csv"
    output = tmp_path / "data.json"
    write_export(source, [row()])
    monkeypatch.setattr("sys.argv", ["import_activities", str(source), "--output", str(output)])
    assert main() == 0
    original = json.loads(output.read_text())
    write_export(source, [row(distance="not-a-number")])
    assert main() == 1
    assert "invalid Distance" in capsys.readouterr().err
    assert json.loads(output.read_text()) == original


def test_duplicate_ids_are_rejected(tmp_path):
    source = tmp_path / "activities.csv"
    write_export(source, [row(), row()])
    with pytest.raises(ValueError, match="duplicate Activity ID"):
        read_export(source)
