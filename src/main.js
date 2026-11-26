import Chart from "chart.js/auto";
import {
  escapeHtml,
  filterActivities,
  formatDistance,
  formatDuration,
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
      <div class="sidebar-bottom">
        <div class="side-card"><div class="side-card-icon">${icon("route", 20)}</div><strong>Every effort counts.</strong><p>A little progress adds up to a lot of miles.</p></div>
        <div class="sidebar-footer"><span class="status-dot"></span> Your data, your dashboard</div>
      </div>
    </aside>
    <main id="overview">
      <header class="topbar"><div class="breadcrumbs">YOUR TRAINING <span>/</span> <strong>OVERVIEW</strong></div><div class="topbar-right"><span class="status-dot"></span> PERSONAL DASHBOARD</div></header>
      <div class="content">
        <section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE BIG PICTURE</div><h1>Training overview<span class="heading-dot">.</span></h1><p>All the work you’ve put in, in one place.</p></div><div class="filters"><label><span class="sr-only">Activity type</span><select id="type-filter" disabled><option value="all">All activities</option></select></label><label><span class="sr-only">Year</span><select id="year-filter" disabled><option value="all">All time</option></select></label></div></section>
        <div id="error" class="error" role="alert" hidden></div>
        <div id="dashboard">
          <section class="stats" aria-label="Training totals">
            <article class="stat"><div class="stat-top"><span>TOTAL ACTIVITIES</span><span class="stat-icon">${icon("activity")}</span></div><div class="stat-value" id="stat-count">—</div><div class="stat-caption">Every session, accounted for</div></article>
            <article class="stat"><div class="stat-top"><span>TOTAL DISTANCE</span><span class="stat-icon">${icon("route")}</span></div><div class="stat-value" id="stat-distance">—</div><div class="stat-caption">Kilometres covered</div></article>
            <article class="stat"><div class="stat-top"><span>TIME MOVING</span><span class="stat-icon">${icon("clock")}</span></div><div class="stat-value" id="stat-time">—</div><div class="stat-caption">Time well spent</div></article>
            <article class="stat"><div class="stat-top"><span>ELEVATION GAIN</span><span class="stat-icon">${icon("mountain")}</span></div><div class="stat-value" id="stat-elevation">—</div><div class="stat-caption">Metres climbed</div></article>
          </section>
          <section class="charts">
            <article class="panel volume-panel"><div class="panel-heading"><div><div class="section-kicker">THE LONG GAME</div><h2 id="volume-title">Distance over time</h2><p id="volume-subtitle">Yearly totals by activity type</p></div><label class="volume-metric"><span class="sr-only">Chart metric</span><select id="volume-metric" disabled><option value="distance">Distance</option><option value="time">Moving time</option><option value="count">Activities</option><option value="elevation">Elevation gain</option></select></label></div><div id="volume-legend" class="legend"></div><div class="chart-container"><canvas id="volume-chart" role="img" aria-label="Yearly distance by activity type"></canvas></div><div id="volume-empty" class="chart-empty" hidden>No activities for this selection.</div></article>
            <article class="panel mix-panel"><div class="panel-heading"><div><div class="section-kicker">MIX IT UP</div><h2>Activity breakdown</h2><p>All the ways you move</p></div><span class="panel-badge">${icon("activity", 16)}</span></div><div class="donut-wrap"><canvas id="type-chart" role="img" aria-label="Activity count by type"></canvas><div class="donut-center"><strong id="donut-count">0</strong><span>ACTIVITIES</span></div></div><div id="type-legend" class="type-legend"></div><div id="type-empty" class="chart-empty" hidden>No activities for this selection.</div></article>
          </section>
          <section id="activities" class="panel activities-panel"><div class="activities-heading"><div><div class="section-kicker">YOUR JOURNAL</div><h2>Recent activities <span id="activity-count" class="count-pill">0</span></h2><p>The sessions behind the numbers.</p></div><label class="search">${icon("search", 18)}<span class="sr-only">Search activities</span><input id="search" type="search" placeholder="Search activities..." /></label></div><div class="table-wrap"><table><thead><tr><th>ACTIVITY</th><th>DATE</th><th>DISTANCE</th><th>MOVING TIME</th><th>ELEVATION</th><th></th></tr></thead><tbody id="activity-rows"></tbody></table><div id="table-empty" class="table-empty" hidden>No activities found. Try a different search or filter.</div></div><div class="table-footer"><span id="table-status"></span><button id="show-more" class="more-button" type="button">Show more ${icon("chevron", 16)}</button></div></section>
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
};
let activities = [];
let volumeChart;
let typeChart;
let visible = 8;

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
      return `<tr><td><div class="activity-cell"><span class="activity-icon">${icon("activity", 18)}</span><div><strong>${escapeHtml(activity.name || "Untitled activity")}</strong><span>${escapeHtml(activity.type)}</span></div></div></td><td>${formattedDate}</td><td class="table-metric">${formatDistance(activity.distance_m)}</td><td>${formatDuration(activity.moving_time_s)}</td><td>${elevation}</td><td class="row-arrow">${icon("arrow", 15)}</td></tr>`;
    })
    .join("");
  $("#table-empty").hidden = matches.length > 0;
  $("#table-status").textContent = matches.length
    ? `Showing ${Math.min(visible, matches.length)} of ${number(matches.length)} activities`
    : "0 activities";
  $("#show-more").hidden = visible >= matches.length;
}

function render() {
  const filtered = filterActivities(activities, {
    type: $("#type-filter").value,
    year: $("#year-filter").value,
  });
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
  $("#volume-empty").hidden = filtered.length > 0;
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
    `${periodName} totals by activity type${year === "all" ? "" : ` · ${year}`}`;
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
    data: periods.map((period) => period.types.get(type)?.[metric] ?? 0),
    backgroundColor: colorForType(type),
    borderRadius: 4,
    maxBarThickness: 26,
  }));
  volumeChart.options.scales.y.title.text = metrics[metric].unit;
  volumeChart.options.scales.y.ticks.precision =
    metric === "count" ? 0 : undefined;
  volumeChart.options.plugins.tooltip.callbacks.label = (context) =>
    `${context.dataset.label}: ${context.parsed.y.toLocaleString("en", { maximumFractionDigits: 2 })} ${metrics[metric].unit}`;
  volumeChart.update();
  typeChart.data.labels = types.map(([type]) => type);
  typeChart.data.datasets[0].data = types.map(([, count]) => count);
  typeChart.data.datasets[0].backgroundColor = types.map(([type]) =>
    colorForType(type),
  );
  typeChart.update();
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
  } catch (error) {
    $("#dashboard").hidden = true;
    $("#error").hidden = false;
    $("#error").textContent =
      `${error.message} Run the import script described in the README and reload.`;
    console.error(error);
  }
}

for (const selector of ["#type-filter", "#year-filter"]) {
  $(selector).addEventListener("change", () => {
    visible = 8;
    render();
  });
}
$("#volume-metric").addEventListener("change", render);
$("#search").addEventListener("input", () => {
  visible = 8;
  renderTable(
    filterActivities(activities, {
      type: $("#type-filter").value,
      year: $("#year-filter").value,
    }),
  );
});
$("#show-more").addEventListener("click", () => {
  visible += 8;
  renderTable(
    filterActivities(activities, {
      type: $("#type-filter").value,
      year: $("#year-filter").value,
    }),
  );
});
start();
