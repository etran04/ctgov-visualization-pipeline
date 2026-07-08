# ClinicalTrials.gov Visualization Pipeline

Turn natural-language clinical trial queries into visualization-ready JSON. V1 supports **comparison** queries (trial counts by phase) and returns a **bar chart** specification backed by live ClinicalTrials.gov data.

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

Run the end-to-end comparison demo (OpenAI + ClinicalTrials.gov; prints each pipeline step):

```bash
npm run demo:comparison
```

Run unit tests:

```bash
npm test
```

Other useful scripts:

- `npm run typecheck` — TypeScript compile check
- `npm run smoke` — in-process HTTP smoke tests (no live APIs)
- `npm run smoke:live` — smoke tests including a live Pembrolizumab query

With the server running, interactive API docs are available at `http://localhost:3000/docs` (or your configured `PORT`).

## API contract

### `POST /visualize`

Interpret a natural-language query and return a bar chart of trial counts by phase.

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

**Success response (`200`)**

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

Phase bins always include all six V1 categories (`Phase 1`–`Phase 4`, `Early Phase 1`, `Not Applicable`), zero-filled when no trials match. Trial counts reflect studies that may appear in multiple phase bins.

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
| 400 | `UNSUPPORTED_INTENT` | Intent other than `comparison` |
| 404 | `NO_STUDIES_FOUND` | CT.gov returned zero studies |
| 422 | `INVALID_PARAMETERS` | No usable entity filters after validation |
| 422 | `NO_AGGREGATABLE_DATA` | Studies fetched but none had mappable phase data |
| 502 | `UPSTREAM_API_FAILURE` | CT.gov request failed after retries |
| 502 | `INTERPRETATION_FAILURE` | OpenAI interpretation failed after retries |

### Example

```bash
curl -X POST http://localhost:3000/visualize \
  -H "Content-Type: application/json" \
  -d '{"query": "Compare trial phases for Pembrolizumab"}'
```

Supported V1 example query: **"Compare trial phases for Pembrolizumab"**

## Architecture

Layered pipeline with a thin orchestrator (`buildVisualization`):

1. **Interpret** — OpenAI structured output extracts entities and intent
2. **Validate** — trim and require at least one filter (`drug_name`, `condition`, or `phase`)
3. **Fetch** — paginated ClinicalTrials.gov `/studies` with retries
4. **Aggregate** — deterministic phase bin counts (multi-phase studies counted in each bin)
5. **Resolve** — map `comparison` intent → `bar_chart`
6. **Assemble** — build title, encoding, data, and meta; validate against Zod schema

LLM calls live in `src/externals/`; aggregation and response shaping are deterministic in `src/domain/`.

## Testing

Unit tests cover deterministic domain logic (`npm test`). The demo script (`npm run demo:comparison`) is for manual end-to-end inspection and is not a substitute for tests.
