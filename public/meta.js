const FILTER_LABELS = {
  drug_name: "Drug",
  comparison_targets: "Comparison targets",
  condition: "Condition",
  phase: "Phase",
  sponsor: "Sponsor",
  country: "Country",
  start_year: "Start year",
  end_year: "End year",
};

function formatFilterValue(value) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.join(", ");
  }
  return String(value);
}

function buildWarnings(meta) {
  const warnings = [];
  if (meta.truncated) {
    warnings.push("Results may be incomplete — CT.gov pagination limit was reached.");
  }
  if (meta.skipped_malformed > 0) {
    warnings.push(
      `${meta.skipped_malformed} fetched stud${meta.skipped_malformed === 1 ? "y was" : "ies were"} skipped due to missing or invalid fields.`,
    );
  }
  return warnings;
}

function appendMetaSection(container, title, entries) {
  const section = document.createElement("div");
  section.className = "meta-section";
  section.innerHTML = `<h3>${title}</h3>`;

  const fields = document.createElement("div");
  fields.className = "meta-fields";

  for (const [label, value, isEmpty = false] of entries) {
    const field = document.createElement("div");
    field.className = "meta-field";

    const labelEl = document.createElement("span");
    labelEl.className = "meta-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = isEmpty ? "meta-value is-empty" : "meta-value";
    valueEl.textContent = value;

    field.appendChild(labelEl);
    field.appendChild(valueEl);
    fields.appendChild(field);
  }

  section.appendChild(fields);
  container.appendChild(section);
}

function isEmptyFilterValue(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

/**
 * Render meta filters, stats, assumptions, and warnings into a container element.
 */
export function renderMeta(container, meta) {
  container.innerHTML = "";

  const warnings = buildWarnings(meta);
  if (warnings.length > 0) {
    const warnEl = document.createElement("div");
    warnEl.className = "meta-warnings";
    warnEl.textContent = warnings.join(" ");
    container.appendChild(warnEl);
  }

  const stats = [
    ["Source", meta.source],
    ["Fetched studies", String(meta.fetched_studies)],
    ["Skipped malformed", String(meta.skipped_malformed)],
    ["Multi-phase studies", String(meta.studies_with_multiple_phases)],
    ["Truncated", meta.truncated ? "Yes" : "No"],
  ];
  if (meta.comparison_targets) {
    stats.push(["Comparison targets", meta.comparison_targets.join(", ")]);
  }
  if (meta.comparison_dimension) {
    stats.push(["Comparison dimension", meta.comparison_dimension]);
  }
  if (meta.network_dimension) {
    stats.push(["Network dimension", meta.network_dimension]);
  }
  appendMetaSection(container, "Stats", stats);

  const filters = Object.entries(FILTER_LABELS).map(([key, label]) => {
    const raw = meta.filters[key];
    const empty = isEmptyFilterValue(raw);
    return [label, formatFilterValue(raw), empty];
  });
  appendMetaSection(container, "Filters", filters);

  if (meta.assumptions && meta.assumptions.length > 0) {
    const assumptionsSection = document.createElement("div");
    assumptionsSection.className = "meta-section";
    assumptionsSection.innerHTML = "<h3>Assumptions</h3>";
    const ul = document.createElement("ul");
    ul.className = "assumptions-list";
    for (const note of meta.assumptions) {
      const li = document.createElement("li");
      li.textContent = note;
      ul.appendChild(li);
    }
    assumptionsSection.appendChild(ul);
    container.appendChild(assumptionsSection);
  }
}

/**
 * Show citations for a datum or edge in the citations panel.
 */
export function showCitations(citationsPanel, citationsList, citations, title) {
  if (!citations || citations.length === 0) {
    citationsPanel.classList.add("hidden");
    citationsList.innerHTML = "";
    return;
  }

  citationsPanel.classList.remove("hidden");
  citationsList.innerHTML = "";
  if (title) {
    const heading = citationsPanel.querySelector("h3");
    if (heading) heading.textContent = title;
  }

  for (const citation of citations) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = `https://clinicaltrials.gov/study/${encodeURIComponent(citation.nct_id)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = citation.nct_id;
    li.appendChild(link);
    li.appendChild(document.createTextNode(` — ${citation.excerpt}`));
    citationsList.appendChild(li);
  }
}

export function hideCitations(citationsPanel, citationsList) {
  citationsPanel.classList.add("hidden");
  citationsList.innerHTML = "";
}
