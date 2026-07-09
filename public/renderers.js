import { hideCitations, toggleCitations } from "./meta.js";

let activeChart = null;

function destroyChart() {
  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }
}

function getChartColors(count) {
  const palette = [
    "#2563eb",
    "#dc2626",
    "#16a34a",
    "#ca8a04",
    "#9333ea",
    "#0891b2",
    "#ea580c",
    "#4f46e5",
  ];
  return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

function onChartClick(event, elements, dataPoints, citationsPanel, citationsList, labelFn, keyFn) {
  if (elements.length === 0) {
    hideCitations(citationsPanel, citationsList);
    return;
  }
  const index = elements[0].index;
  const datasetIndex = elements[0].datasetIndex ?? 0;
  const point = dataPoints[datasetIndex]?.[index] ?? dataPoints[index];
  if (!point) return;
  const label = labelFn(point, datasetIndex);
  const key = keyFn(point, datasetIndex);
  toggleCitations(
    citationsPanel,
    citationsList,
    point.citations,
    `Citations — ${label}`,
    key,
  );
}

function renderBarChart(canvas, visualization, citationsPanel, citationsList) {
  const { data } = visualization;
  const labels = data.map((d) => d.phase);
  const counts = data.map((d) => d.trial_count);

  activeChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Trial count",
          data: counts,
          backgroundColor: "#2563eb",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      onClick: (event, elements) =>
        onChartClick(
          event,
          elements,
          [data],
          citationsPanel,
          citationsList,
          (p) => p.phase,
          (p) => `phase:${p.phase}`,
        ),
    },
  });
}

function renderGroupedBarChart(canvas, visualization, citationsPanel, citationsList) {
  const { data } = visualization;
  const phases = [...new Set(data.map((d) => d.phase))];
  const seriesNames = [...new Set(data.map((d) => d.series))];
  const colors = getChartColors(seriesNames.length);

  const datasets = seriesNames.map((series, i) => ({
    label: series,
    data: phases.map((phase) => {
      const row = data.find((d) => d.phase === phase && d.series === series);
      return row?.trial_count ?? 0;
    }),
    backgroundColor: colors[i],
  }));

  activeChart = new Chart(canvas, {
    type: "bar",
    data: { labels: phases, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: { x: { stacked: false } },
      onClick: (event, elements) => {
        if (elements.length === 0) {
          hideCitations(citationsPanel, citationsList);
          return;
        }
        const { index, datasetIndex } = elements[0];
        const phase = phases[index];
        const series = seriesNames[datasetIndex];
        const row = data.find((d) => d.phase === phase && d.series === series);
        const key = `grouped:${series}|${phase}`;
        toggleCitations(
          citationsPanel,
          citationsList,
          row?.citations,
          `Citations — ${series} / ${phase}`,
          key,
        );
      },
    },
  });
}

function renderLineChart(canvas, visualization, citationsPanel, citationsList) {
  const { data } = visualization;
  const labels = data.map((d) => String(d.year));
  const counts = data.map((d) => d.trial_count);

  activeChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Trial count",
          data: counts,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          fill: true,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      onClick: (event, elements) =>
        onChartClick(
          event,
          elements,
          [data],
          citationsPanel,
          citationsList,
          (p) => String(p.year),
          (p) => `year:${p.year}`,
        ),
    },
  });
}

function renderHistogram(canvas, visualization, citationsPanel, citationsList) {
  const { data } = visualization;
  const labels = data.map((d) => d.bin_label);
  const counts = data.map((d) => d.trial_count);

  activeChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Trial count",
          data: counts,
          backgroundColor: "#16a34a",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      onClick: (event, elements) =>
        onChartClick(
          event,
          elements,
          [data],
          citationsPanel,
          citationsList,
          (p) => p.bin_label,
          (p) => `bin:${p.bin_label}`,
        ),
    },
  });
}

function renderScatterplot(canvas, visualization, citationsPanel, citationsList) {
  const { data } = visualization;

  activeChart = new Chart(canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Studies",
          data: data.map((d) => ({
            x: d.enrollment_count,
            y: d.year,
            nct_id: d.nct_id,
            citations: d.citations,
          })),
          backgroundColor: "#9333ea",
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const raw = ctx.raw;
              return `${raw.nct_id}: enrollment=${raw.x}, year=${raw.y}`;
            },
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Enrollment" } },
        y: { title: { display: true, text: "Start year" } },
      },
      onClick: (event, elements) => {
        if (elements.length === 0) {
          hideCitations(citationsPanel, citationsList);
          return;
        }
        const point = activeChart.data.datasets[0].data[elements[0].index];
        toggleCitations(
          citationsPanel,
          citationsList,
          point.citations,
          `Citations — ${point.nct_id}`,
          `nct:${point.nct_id}`,
        );
      },
    },
  });
}

function renderNetworkTable(container, visualization, citationsPanel, citationsList) {
  const { nodes, edges } = visualization.data;

  container.innerHTML = "";
  container.classList.remove("hidden");

  const summary = document.createElement("p");
  summary.className = "network-summary";
  summary.textContent = `${nodes.length} nodes, ${edges.length} edges`;
  container.appendChild(summary);

  const nodesHeading = document.createElement("h3");
  nodesHeading.textContent = "Nodes";
  container.appendChild(nodesHeading);

  const nodesWrap = document.createElement("div");
  nodesWrap.className = "table-wrap";
  const nodesTable = document.createElement("table");
  nodesTable.innerHTML =
    "<thead><tr><th>ID</th><th>Label</th><th>Type</th></tr></thead>";
  const nodesBody = document.createElement("tbody");
  const nodePreview = nodes.slice(0, 100);
  for (const node of nodePreview) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(node.id)}</td><td>${escapeHtml(node.label)}</td><td>${escapeHtml(node.entity_type)}</td>`;
    nodesBody.appendChild(tr);
  }
  nodesTable.appendChild(nodesBody);
  nodesWrap.appendChild(nodesTable);
  container.appendChild(nodesWrap);
  if (nodes.length > 100) {
    const more = document.createElement("p");
    more.className = "network-summary";
    more.textContent = `Showing first 100 of ${nodes.length} nodes. See raw JSON for full list.`;
    container.appendChild(more);
  }

  const edgesHeading = document.createElement("h3");
  edgesHeading.textContent = "Edges";
  container.appendChild(edgesHeading);

  const edgesWrap = document.createElement("div");
  edgesWrap.className = "table-wrap";
  const edgesTable = document.createElement("table");
  edgesTable.innerHTML =
    "<thead><tr><th>Source</th><th>Target</th><th>Weight</th></tr></thead>";
  const edgesBody = document.createElement("tbody");
  const edgePreview = edges.slice(0, 100);
  for (const edge of edgePreview) {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.innerHTML = `<td>${escapeHtml(edge.source)}</td><td>${escapeHtml(edge.target)}</td><td>${edge.weight}</td>`;
    tr.addEventListener("click", () => {
      const key = `edge:${edge.source}|${edge.target}`;
      toggleCitations(
        citationsPanel,
        citationsList,
        edge.citations,
        `Citations — ${edge.source} → ${edge.target}`,
        key,
      );
    });
    edgesBody.appendChild(tr);
  }
  edgesTable.appendChild(edgesBody);
  edgesWrap.appendChild(edgesTable);
  container.appendChild(edgesWrap);
  if (edges.length > 100) {
    const more = document.createElement("p");
    more.className = "network-summary";
    more.textContent = `Showing first 100 of ${edges.length} edges. See raw JSON for full list.`;
    container.appendChild(more);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render visualization into chart canvas or network tables.
 */
export function renderVisualization(
  response,
  {
    chartCanvas,
    chartContainer,
    networkContainer,
    citationsPanel,
    citationsList,
  },
) {
  destroyChart();
  hideCitations(citationsPanel, citationsList);

  const { visualization } = response;
  const isNetwork = visualization.type === "network_graph";

  chartContainer.classList.toggle("hidden", isNetwork);
  networkContainer.classList.toggle("hidden", !isNetwork);

  if (isNetwork) {
    networkContainer.innerHTML = "";
    renderNetworkTable(networkContainer, visualization, citationsPanel, citationsList);
    return;
  }

  switch (visualization.type) {
    case "bar_chart":
      renderBarChart(chartCanvas, visualization, citationsPanel, citationsList);
      break;
    case "grouped_bar_chart":
      renderGroupedBarChart(chartCanvas, visualization, citationsPanel, citationsList);
      break;
    case "line_chart":
      renderLineChart(chartCanvas, visualization, citationsPanel, citationsList);
      break;
    case "histogram":
      renderHistogram(chartCanvas, visualization, citationsPanel, citationsList);
      break;
    case "scatterplot":
      renderScatterplot(chartCanvas, visualization, citationsPanel, citationsList);
      break;
    default:
      throw new Error(`Unsupported visualization type: ${visualization.type}`);
  }
}

export function cleanupRenderer() {
  destroyChart();
}
