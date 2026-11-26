import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  filterActivities,
  formatDistance,
  summarize,
  typeTotals,
  volumeTotals,
} from "./data.js";

const activities = [
  {
    id: "1",
    date: "2026-11-24T17:00:00",
    type: "Run",
    name: "Morning run",
    description: "By the lake",
    distance_m: 12000,
    moving_time_s: 3600,
    elevation_gain_m: 100,
  },
  {
    id: "2",
    date: "2025-12-01T10:00:00",
    type: "Ride",
    name: "Commute",
    description: "",
    distance_m: 20000,
    moving_time_s: null,
    elevation_gain_m: null,
  },
];

describe("activity data", () => {
  it("filters type and year, and searches names, descriptions and types case-insensitively", () => {
    expect(
      filterActivities(activities, {
        type: "Run",
        year: "2026",
        query: "LAKE",
      }),
    ).toEqual([activities[0]]);
    expect(filterActivities(activities, { query: "ride" })).toEqual([
      activities[1],
    ]);
    expect(
      filterActivities(activities, { type: "Ride", year: "2026" }),
    ).toEqual([]);
  });

  it("aggregates missing values without losing activities", () => {
    expect(summarize(activities)).toEqual({
      count: 2,
      distance: 32000,
      movingTime: 3600,
      elevation: 100,
    });
    expect(typeTotals(activities)).toEqual([
      ["Ride", 1],
      ["Run", 1],
    ]);
    expect(formatDistance(null)).toBe("—");
  });

  it("groups all years and activity types with distance, time, counts and elevation", () => {
    const mixed = [
      ...activities,
      {
        ...activities[0],
        type: "Ride",
        distance_m: 5000,
        moving_time_s: 1800,
        elevation_gain_m: 250,
      },
      {
        ...activities[0],
        distance_m: null,
        moving_time_s: null,
        elevation_gain_m: null,
      },
    ];
    const years = volumeTotals(mixed);
    expect(years.map((year) => year.key)).toEqual(["2025", "2026"]);
    expect(years[0].types.get("Ride")).toEqual({
      distance: 20,
      time: 0,
      count: 1,
      elevation: 0,
    });
    expect(years[1].types.get("Run")).toEqual({
      distance: 12,
      time: 1,
      count: 2,
      elevation: 100,
    });
    expect(years[1].types.get("Ride")).toEqual({
      distance: 5,
      time: 0.5,
      count: 1,
      elevation: 250,
    });
    expect(volumeTotals([])).toEqual([]);
  });

  it("groups a selected year into calendar months, including empty months", () => {
    const months = volumeTotals(activities, "2026");
    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ key: "2026-01", label: "Jan" });
    expect(months[0].types.size).toBe(0);
    expect(months[10].types.get("Run")).toEqual({
      distance: 12,
      time: 1,
      count: 1,
      elevation: 100,
    });
    expect(months[11].types.size).toBe(0);
    expect(volumeTotals([], "2026")).toEqual([]);
  });

  it("escapes activity text before inserting it in HTML", () => {
    expect(escapeHtml("<img src=\"x\" onerror='alert(1)'>")).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;",
    );
  });
});
