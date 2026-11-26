import { describe, expect, it } from "vitest";
import {
  dailyTotals,
  escapeHtml,
  filterActivities,
  formatDistance,
  stravaActivityUrl,
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
  it("builds Strava links only for numeric activity IDs", () => {
    expect(stravaActivityUrl("21112297418")).toBe(
      "https://www.strava.com/activities/21112297418",
    );
    expect(stravaActivityUrl("")).toBeNull();
    expect(stravaActivityUrl(undefined)).toBeNull();
    expect(stravaActivityUrl('123" onclick="alert(1)')).toBeNull();
  });

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

  it("filters by month within a selected year and combines with other filters", () => {
    const data = [
      ...activities,
      { ...activities[0], date: "2026-12-01T10:00:00" },
      { ...activities[0], date: "2025-11-01T10:00:00" },
    ];
    expect(
      filterActivities(data, {
        year: "2026",
        month: "11",
        type: "Run",
        query: "lake",
      }),
    ).toEqual([activities[0]]);
    expect(filterActivities(data, { year: "2026", month: "01" })).toEqual([]);
    expect(filterActivities(data, { year: "2026", month: "all" })).toEqual([
      data[0],
      data[2],
    ]);
    expect(filterActivities(data, { month: "11" })).toEqual(data);
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
    expect(years[0].types.get("Ride")).toMatchObject({
      distance: 20,
      time: 0,
      count: 1,
      elevation: 0,
    });
    expect(years[1].types.get("Run")).toMatchObject({
      distance: 12,
      time: 1,
      count: 2,
      elevation: 100,
    });
    expect(years[1].types.get("Ride")).toMatchObject({
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
    expect(months[10].types.get("Run")).toMatchObject({
      distance: 12,
      time: 1,
      count: 1,
      elevation: 100,
    });
    expect(months[11].types.size).toBe(0);
    expect(volumeTotals([], "2026")).toEqual([]);
  });

  it("sums relative effort by period and type while distinguishing missing scores from zero", () => {
    const mixed = [
      { ...activities[0], relative_effort: 12 },
      { ...activities[0], relative_effort: 0 },
      { ...activities[0], relative_effort: null },
      { ...activities[0], type: "Ride", relative_effort: 5 },
      { ...activities[0], date: "2026-10-01", relative_effort: null },
      { ...activities[1], relative_effort: 9 },
    ];
    const years = volumeTotals(mixed);
    expect(years[0].types.get("Ride")).toMatchObject({
      effort: 9,
      effortCount: 1,
    });
    expect(years[1].types.get("Run")).toMatchObject({
      effort: 12,
      effortCount: 2,
      count: 4,
    });
    expect(years[1].types.get("Ride")).toMatchObject({
      effort: 5,
      effortCount: 1,
    });
    const months = volumeTotals(mixed, "2026");
    expect(months[9].types.get("Run")).toMatchObject({
      effort: null,
      effortCount: 0,
    });
    expect(months[10].types.get("Run")).toMatchObject({
      effort: 12,
      effortCount: 2,
    });
    expect(
      volumeTotals([{ ...activities[0], relative_effort: 0 }])[0].types.get(
        "Run",
      ),
    ).toMatchObject({ effort: 0, effortCount: 1 });
  });

  it("calculates trailing averages over 7 and 30 days, including rest days and partial windows", () => {
    const data = [
      { ...activities[0], date: "2024-01-30", distance_m: 4000 },
      { ...activities[0], date: "2024-01-30", distance_m: 2000 },
      { ...activities[0], date: "2024-02-01", distance_m: 3000 },
      { ...activities[0], date: "2024-02-05", distance_m: 7000 },
      { ...activities[0], date: "2024-03-01", distance_m: 30000 },
    ];
    const days = dailyTotals(data, "distance");
    expect(days).toHaveLength(32);
    expect(days[0]).toMatchObject({
      date: "2024-01-30",
      value: 6,
      week: 6,
      month: 6,
    });
    expect(days[1]).toMatchObject({
      date: "2024-01-31",
      value: 0,
      week: 3,
      month: 3,
    });
    expect(days[2]).toMatchObject({
      date: "2024-02-01",
      value: 3,
      week: 3,
      month: 3,
    });
    expect(days[6]).toMatchObject({
      date: "2024-02-05",
      value: 7,
      week: 16 / 7,
      month: 16 / 7,
    });
    expect(days[7]).toMatchObject({ week: 10 / 7, month: 2 });
    expect(days[30]).toMatchObject({
      date: "2024-02-29",
      week: 0,
      month: 10 / 30,
    });
    expect(days[31]).toMatchObject({
      date: "2024-03-01",
      week: 30 / 7,
      month: 40 / 30,
    });
    expect(dailyTotals([], "distance")).toEqual([]);
    expect(dailyTotals(data, "count")[0].value).toBe(2);
  });

  it("excludes unscored activity days from effort averages but keeps zero scores and rest days", () => {
    const data = [
      { ...activities[0], date: "2024-01-01", relative_effort: 8 },
      { ...activities[0], date: "2024-01-01", relative_effort: null },
      { ...activities[0], date: "2024-01-02", relative_effort: null },
      { ...activities[0], date: "2024-01-04", relative_effort: 0 },
    ];
    expect(dailyTotals(data, "effort")).toEqual([
      { date: "2024-01-01", value: 8, week: 8, month: 8 },
      { date: "2024-01-02", value: null, week: 8, month: 8 },
      { date: "2024-01-03", value: 0, week: 4, month: 4 },
      { date: "2024-01-04", value: 0, week: 8 / 3, month: 8 / 3 },
    ]);
    const unscored = Array.from({ length: 8 }, (_, index) => ({
      ...activities[0],
      date: `2024-01-${String(index + 1).padStart(2, "0")}`,
      relative_effort: index === 0 ? 8 : null,
    }));
    expect(dailyTotals(unscored, "effort")[7]).toMatchObject({
      week: null,
      month: 8,
    });
  });

  it("escapes activity text before inserting it in HTML", () => {
    expect(escapeHtml("<img src=\"x\" onerror='alert(1)'>")).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;",
    );
  });
});
