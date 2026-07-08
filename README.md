# ClinicalTrials.gov Visualization Pipeline (Current State: Through Commit 2)

This repository is a TypeScript backend project for turning natural-language clinical trial queries into visualization-ready JSON.

Current implementation status: **foundation + deterministic domain layer are complete (through Commit 2)**. HTTP routes, OpenAI integration, and ClinicalTrials.gov fetch orchestration are planned but not fully wired yet.

## What exists right now

- Environment/config parsing with defaults in `src/config.ts`
- Canonical Zod schemas in `src/domain/schemas.ts`
- Deterministic domain modules:
  - `src/domain/validateEntities.ts`
  - `src/domain/aggregateByPhase.ts`
  - `src/domain/resolveVisualizationType.ts`
  - `src/domain/assembleVisualizationResponse.ts`
- Domain test coverage with Vitest:
  - `tests/domain/validateEntities.test.ts`
  - `tests/domain/aggregateByPhase.test.ts`
  - `tests/domain/resolveVisualizationType.test.ts`
  - `tests/domain/assembleVisualizationResponse.test.ts`

## Not implemented yet (planned in later commits)

- `POST /visualize` Fastify route and server bootstrap wiring
- OpenAI interpretation client in runtime flow
- ClinicalTrials.gov fetch client in runtime flow
- End-to-end demo script execution against full pipeline

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
cp .env.example .env
```

3. Set required values (at minimum):

- `OPENAI_API_KEY` (required by config)

## Scripts

- `npm run typecheck` - TypeScript compile check
- `npm run test` - Run domain unit tests
- `npm run test:watch` - Run tests in watch mode

Planned scripts that are present in `package.json` but depend on later commits:

- `npm run dev` (needs server wiring)
- `npm run start` (needs server wiring)
- `npm run demo:comparison` (needs full pipeline wiring)

## Current request/response schema contract

These contracts are already defined in `src/domain/schemas.ts` and represent the target shape for the API layer once wired.

### Request shape (target for `POST /visualize`)

```ts
{
  query: string;
  hints?: Partial<QueryInterpretation>;
}
```

### Response shape (target)

```ts
{
  visualization: {
    type: "bar_chart";
    title: string;
    encoding: {
      x: { field: "phase"; type: "nominal" };
      y: { field: "trial_count"; type: "quantitative" };
    };
    data: Array<{
      phase: string;
      trial_count: number;
      citations?: Array<{ nct_id: string; excerpt: string }> | null;
    }>;
  };
  meta: {
    filters: {
      drug_name: string | null;
      condition: string | null;
      phase: "Phase 1" | "Phase 2" | "Phase 3" | "Phase 4" | "Early Phase 1" | "Not Applicable" | null;
    };
    source: "clinicaltrials.gov";
    fetched_studies: number;
    skipped_malformed: number;
    studies_with_multiple_phases: number;
    truncated: boolean;
  };
}
```

## Design decisions and tradeoffs (current phase)

- Keep LLM usage isolated to externals (planned) and keep domain logic deterministic now.
- Use strict schema-first contracts (Zod) early to reduce integration drift.
- Favor unit testing deterministic logic before wiring network-dependent stages.
- Scope V1 to one intent (`comparison`) and one visualization type (`bar_chart`) to keep behavior predictable.

## Current limitations

- No runnable HTTP endpoint yet.
- No end-to-end query execution against OpenAI + ClinicalTrials.gov yet.
- No example API run outputs yet (to be added after endpoint + pipeline wiring).

## Next planned milestone

Wire externals and orchestrator layers, then expose `POST /visualize` and add end-to-end demo outputs.
