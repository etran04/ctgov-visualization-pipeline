# ClinicalTrials.gov Visualization Pipeline

Turn natural-language clinical trial queries into visualization-ready JSON. The pipeline supports **comparison** queries (trial counts by phase → bar chart or grouped bar chart for drug-vs-drug comparisons), **timeline** queries (trial counts by start year → line chart), **distribution** queries (trial counts by enrollment bin → histogram), **relationship** queries (enrollment vs start year per study → scatterplot), and **network** queries (drug–sponsor bipartite graph → network graph), backed by live ClinicalTrials.gov data.

## Supported flows

| Intent | Viz type | Default measure | Example query |
|--------|----------|-----------------|---------------|
| `comparison` (single drug) | `bar_chart` | trial count per **phase** | "Compare trial phases for Pembrolizumab" |
| `comparison` (2–4 drugs) | `grouped_bar_chart` | trial count per **phase** × **drug series** | "Compare phases for Metformin vs Pembrolizumab" |
| `trend_over_time` | `line_chart` | trial count per **start year** | "How have Pembrolizumab trials changed over time?" |
| `distribution` | `histogram` | trial count per **enrollment bin** | "What is the enrollment distribution for Pembrolizumab trials?" |
| `relationship` | `scatterplot` | **one point per study** (enrollment vs start year) | "What is the relationship between enrollment and start year for Pembrolizumab trials?" |
| `network` | `network_graph` | **drug–sponsor edges** (weight = trial count per pair) | "Which sponsors are running Pembrolizumab trials?" |

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Set your OpenAI API key in `.env`:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

`OPENAI_MODEL` defaults to `gpt-5.4` if unset. Other optional settings (`CTGOV_MAX_PAGES`, `PORT`, etc.) are documented in `.env.example`.

## Run

Start the HTTP server (default port `3000`, or `PORT` from `.env`):

```bash
npm run dev
```

Run end-to-end demos (OpenAI + ClinicalTrials.gov; prints summary + response JSON):

```bash
npm run demo                # default: comparison preset
npm run demo:comparison     # phase comparison → bar chart
npm run demo:grouped        # drug-vs-drug phase comparison → grouped bar chart
npm run demo:timeline       # start-year trend → line chart
npm run demo:distribution   # enrollment distribution → histogram
npm run demo:relationship   # enrollment vs start year → scatterplot
npm run demo:network        # drug–sponsor network → network graph
npm run demo -- --query "Compare trial phases for Pembrolizumab"
npm run demo -- --list      # show available presets
```

Run unit tests:

```bash
npm test
```

Other useful scripts:

- `npm run typecheck` — TypeScript compile check
- `npm run smoke` — in-process HTTP smoke tests plus mocked timeline, histogram, scatterplot, network, and grouped comparison cases (no live APIs)
- `npm run smoke:live` — smoke tests including live Pembrolizumab comparison, grouped drug comparison, timeline, distribution, relationship, and network queries
- `npm run examples:generate` — regenerate committed JSON outputs in `examples/`
- `npm run smoke:live:llm` — live OpenAI routing checks only (network vs relationship disambiguation)

With the server running, interactive API docs are available at `http://localhost:3000/docs` (or your configured `PORT`).

## API contract

### `POST /visualize`

Interpret a natural-language query and return a visualization specification (`bar_chart`, `grouped_bar_chart`, `line_chart`, `histogram`, `scatterplot`, or `network_graph`).

**Request**

```json
{
  "query": "Compare trial phases for Pembrolizumab",
  "hints": {
    "entities": {
      "drug_name": "Pembrolizumab"
    }
  }
}
```

- `query` (required): non-empty natural-language query.
- `hints` (optional): partial structured context passed to the LLM as advisory input. Hints never bypass interpretation.

**Success response — bar chart (`200`)**

```json
{
  "visualization": {
    "type": "bar_chart",
    "title": "Trial phases for Pembrolizumab",
    "encoding": {
      "x": { "field": "phase", "type": "nominal" },
      "y": { "field": "trial_count", "type": "quantitative" }
    },
    "data": [
      { "phase": "Phase 1", "trial_count": 42 },
      { "phase": "Phase 2", "trial_count": 18 }
    ]
  },
  "meta": {
    "filters": {
      "drug_name": "Pembrolizumab",
      "condition": null,
      "phase": null
    },
    "source": "clinicaltrials.gov",
    "fetched_studies": 120,
    "skipped_malformed": 0,
    "studies_with_multiple_phases": 15,
    "truncated": false
  }
}
```

Phase bins always include all six categories (`Phase 1`–`Phase 4`, `Early Phase 1`, `Not Applicable`), zero-filled when no trials match. Trial counts reflect studies that may appear in multiple phase bins.

**Success response — grouped bar chart (`200`)**

Drug-vs-drug phase comparisons (2–4 drugs) return a long-format dataset with `series` (drug name) on the color channel:

```json
{
  "visualization": {
    "type": "grouped_bar_chart",
    "title": "Trial phases: Metformin vs Pembrolizumab",
    "encoding": {
      "x": { "field": "phase", "type": "nominal" },
      "y": { "field": "trial_count", "type": "quantitative" },
      "color": { "field": "series", "type": "nominal" }
    },
    "data": [
      { "phase": "Phase 1", "series": "Metformin", "trial_count": 120 },
      { "phase": "Phase 1", "series": "Pembrolizumab", "trial_count": 1031 },
      { "phase": "Phase 2", "series": "Metformin", "trial_count": 85 },
      { "phase": "Phase 2", "series": "Pembrolizumab", "trial_count": 400 }
    ]
  },
  "meta": {
    "filters": {
      "drug_name": null,
      "comparison_targets": null,
      "condition": null,
      "phase": null
    },
    "comparison_targets": ["Metformin", "Pembrolizumab"],
    "comparison_dimension": "phase",
    "source": "clinicaltrials.gov",
    "fetched_studies": 5600,
    "skipped_malformed": 12,
    "studies_with_multiple_phases": 508,
    "truncated": false
  }
}
```

Every `(phase, series)` pair appears even when `trial_count` is 0 (zero-fill across all six phase bins × all series). Compared drugs are listed in `meta.comparison_targets`; `meta.filters.drug_name` stays `null`. CT.gov is queried once per drug in parallel with shared `condition` / `phase` filters.

**Success response — line chart (`200`)**

```json
{
  "visualization": {
    "type": "line_chart",
    "title": "Trials started per year for Pembrolizumab",
    "encoding": {
      "x": { "field": "year", "type": "temporal" },
      "y": { "field": "trial_count", "type": "quantitative" }
    },
    "data": [
      { "year": 2020, "trial_count": 12 },
      { "year": 2021, "trial_count": 0 },
      { "year": 2022, "trial_count": 0 },
      { "year": 2023, "trial_count": 8 }
    ]
  },
  "meta": {
    "filters": {
      "drug_name": "Pembrolizumab",
      "condition": null,
      "phase": null
    },
    "source": "clinicaltrials.gov",
    "fetched_studies": 20,
    "skipped_malformed": 0,
    "studies_with_multiple_phases": 0,
    "truncated": false
  }
}
```

Year bins span from the minimum to maximum start year in the fetched studies (inclusive). Years with no trials appear explicitly as `trial_count: 0`. This prevents frontends from drawing a continuous line across unknown gap years — a line from 2020 to 2023 would otherwise imply steady change through 2021–2022 when no data exists.

**Success response — histogram (`200`)**

```json
{
  "visualization": {
    "type": "histogram",
    "title": "Enrollment distribution for Pembrolizumab",
    "encoding": {
      "x": { "field": "bin_label", "type": "ordinal" },
      "y": { "field": "trial_count", "type": "quantitative" }
    },
    "data": [
      { "bin_label": "1–50", "bin_start": 1, "bin_end": 50, "trial_count": 42 },
      { "bin_label": "51–100", "bin_start": 51, "bin_end": 100, "trial_count": 18 },
      { "bin_label": "101–500", "bin_start": 101, "bin_end": 500, "trial_count": 0 },
      { "bin_label": "501–1,000", "bin_start": 501, "bin_end": 1000, "trial_count": 0 },
      { "bin_label": "1,001–5,000", "bin_start": 1001, "bin_end": 5000, "trial_count": 0 },
      { "bin_label": "5,001+", "bin_start": 5001, "bin_end": null, "trial_count": 0 }
    ]
  },
  "meta": {
    "filters": {
      "drug_name": "Pembrolizumab",
      "condition": null,
      "phase": null
    },
    "source": "clinicaltrials.gov",
    "fetched_studies": 60,
    "skipped_malformed": 0,
    "studies_with_multiple_phases": 0,
    "truncated": false
  }
}
```

Enrollment bins always include all six fixed categories (`1–50`, `51–100`, `101–500`, `501–1,000`, `1,001–5,000`, `5,001+`), zero-filled when no trials match. Each study maps to exactly one bin based on `protocolSection.designModule.enrollmentInfo.count`. Studies with missing, non-numeric, or non-positive enrollment are skipped and counted in `meta.skipped_malformed`.

**Success response — scatterplot (`200`)**

```json
{
  "visualization": {
    "type": "scatterplot",
    "title": "Enrollment vs start year for Pembrolizumab",
    "encoding": {
      "x": { "field": "enrollment_count", "type": "quantitative" },
      "y": { "field": "year", "type": "temporal" }
    },
    "data": [
      { "nct_id": "NCT00000301", "enrollment_count": 120, "year": 2020 },
      { "nct_id": "NCT00000302", "enrollment_count": 75, "year": 2021 }
    ]
  },
  "meta": {
    "filters": {
      "drug_name": "Pembrolizumab",
      "condition": null,
      "phase": null
    },
    "source": "clinicaltrials.gov",
    "fetched_studies": 60,
    "skipped_malformed": 3,
    "studies_with_multiple_phases": 0,
    "truncated": false
  }
}
```

Each valid study becomes one scatterplot point (`x = enrollment_count`, `y = year`). Every point includes `nct_id` for tooltips and CT.gov links. Studies missing either dimension (non-positive enrollment or unparseable start date) are skipped and counted in `meta.skipped_malformed`. There is no binning or zero-fill — only studies with both valid enrollment and start year appear as points. Large result sets return all valid points; pagination limits are reflected in `meta.truncated`.

**Success response — network graph (`200`)**

```json
{
  "visualization": {
    "type": "network_graph",
    "title": "Drug–sponsor network for Pembrolizumab",
    "encoding": {
      "nodes": {
        "id": { "field": "id", "type": "nominal" },
        "label": { "field": "label", "type": "nominal" },
        "entity_type": { "field": "entity_type", "type": "nominal" }
      },
      "edges": {
        "source": { "field": "source", "type": "nominal" },
        "target": { "field": "target", "type": "nominal" },
        "weight": { "field": "weight", "type": "quantitative" }
      }
    },
    "data": {
      "nodes": [
        { "id": "drug:pembrolizumab", "label": "Pembrolizumab", "entity_type": "drug" },
        { "id": "sponsor:merck-sharp-dohme-llc", "label": "Merck Sharp & Dohme LLC", "entity_type": "sponsor" }
      ],
      "edges": [
        { "source": "drug:pembrolizumab", "target": "sponsor:merck-sharp-dohme-llc", "weight": 12 }
      ]
    }
  },
  "meta": {
    "filters": {
      "drug_name": "Pembrolizumab",
      "condition": null,
      "phase": null
    },
    "network_dimension": "drug_sponsor",
    "source": "clinicaltrials.gov",
    "fetched_studies": 120,
    "skipped_malformed": 3,
    "studies_with_multiple_phases": 0,
    "truncated": false
  }
}
```

Network queries return a bipartite graph: nodes are drugs and sponsors; edges link intervention names to lead sponsors. Edge `weight` is the number of trials connecting that pair. Node IDs use type prefixes (`drug:`, `sponsor:`) to prevent collisions. Studies missing NCT ID, interventions, or lead sponsor are skipped (`meta.skipped_malformed`). `meta.network_dimension` identifies the topology rendered (`drug_sponsor` in V1).

**Error response**

```json
{
  "error": {
    "code": "NO_STUDIES_FOUND",
    "message": "No studies found for the given filters"
  }
}
```

| HTTP | Code | When |
|------|------|------|
| 400 | `INVALID_REQUEST` | Malformed or empty request body |
| 400 | `UNSUPPORTED_INTENT` | Intent outside supported set (`comparison`, `trend_over_time`, `distribution`, `relationship`, `network`) |
| 404 | `NO_STUDIES_FOUND` | CT.gov returned zero studies |
| 422 | `INVALID_PARAMETERS` | No usable entity filters after validation |
| 422 | `NO_AGGREGATABLE_DATA` | Studies fetched but none had mappable phase, start-date, enrollment, or network data |
| 502 | `UPSTREAM_API_FAILURE` | CT.gov request failed after retries |
| 502 | `INTERPRETATION_FAILURE` | OpenAI interpretation failed after retries |

### Examples

Comparison (bar chart):

```bash
curl -X POST http://localhost:3000/visualize \
  -H "Content-Type: application/json" \
  -d '{"query": "Compare trial phases for Pembrolizumab"}'
```

Grouped comparison (grouped bar chart):

```bash
curl -X POST http://localhost:3000/visualize \
  -H "Content-Type: application/json" \
  -d '{"query": "Compare phases for Metformin vs Pembrolizumab"}'
```

Timeline (line chart):

```bash
curl -X POST http://localhost:3000/visualize \
  -H "Content-Type: application/json" \
  -d '{"query": "How have Pembrolizumab trials changed over time?"}'
```

Distribution (histogram):

```bash
curl -X POST http://localhost:3000/visualize \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the enrollment distribution for Pembrolizumab trials?"}'
```

Relationship (scatterplot):

```bash
curl -X POST http://localhost:3000/visualize \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the relationship between enrollment and start year for Pembrolizumab trials?"}'
```

Network (network graph):

```bash
curl -X POST http://localhost:3000/visualize \
  -H "Content-Type: application/json" \
  -d '{"query": "Which sponsors are running Pembrolizumab trials?"}'
```

## Example runs

Committed outputs from live pipeline runs (OpenAI + ClinicalTrials.gov) are in [`examples/`](examples/). Each file includes the request query, full response JSON, and generation timestamp. Examples use varied drugs and conditions (Metformin, Nivolumab, breast cancer, type 2 diabetes, melanoma).

| File | Query focus | Visualization |
|------|-------------|---------------|
| [`examples/01-comparison-bar-chart.json`](examples/01-comparison-bar-chart.json) | Metformin phases | `bar_chart` |
| [`examples/06-grouped-bar-chart.json`](examples/06-grouped-bar-chart.json) | Metformin vs Pembrolizumab phases | `grouped_bar_chart` |
| [`examples/02-timeline-line-chart.json`](examples/02-timeline-line-chart.json) | Breast cancer over time | `line_chart` |
| [`examples/03-distribution-histogram.json`](examples/03-distribution-histogram.json) | Nivolumab enrollment | `histogram` |
| [`examples/04-relationship-scatterplot.json`](examples/04-relationship-scatterplot.json) | Type 2 diabetes enrollment vs year | `scatterplot` |
| [`examples/05-network-drug-sponsor.json`](examples/05-network-drug-sponsor.json) | Melanoma sponsor network | `network_graph` |

Regenerate with `npm run examples:generate` (requires `OPENAI_API_KEY`). Scatterplot and network outputs are larger because they return per-study points or full graphs.

## Architecture

Layered pipeline with a thin orchestrator (`buildVisualization`):

1. **Interpret** — OpenAI structured output extracts entities and intent
2. **Validate** — trim and require at least one filter (`drug_name`, `comparison_targets`, `condition`, or `phase`)
3. **Fetch** — paginated ClinicalTrials.gov `/studies` with intent-specific fields (parallel per-drug fetches for grouped comparisons)
4. **Aggregate** — deterministic bin counts (phase bins, grouped phase bins, start-year bins, enrollment bins with zero-fill), per-study relationship points, or bipartite network graphs
5. **Resolve** — map intent → visualization type (`comparison` → `bar_chart` or `grouped_bar_chart` by target count, `trend_over_time` → `line_chart`, `distribution` → `histogram`, `relationship` → `scatterplot`, `network` → `network_graph`)
6. **Assemble** — build title, encoding, data, and meta; validate against Zod schema

LLM calls live in `src/externals/`; aggregation and response shaping are deterministic in `src/domain/`.

## Design notes

- **Phase zero-fill (V1):** All six phase categories appear in every bar chart response, even when empty. Stable axes and honest gaps.
- **Grouped phase comparison (V1):** Drug-vs-drug queries (2–4 targets) use `grouped_bar_chart` with `color: series`. The x-axis is **phase only** in V1; the underlying pattern (multiple series × shared category bins) is designed to extend to other comparison dimensions later (e.g. enrollment bins), but aggregation, schema, and routing are phase-specific today.
- **Year zero-fill (V2):** All years from min to max start year appear in line chart responses. Gap years use `trial_count: 0` so clients do not interpolate across missing data.
- **Enrollment zero-fill (V2b):** All six fixed enrollment bins appear in every histogram response, even when empty. Each study contributes to exactly one bin; the top bin (`5,001+`) is open-ended.
- **Per-study scatter (V2c):** Relationship queries return one point per valid study with `nct_id`, `enrollment_count`, and `year`. No binning or zero-fill — unlike histogram and line chart paths. Studies missing either dimension are skipped; all valid points are returned (subject to CT.gov pagination via `meta.truncated`).
- **Bipartite network (V3):** Network queries return `{ nodes, edges }` for graph renderers. V1 ships `drug_sponsor` topology: one edge per intervention–sponsor pair per study, with `weight` counting trials. Internal `source_nct_ids` are tracked during aggregation but not emitted in the HTTP response.

## Testing

Unit tests cover deterministic domain logic (`npm test`). `npm run demo` runs the full pipeline for a preset or custom query. `npm run smoke` includes HTTP validation plus mocked timeline, histogram, scatterplot, network, and grouped comparison cases that do not call live APIs.

## Integrity note (AI tools & authorship)

AI tools were used freely during development, as permitted by the assignment. Engineering judgment and design reasoning—not tool usage—drive the architecture below.

### Tools used

| Tool | Role |
|------|------|
| **Cursor (AI-assisted IDE)** | Exploration, refactoring, test scaffolding, README drafting |
| **OpenAI API** (`gpt-5.4` default) | Runtime query interpretation only — extracts `intent`, `entities`, and dimension fields via structured output |
| **ClinicalTrials.gov Data API v2** | Authoritative trial data source (`/studies`) |
| **TypeScript, Fastify, Zod, Vitest** | Implementation and validation stack |

The LLM is **not** used to generate chart values. All visualization data comes from deterministic aggregation of CT.gov records after interpretation.

### Deliberate design vs AI-assisted work

**Designed and implemented deliberately (human-led):**

- Layered architecture: `externals/` for I/O, `domain/` for pure logic, thin `buildVisualization` orchestrator
- Intent → visualization type routing and intent-specific CT.gov field profiles
- Aggregation semantics: phase/year/enrollment zero-fill, per-study scatterplot model, bipartite network engine with dimension registry
- Zod schemas as the single contract for HTTP, OpenAI structured output, and response validation
- Error taxonomy and HTTP status mapping
- Test fixtures and edge-case coverage (multi-phase studies, malformed records, empty graphs)

**AI-assisted, then reviewed and adapted:**

- Initial boilerplate and file structure suggestions
- OpenAI system prompt drafts (edited for intent disambiguation, especially network vs relationship)
- Unit test cases and README prose
- Network graph dimension registry pattern (reviewed for extensibility before merge)

## Validation approach

Correctness is validated at multiple layers so probabilistic steps (LLM interpretation) never leak into chart data unchecked.

### 1. Schema validation (boundaries)

- **Request:** `VisualizeRequestSchema` on `POST /visualize`
- **Interpretation:** OpenAI output parsed through `QueryInterpretationOpenAiSchema` → discriminated `QueryInterpretationSchema`
- **Response:** `VisualizationResponseSchema.parse()` before every HTTP 200

Invalid shapes fail fast with typed domain errors instead of partial JSON.

### 2. Unit tests (`npm test`)

~20 Vitest files cover deterministic paths without live APIs:

- Aggregations (phase, grouped phase, start year, enrollment, relationship, network)
- CT.gov normalization and query param mapping
- Entity validation, visualization type resolution, response assembly
- Bipartite graph engine (weight accumulation, intervention collapse, skip rules)
- Interpretation parsing (mocked OpenAI payloads)

### 3. Smoke tests (`npm run smoke`)

In-process HTTP tests via Fastify `inject()`:

- Mocked end-to-end cases per visualization type (no OpenAI / CT.gov)
- Contract checks: `visualization.type`, encoding fields, meta shape, error codes

Optional (and very useful) live modes:

- `npm run smoke:live` — full pipeline against OpenAI + CT.gov
- `npm run smoke:live:llm` — intent routing checks (e.g. network vs relationship disambiguation)

### 4. Manual / committed examples

- `npm run demo` — interactive E2E for any query
- `npm run examples:generate` — regenerates committed outputs in [`examples/`](examples/) from live API runs
- OpenAPI docs at `/docs` — schema inspection

### 5. Operational guardrails

- CT.gov and OpenAI clients retry on transient failures (429, 5xx)
- `meta.truncated`, `meta.skipped_malformed`, and `meta.fetched_studies` surface data-quality caveats to clients
- `hints` are advisory only — they never bypass LLM interpretation or entity validation

## Future improvements

Known limitations and next steps if given more time:

### Citations & traceability

- Populate `citations` (`nct_id` + excerpt) on every bar, line, histogram, and network datum
- `source_nct_ids` are already collected internally during aggregation; assembly layer needs to wire excerpts from normalized study fields

### Query & visualization coverage

- Additional network topologies via dimension registry: `drug_condition`, `sponsor_condition`, drug–drug co-occurrence
- Extend grouped comparison beyond phase (e.g. enrollment bins on the x-axis) and beyond drug series (e.g. condition-vs-condition)
- Geographic breakdowns (country/site nodes) using `contactsLocationsModule`
- Broader structured input fields: `sponsor`, `country`, `start_year`, `end_year` in request schema and CT.gov filters
- `meta.assumptions` — log interpretation choices, zero-fill policy, truncation warnings

### Agent & resilience

- Tool-use loop: LLM calls CT.gov with refined queries on empty results
- Fallback when interpretation confidence is low (clarifying error or suggested rephrase)
- Graph pruning / top-N edges for large condition-wide networks

### Performance & ops

- Response size limits or pagination for scatterplot and network outputs on broad queries
- Caching layer for repeated CT.gov fetches
- Rate-limit awareness for CT.gov public API
