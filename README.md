# ClinicalTrials.gov Visualization Pipeline

Turn natural-language clinical trial queries into visualization-ready JSON. The pipeline supports **comparison** queries (trial counts by phase → bar chart), **timeline** queries (trial counts by start year → line chart), and **distribution** queries (trial counts by enrollment bin → histogram), backed by live ClinicalTrials.gov data.

## Supported flows

| Intent | Viz type | Default measure | Example query |
|--------|----------|-----------------|---------------|
| `comparison` | `bar_chart` | trial count per **phase** | "Compare trial phases for Pembrolizumab" |
| `trend_over_time` | `line_chart` | trial count per **start year** | "How have Pembrolizumab trials changed over time?" |
| `distribution` | `histogram` | trial count per **enrollment bin** | "What is the enrollment distribution for Pembrolizumab trials?" |

**Deferred (V2c):** `relationship` → `scatterplot` (enrollment vs start year).

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
npm run demo:timeline       # start-year trend → line chart
npm run demo:distribution   # enrollment distribution → histogram
npm run demo -- --query "Compare trial phases for Pembrolizumab"
npm run demo -- --list      # show available presets
```

Run unit tests:

```bash
npm test
```

Other useful scripts:

- `npm run typecheck` — TypeScript compile check
- `npm run smoke` — in-process HTTP smoke tests plus mocked timeline and histogram cases (no live APIs)
- `npm run smoke:live` — smoke tests including live Pembrolizumab comparison, timeline, and distribution queries

With the server running, interactive API docs are available at `http://localhost:3000/docs` (or your configured `PORT`).

## API contract

### `POST /visualize`

Interpret a natural-language query and return a visualization specification (`bar_chart`, `line_chart`, or `histogram`).

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
| 400 | `UNSUPPORTED_INTENT` | Intent outside supported set (`comparison`, `trend_over_time`, `distribution`) |
| 404 | `NO_STUDIES_FOUND` | CT.gov returned zero studies |
| 422 | `INVALID_PARAMETERS` | No usable entity filters after validation |
| 422 | `NO_AGGREGATABLE_DATA` | Studies fetched but none had mappable phase, start-date, or enrollment data |
| 502 | `UPSTREAM_API_FAILURE` | CT.gov request failed after retries |
| 502 | `INTERPRETATION_FAILURE` | OpenAI interpretation failed after retries |

### Examples

Comparison (bar chart):

```bash
curl -X POST http://localhost:3000/visualize \
  -H "Content-Type: application/json" \
  -d '{"query": "Compare trial phases for Pembrolizumab"}'
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

## Architecture

Layered pipeline with a thin orchestrator (`buildVisualization`):

1. **Interpret** — OpenAI structured output extracts entities and intent
2. **Validate** — trim and require at least one filter (`drug_name`, `condition`, or `phase`)
3. **Fetch** — paginated ClinicalTrials.gov `/studies` with intent-specific fields
4. **Aggregate** — deterministic bin counts (phase bins, start-year bins, or enrollment bins with zero-fill)
5. **Resolve** — map intent → visualization type (`comparison` → `bar_chart`, `trend_over_time` → `line_chart`, `distribution` → `histogram`)
6. **Assemble** — build title, encoding, data, and meta; validate against Zod schema

LLM calls live in `src/externals/`; aggregation and response shaping are deterministic in `src/domain/`.

## Design notes

- **Phase zero-fill (V1):** All six phase categories appear in every bar chart response, even when empty. Stable axes and honest gaps.
- **Year zero-fill (V2):** All years from min to max start year appear in line chart responses. Gap years use `trial_count: 0` so clients do not interpolate across missing data.
- **Enrollment zero-fill (V2b):** All six fixed enrollment bins appear in every histogram response, even when empty. Each study contributes to exactly one bin; the top bin (`5,001+`) is open-ended.
- **Deferred V2c:** Enrollment-vs-year relationship (`scatterplot`) will reuse the same intent-dispatch pattern and enrollment parsing added for distribution.

## Testing

Unit tests cover deterministic domain logic (`npm test`). `npm run demo` runs the full pipeline for a preset or custom query. `npm run smoke` includes HTTP validation plus mocked timeline and histogram cases that do not call live APIs.
