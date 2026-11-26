import Chart from "chart.js/auto";
import {
  dailyTotals,
  escapeHtml,
  filterActivities,
  formatDistance,
  formatDuration,
  stravaActivityUrl,
  summarize,
  typeTotals,
  volumeTotals,
} from "./data.js";
import "./style.css";

const app = document.querySelector("#app");
const icon = (name, size = 20) => {
  const paths = {
    logo: '<path d="M4 17 10 5l3 6 2-4 5 10"/><path d="M7 17h12"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    mountain: '<path d="m2 19 6-10 3 4 3-7 8 13H2Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    route:
      '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h7a4 4 0 0 1 0 8H8a4 4 0 0 0 0 4h9"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Stride home"><span class="brand-mark">${icon("logo", 24)}</span><span>stride<span class="brand-dot">.</span></span></a>
      <div class="nav-label">YOUR TRAINING</div>
      <nav aria-label="Main navigation">
        <a class="nav-link active" href="#overview">${icon("grid", 19)} Overview</a>
        <a class="nav-link" href="#activities">${icon("activity", 19)} Activities</a>
      </nav>
    </aside>
    <main id="overview">
      <header class="topbar"><div class="breadcrumbs">YOUR TRAINING <span>/</span> <strong>OVERVIEW</strong></div><div class="topbar-right"><span class="status-dot"></span> PERSONAL DASHBOARD</div></header>
      <div class="content">
        <section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE BIG PICTURE</div><h1>Training overview<span class="heading-dot">.</span></h1><p>All the work you’ve put in, in one place.</p></div><div class="filters"><label><span class="sr-only">Activity type</span><select id="type-filter" disabled><option value="all">All activities</option></select></label><label><span class="sr-only">Year</span><select id="year-filter" disabled><option value="all">All time</option></select></label><label id="month-filter-label" hidden><span class="sr-only">Month</span><select id="month-filter"><option value="all">All months</option>${Array.from({ length: 12 }, (_, month) => `<option value="${String(month + 1).padStart(2, "0")}">${new Date(2020, month, 1).toLocaleDateString("en", { month: "long" })}</option>`).join("")}</select></label></div></section>
        <div id="error" class="error" role="alert" hidden></div>
        <div id="dashboard">
          <section class="stats" aria-label="Training totals">
            <article class="stat"><div class="stat-top"><span>TOTAL ACTIVITIES</span><span class="stat-icon">${icon("activity")}</span></div><div class="stat-value" id="stat-count">—</div><div class="stat-caption">Every session, accounted for</div></article>
            <article class="stat"><div class="stat-top"><span>TOTAL DISTANCE</span><span class="stat-icon">${icon("route")}</span></div><div class="stat-value" id="stat-distance">—</div><div class="stat-caption">Kilometres covered</div></article>
            <article class="stat"><div class="stat-top"><span>TIME MOVING</span><span class="stat-icon">${icon("clock")}</span></div><div class="stat-value" id="stat-time">—</div><div class="stat-caption">Time well spent</div></article>
            <article class="stat"><div class="stat-top"><span>ELEVATION GAIN</span><span class="stat-icon">${icon("mountain")}</span></div><div class="stat-value" id="stat-elevation">—</div><div class="stat-caption">Metres climbed</div></article>
          </section>
          <section class="charts">
            <article class="panel volume-panel"><div class="panel-heading"><div><div class="section-kicker">THE LONG GAME</div><h2 id="volume-title">Distance over time</h2><p id="volume-subtitle">Yearly totals by activity type</p></div><label class="volume-metric"><span class="sr-only">Chart metric</span><select id="volume-metric" disabled><option value="distance">Distance</option><option value="time">Moving time</option><option value="count">Activities</option><option value="elevation">Elevation gain</option><option value="effort">Relative Effort</option></select></label></div><div id="volume-legend" class="legend"></div><div class="chart-container"><canvas id="volume-chart" role="img" aria-label="Yearly distance by activity type"></canvas></div><div id="volume-empty" class="chart-empty" hidden>No activities for this selection.</div></article>
            <article class="panel mix-panel"><div class="panel-heading"><div><div class="section-kicker">MIX IT UP</div><h2>Activity breakdown</h2><p>All the ways you move</p></div><span class="panel-badge">${icon("activity", 16)}</span></div><div class="donut-wrap"><canvas id="type-chart" role="img" aria-label="Activity count by type"></canvas><div class="donut-center"><strong id="donut-count">0</strong><span>ACTIVITIES</span></div></div><div id="type-legend" class="type-legend"></div><div id="type-empty" class="chart-empty" hidden>No activities for this selection.</div></article>
          </section>
          <section class="panel daily-panel" aria-labelledby="daily-title">
            <div class="panel-heading"><div><div class="section-kicker">DAY BY DAY</div><h2 id="daily-title">Daily distance</h2><p>Daily totals and trailing 7- and 30-day averages. Drag across the chart to zoom.</p></div><label class="volume-metric"><span class="sr-only">Daily chart metric</span><select id="daily-metric" disabled><option value="distance">Distance</option><option value="time">Moving time</option><option value="count">Activities</option><option value="elevation">Elevation gain</option><option value="effort">Relative Effort</option></select></label></div>
            <div class="legend daily-legend"><span><i class="legend-square daily-key"></i>Daily total</span><span><i class="legend-line weekly-key"></i>7-day average / day</span><span><i class="legend-line monthly-key"></i>30-day average / day</span></div>
            <div class="daily-controls"><label>From <input id="daily-from" type="date" disabled></label><label>To <input id="daily-to" type="date" disabled></label><button id="daily-reset" type="button" disabled>Reset zoom</button><span id="daily-range-error" role="status"></span></div>
            <div class="chart-container daily-chart-container"><canvas id="daily-chart" role="img" aria-label="Daily distance with trailing 7-day and 30-day averages"></canvas></div><div id="daily-empty" class="chart-empty" hidden>No activities for this selection.</div>
          </section>
          <section id="activities" class="panel activities-panel"><div class="activities-heading"><div><div class="section-kicker">YOUR JOURNAL</div><h2>Recent activities <span id="activity-count" class="count-pill">0</span></h2><p>The sessions behind the numbers. Relative Effort is provided by Strava.</p></div><label class="search">${icon("search", 18)}<span class="sr-only">Search activities</span><input id="search" type="search" placeholder="Search activities..." /></label></div><div class="table-wrap"><table><thead><tr><th>ACTIVITY</th><th>DATE</th><th>DISTANCE</th><th>MOVING TIME</th><th>ELEVATION</th><th>RELATIVE EFFORT</th><th></th></tr></thead><tbody id="activity-rows"></tbody></table><div id="table-empty" class="table-empty" hidden>No activities found. Try a different search or filter.</div></div><div class="table-footer"><span id="table-status"></span><button id="show-more" class="more-button" type="button">Show more ${icon("chevron", 16)}</button></div></section>
          <footer class="footer"><span>MADE FOR THE LONG RUN <span class="footer-heart">♥</span></span><span>Built from your activity export</span></footer>
        </div>
      </div>
    </main>
  </div>`;

const $ = (selector) => document.querySelector(selector);
const colors = [
  "#b8e554",
  "#263e35",
  "#82a6a0",
  "#e6b889",
  "#c4c9a3",
  "#7b8b68",
  "#c78e75",
  "#a7b3bd",
];
const number = (value) => Math.round(value).toLocaleString("en");
const metrics = {
  distance: { title: "Distance", unit: "km" },
  time: { title: "Moving time", unit: "hrs" },
  count: { title: "Activities", unit: "activities" },
  elevation: { title: "Elevation gain", unit: "m" },
  effort: { title: "Relative Effort", unit: "points" },
};
let activities = [];
let volumeChart;
let typeChart;
let dailyChart;
let dailyDays = [];
let dailyRange = null;
let drag = null;
let visible = 8;

function updateDailyRange() {
  if (!dailyDays.length) return;
  const first = dailyDays[0].date;
  const last = dailyDays[dailyDays.length - 1].date;
  const [from, to] = dailyRange ?? [first, last];
  $("#daily-from").value = from;
  $("#daily-to").value = to;
  $("#daily-range-error").textContent = "";
  dailyChart.options.scales.x.min = dailyDays.findIndex(
    (day) => day.date === from,
  );
  dailyChart.options.scales.x.max = dailyDays.findIndex(
    (day) => day.date === to,
  );
  for (const dataset of dailyChart.data.datasets) {
    dataset.pointRadius =
      dailyChart.options.scales.x.max - dailyChart.options.scales.x.min <= 40
        ? 2
        : 0;
  }
  $("#daily-reset").disabled = !dailyRange;
  dailyChart.update("none");
}

function renderDaily(filtered) {
  const metric = $("#daily-metric").value;
  dailyDays = dailyTotals(filtered, metric);
  $("#daily-title").textContent =
    `Daily ${metrics[metric].title.toLowerCase()}`;
  $("#daily-chart").setAttribute(
    "aria-label",
    `Daily ${metrics[metric].title.toLowerCase()} with trailing 7-day and 30-day averages`,
  );
  $("#daily-empty").hidden =
    filtered.length > 0 &&
    (metric !== "effort" ||
      filtered.some((activity) => activity.relative_effort != null));
  $("#daily-empty").textContent = filtered.length
    ? "No Relative Effort data for this selection."
    : "No activities for this selection.";
  for (const selector of ["#daily-from", "#daily-to"]) {
    const input = $(selector);
    input.disabled = !dailyDays.length;
    input.min = dailyDays[0]?.date ?? "";
    input.max = dailyDays[dailyDays.length - 1]?.date ?? "";
    if (!dailyDays.length) input.value = "";
  }
  dailyChart.data.labels = dailyDays.map((day) => day.date);
  dailyChart.data.datasets = [
    {
      label: "Daily total",
      data: dailyDays.map((day) => day.value),
      borderColor: "#a7bd84",
      borderWidth: 1,
      pointRadius: 0,
    },
    {
      label: "7-day average / day",
      data: dailyDays.map((day) => day.week),
      borderColor: "#527a5a",
      borderWidth: 2,
      pointRadius: 0,
    },
    {
      label: "30-day average / day",
      data: dailyDays.map((day) => day.month),
      borderColor: "#cc8456",
      borderWidth: 2,
      pointRadius: 0,
    },
  ];
  dailyChart.options.scales.y.title.text = metrics[metric].unit;
  dailyChart.options.plugins.tooltip.callbacks.label = (context) =>
    `${context.dataset.label}: ${context.parsed.y.toLocaleString("en", { maximumFractionDigits: 2 })} ${metrics[metric].unit}`;
  if (dailyDays.length) {
    updateDailyRange();
  } else {
    dailyRange = null;
    $("#daily-reset").disabled = true;
    $("#daily-range-error").textContent = "";
    dailyChart.options.scales.x.min = undefined;
    dailyChart.options.scales.x.max = undefined;
    dailyChart.update("none");
  }
}

function renderTable(filtered) {
  const query = $("#search").value;
  const matches = filterActivities(filtered, { query });
  $("#activity-count").textContent = number(matches.length);
  $("#activity-rows").innerHTML = matches
    .slice(0, visible)
    .map((activity) => {
      const date = new Date(`${activity.date.slice(0, 10)}T00:00:00`);
      const formattedDate = date.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const elevation =
        activity.elevation_gain_m == null
          ? "—"
          : `${number(activity.elevation_gain_m)} m`;
      const effort =
        activity.relative_effort == null
          ? "—"
          : activity.relative_effort.toLocaleString("en", {
              maximumFractionDigits: 2,
            });
      const name = escapeHtml(activity.name || "Untitled activity");
      const url = stravaActivityUrl(activity.id);
      const activityName = url
        ? `<a class="activity-link" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="View ${name} on Strava (opens in a new tab)">${name}</a>`
        : `<span title="Strava link unavailable">${name}</span>`;
      return `<tr><td><div class="activity-cell"><span class="activity-icon">${icon("activity", 18)}</span><div><strong>${activityName}</strong><span>${escapeHtml(activity.type)}</span></div></div></td><td>${formattedDate}</td><td class="table-metric">${formatDistance(activity.distance_m)}</td><td>${formatDuration(activity.moving_time_s)}</td><td>${elevation}</td><td>${effort}</td><td class="row-arrow">${url ? icon("arrow", 15) : ""}</td></tr>`;
    })
    .join("");
  $("#table-empty").hidden = matches.length > 0;
  $("#table-status").textContent = matches.length
    ? `Showing ${Math.min(visible, matches.length)} of ${number(matches.length)} activities`
    : "0 activities";
  $("#show-more").hidden = visible >= matches.length;
}

function filteredActivities() {
  return filterActivities(activities, {
    type: $("#type-filter").value,
    year: $("#year-filter").value,
    month: $("#month-filter").value,
  });
}

function render() {
  const filtered = filteredActivities();
  const totals = summarize(filtered);
  $("#stat-count").textContent = number(totals.count);
  $("#stat-distance").innerHTML =
    `${number(totals.distance / 1000)} <small>km</small>`;
  $("#stat-time").innerHTML =
    `${number(totals.movingTime / 3600)} <small>hrs</small>`;
  $("#stat-elevation").innerHTML =
    `${number(totals.elevation)} <small>m</small>`;
  const year = $("#year-filter").value;
  const metric = $("#volume-metric").value;
  const periods = volumeTotals(filtered, year);
  const types = typeTotals(filtered);
  const allTypes = typeTotals(activities).map(([type]) => type);
  const colorForType = (type) => colors[allTypes.indexOf(type) % colors.length];
  const effortCount = filtered.filter(
    (activity) => activity.relative_effort != null,
  ).length;
  $("#volume-empty").hidden =
    filtered.length > 0 && (metric !== "effort" || effortCount > 0);
  $("#volume-empty").textContent = filtered.length
    ? "No Relative Effort data for this selection."
    : "No activities for this selection.";
  $("#type-empty").hidden = filtered.length > 0;
  $("#donut-count").textContent = number(totals.count);
  $("#type-legend").innerHTML = types
    .map(
      ([type, count]) =>
        `<div><span><i style="background:${colorForType(type)}"></i>${escapeHtml(type)}</span><strong>${number(count)} <small>${count / totals.count < 0.01 ? "&lt;1" : Math.round((count / totals.count) * 100)}%</small></strong></div>`,
    )
    .join("");
  const periodName = year === "all" ? "Yearly" : "Monthly";
  $("#volume-title").textContent = `${metrics[metric].title} over time`;
  $("#volume-subtitle").textContent =
    `${periodName} totals by activity type${year === "all" ? "" : ` · ${year}`}${metric === "effort" ? ` · ${number(effortCount)} of ${number(filtered.length)} activities have scores` : ""}`;
  $("#volume-chart").setAttribute(
    "aria-label",
    `${periodName} ${metrics[metric].title.toLowerCase()} by activity type${year === "all" ? "" : ` for ${year}`}`,
  );
  $("#volume-legend").innerHTML = types
    .map(
      ([type]) =>
        `<span><i class="legend-square" style="background:${colorForType(type)}"></i>${escapeHtml(type)}</span>`,
    )
    .join("");
  volumeChart.data.labels = periods.map((period) => period.label);
  volumeChart.data.datasets = types.map(([type]) => ({
    label: type,
    data: periods.map(
      (period) =>
        period.types.get(type)?.[metric] ?? (metric === "effort" ? null : 0),
    ),
    backgroundColor: colorForType(type),
    borderRadius: 4,
    maxBarThickness: 26,
  }));
  volumeChart.options.scales.y.title.text = metrics[metric].unit;
  volumeChart.options.scales.y.ticks.precision =
    metric === "count" ? 0 : undefined;
  volumeChart.options.plugins.tooltip.callbacks.label = (context) => {
    const value = `${context.dataset.label}: ${context.parsed.y.toLocaleString("en", { maximumFractionDigits: 2 })} ${metrics[metric].unit}`;
    if (metric !== "effort") return value;
    const total = periods[context.dataIndex].types.get(context.dataset.label);
    return `${value} (${number(total.effortCount)} of ${number(total.count)} activities)`;
  };
  volumeChart.update();
  typeChart.data.labels = types.map(([type]) => type);
  typeChart.data.datasets[0].data = types.map(([, count]) => count);
  typeChart.data.datasets[0].backgroundColor = types.map(([type]) =>
    colorForType(type),
  );
  typeChart.update();
  renderDaily(filtered);
  renderTable(filtered);
}

function initCharts() {
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = "#929b91";
  volumeChart = new Chart($("#volume-chart"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          border: { display: false },
          ticks: { maxRotation: 0 },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: { display: true, text: "km" },
          border: { display: false, dash: [4, 4] },
          grid: { color: "#edf0e9" },
          ticks: { maxTicksLimit: 5 },
        },
      },
    },
  });
  typeChart = new Chart($("#type-chart"), {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [
        { data: [], backgroundColor: [], borderWidth: 0, hoverOffset: 4 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      cutout: "78%",
      plugins: { legend: { display: false } },
    },
  });
  dailyChart = new Chart($("#daily-chart"), {
    type: "line",
    data: { labels: [], datasets: [] },
    plugins: [
      {
        id: "selection",
        afterDraw(chart) {
          if (!drag) return;
          const { ctx, chartArea } = chart;
          ctx.save();
          ctx.fillStyle = "rgba(82, 122, 90, 0.18)";
          ctx.fillRect(
            Math.min(drag.start, drag.end),
            chartArea.top,
            Math.abs(drag.end - drag.start),
            chartArea.bottom - chartArea.top,
          );
          ctx.restore();
        },
      },
    ],
    options: {
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { maxRotation: 0, maxTicksLimit: 8 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "km" },
          border: { display: false, dash: [4, 4] },
          grid: { color: "#edf0e9" },
          ticks: { maxTicksLimit: 5 },
        },
      },
    },
  });
}

async function start() {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/activities.json`,
    );
    if (!response.ok)
      throw new Error(
        `Could not load activity data (HTTP ${response.status}).`,
      );
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.activities))
      throw new Error("Unsupported activity dataset.");
    activities = data.activities;
    for (const type of [
      ...new Set(activities.map((activity) => activity.type)),
    ].sort()) {
      $("#type-filter").add(new Option(type, type));
    }
    for (const year of [
      ...new Set(activities.map((activity) => activity.date.slice(0, 4))),
    ]
      .sort()
      .reverse()) {
      $("#year-filter").add(new Option(year, year));
    }
    initCharts();
    render();
    $("#type-filter").disabled = false;
    $("#year-filter").disabled = false;
    $("#volume-metric").disabled = false;
    $("#daily-metric").disabled = false;
  } catch (error) {
    $("#dashboard").hidden = true;
    $("#error").hidden = false;
    $("#error").textContent =
      `${error.message} Run the import script described in the README and reload.`;
    console.error(error);
  }
}

for (const selector of ["#type-filter", "#year-filter", "#month-filter"]) {
  $(selector).addEventListener("change", () => {
    if (selector === "#year-filter") {
      const allTime = $("#year-filter").value === "all";
      $("#month-filter-label").hidden = allTime;
      if (allTime) $("#month-filter").value = "all";
    }
    visible = 8;
    dailyRange = null;
    render();
  });
}
$("#volume-metric").addEventListener("change", render);
$("#daily-metric").addEventListener("change", render);
for (const selector of ["#daily-from", "#daily-to"]) {
  $(selector).addEventListener("change", () => {
    const from = $("#daily-from").value;
    const to = $("#daily-to").value;
    if (
      !from ||
      !to ||
      from > to ||
      from < dailyDays[0].date ||
      to > dailyDays[dailyDays.length - 1].date
    ) {
      $("#daily-range-error").textContent =
        "Choose a valid date range within the available data.";
      return;
    }
    dailyRange = [from, to];
    updateDailyRange();
  });
}
$("#daily-reset").addEventListener("click", () => {
  dailyRange = null;
  updateDailyRange();
});
const dailyCanvas = $("#daily-chart");
function chartX(event) {
  const bounds = dailyCanvas.getBoundingClientRect();
  return (event.clientX - bounds.left) * (dailyChart.width / bounds.width);
}
dailyCanvas.addEventListener("pointerdown", (event) => {
  if (!dailyDays.length || event.button !== 0) return;
  const x = chartX(event);
  const { left, right, top, bottom } = dailyChart.chartArea;
  const bounds = dailyCanvas.getBoundingClientRect();
  const y = (event.clientY - bounds.top) * (dailyChart.height / bounds.height);
  if (x < left || x > right || y < top || y > bottom) return;
  drag = { start: x, end: x };
  dailyCanvas.setPointerCapture(event.pointerId);
});
dailyCanvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  drag.end = Math.max(
    dailyChart.chartArea.left,
    Math.min(dailyChart.chartArea.right, chartX(event)),
  );
  dailyChart.draw();
});
dailyCanvas.addEventListener("pointerup", () => {
  if (!drag) return;
  if (Math.abs(drag.end - drag.start) >= 5) {
    const scale = dailyChart.scales.x;
    const first = Math.max(
      0,
      Math.min(
        dailyDays.length - 1,
        Math.round(scale.getValueForPixel(Math.min(drag.start, drag.end))),
      ),
    );
    const last = Math.max(
      0,
      Math.min(
        dailyDays.length - 1,
        Math.round(scale.getValueForPixel(Math.max(drag.start, drag.end))),
      ),
    );
    dailyRange = [dailyDays[first].date, dailyDays[last].date];
    drag = null;
    updateDailyRange();
  } else {
    drag = null;
    dailyChart.draw();
  }
});
dailyCanvas.addEventListener("pointercancel", () => {
  drag = null;
  dailyChart.draw();
});
$("#search").addEventListener("input", () => {
  visible = 8;
  renderTable(filteredActivities());
});
$("#show-more").addEventListener("click", () => {
  visible += 8;
  renderTable(filteredActivities());
});
start();
