import { renderMeta, hideCitations } from "./meta.js";
import { renderVisualization, cleanupRenderer } from "./renderers.js";

const PRESETS = [
  { label: "Bar — Metformin phases", query: "Compare trial phases for Metformin" },
  {
    label: "Grouped — Metformin vs Pembrolizumab",
    query: "Compare phases for Metformin vs Pembrolizumab",
  },
  {
    label: "Line — breast cancer timeline",
    query: "How many breast cancer trials started each year?",
  },
  {
    label: "Histogram — Nivolumab enrollment",
    query: "What is the enrollment distribution for Nivolumab trials?",
  },
  {
    label: "Scatter — diabetes enrollment vs year",
    query:
      "What is the relationship between enrollment and start year for type 2 diabetes trials?",
  },
  {
    label: "Network — melanoma sponsors",
    query: "Which sponsors are running trials for melanoma?",
  },
];

const form = document.getElementById("query-form");
const queryInput = document.getElementById("query-input");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const resultsEmpty = document.getElementById("results-empty");
const resultsContent = document.getElementById("results-content");
const vizTitle = document.getElementById("viz-title");
const vizType = document.getElementById("viz-type");
const chartContainer = document.getElementById("chart-container");
const chartCanvas = document.getElementById("chart-canvas");
const networkContainer = document.getElementById("network-container");
const citationsPanel = document.getElementById("citations-panel");
const citationsList = document.getElementById("citations-list");
const metaContainer = document.getElementById("meta-container");
const rawJson = document.getElementById("raw-json");
const presetButtons = document.getElementById("preset-buttons");

function setStatus(message, kind = "loading") {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
  statusEl.classList.remove("hidden");
}

function clearStatus() {
  statusEl.classList.add("hidden");
  statusEl.textContent = "";
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  presetButtons.querySelectorAll("button").forEach((btn) => {
    btn.disabled = loading;
  });
  if (loading) {
    setStatus("Fetching visualization from /visualize…", "loading");
  }
}

function showResultsEmpty() {
  resultsEmpty.classList.remove("hidden");
  resultsContent.classList.add("hidden");
}

function showResultsContent() {
  resultsEmpty.classList.add("hidden");
  resultsContent.classList.remove("hidden");
}

async function visualize(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    setStatus("Query cannot be empty.", "error");
    return;
  }

  setLoading(true);
  cleanupRenderer();
  hideCitations(citationsPanel, citationsList);

  try {
    const res = await fetch("/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
    });

    const body = await res.json();

    if (!res.ok) {
      const err = body.error ?? { code: "UNKNOWN", message: "Request failed" };
      throw new Error(`${err.code}: ${err.message}`);
    }

    renderResponse(body);
    clearStatus();
  } catch (error) {
    showResultsEmpty();
    const message = error instanceof Error ? error.message : String(error);
    setStatus(message, "error");
  } finally {
    setLoading(false);
  }
}

function renderResponse(response) {
  showResultsContent();
  vizTitle.textContent = response.visualization.title;
  vizType.textContent = response.visualization.type;

  renderVisualization(response, {
    chartCanvas,
    chartContainer,
    networkContainer,
    citationsPanel,
    citationsList,
  });

  renderMeta(metaContainer, response.meta);
  rawJson.textContent = JSON.stringify(response, null, 2);
}

function initPresets() {
  for (const preset of PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = preset.label;
    btn.title = preset.query;
    btn.addEventListener("click", () => {
      queryInput.value = preset.query;
      visualize(preset.query);
    });
    presetButtons.appendChild(btn);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  visualize(queryInput.value);
});

initPresets();
