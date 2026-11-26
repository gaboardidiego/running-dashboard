export function filterActivities(
  activities,
  { type = "all", year = "all", query = "" } = {},
) {
  const search = query.trim().toLocaleLowerCase();
  return activities.filter(
    (activity) =>
      (type === "all" || activity.type === type) &&
      (year === "all" || activity.date.slice(0, 4) === year) &&
      (!search ||
        `${activity.name} ${activity.description} ${activity.type}`
          .toLocaleLowerCase()
          .includes(search)),
  );
}

export function summarize(activities) {
  return activities.reduce(
    (total, activity) => ({
      count: total.count + 1,
      distance: total.distance + (activity.distance_m ?? 0),
      movingTime: total.movingTime + (activity.moving_time_s ?? 0),
      elevation: total.elevation + (activity.elevation_gain_m ?? 0),
    }),
    { count: 0, distance: 0, movingTime: 0, elevation: 0 },
  );
}

export function volumeTotals(activities, year = "all") {
  const periods = new Map();
  if (year !== "all" && activities.length) {
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const date = new Date(Number(year), month - 1, 1);
      periods.set(key, {
        key,
        label: date.toLocaleDateString("en", { month: "short" }),
        types: new Map(),
      });
    }
  }
  for (const activity of activities) {
    const key = activity.date.slice(0, year === "all" ? 4 : 7);
    if (year !== "all" && !periods.has(key)) continue;
    if (!periods.has(key))
      periods.set(key, { key, label: key, types: new Map() });
    const types = periods.get(key).types;
    const total = types.get(activity.type) ?? {
      distance: 0,
      time: 0,
      count: 0,
      elevation: 0,
    };
    total.distance += (activity.distance_m ?? 0) / 1000;
    total.time += (activity.moving_time_s ?? 0) / 3600;
    total.count += 1;
    total.elevation += activity.elevation_gain_m ?? 0;
    types.set(activity.type, total);
  }
  return [...periods.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function typeTotals(activities) {
  const counts = new Map();
  for (const activity of activities) {
    counts.set(activity.type, (counts.get(activity.type) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

export function formatDistance(metres) {
  return metres == null
    ? "—"
    : `${(metres / 1000).toLocaleString("en", { maximumFractionDigits: 1 })} km`;
}

export function formatDuration(seconds) {
  if (seconds == null) return "—";
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours
    ? `${hours}h ${String(minutes % 60).padStart(2, "0")}m`
    : `${minutes}m`;
}
