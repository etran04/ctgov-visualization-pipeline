import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ParsedChatCompletion } from "openai/resources/chat/completions";
import { z } from "zod";
import { config } from "../../config.js";
import { HTTP_STATUS, InterpretationError, UnsupportedIntentError } from "../../domain/errors.js";
import {
  parseQueryInterpretation,
  QueryInterpretationOpenAiSchema,
  SUPPORTED_INTENTS,
  type QueryInterpretation,
  type QueryInterpretationOpenAi,
} from "../../domain/schemas/index.js";
import { logger } from "../../lib/logger.js";

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: config.OPENAI_TIMEOUT_MS,
});

const SYSTEM_PROMPT = `You extract structured entities and visualization intent from natural-language queries about clinical trials.

Supported intents:

1. "comparison" — user wants to compare or break down trials by phase
   - Set comparison_dimension to "phase"
   - Set time_dimension to null
   - Set distribution_dimension to null
   - Set relationship_dimension to null
   - Set network_dimension to null
   - Single drug (one intervention named, no "vs" / "and" between drugs):
     - Set entities.drug_name to that drug; entities.comparison_targets to null
     - Set suggested_viz_type to "bar_chart"
     - Examples: "compare phases for Metformin", "trial phases for X"
   - Drug-vs-drug comparison (2–4 drugs, e.g. "A vs B", "compare X and Y"):
     - Set entities.comparison_targets to the drug names in order mentioned
     - Set entities.drug_name to null (never set both drug_name and comparison_targets)
     - Set suggested_viz_type to "grouped_bar_chart"
     - Examples: "compare phases for Metformin vs Pembrolizumab", "Metformin and Pembrolizumab phase breakdown"
   - Shared filters still go in entities: condition and phase apply to every compared drug

2. "trend_over_time" — user wants to see how trials change over time
   - Set time_dimension to "start_year"
   - Set suggested_viz_type to "line_chart"
   - Set comparison_dimension to null
   - Set distribution_dimension to null
   - Set relationship_dimension to null
   - Set network_dimension to null
   - Examples: "over time", "timeline", "trend", "per year", "how have X trials changed"

3. "distribution" — user wants to see enrollment sizes or how trials are distributed by enrollment
   - Set distribution_dimension to "enrollment_count"
   - Set suggested_viz_type to "histogram"
   - Set comparison_dimension to null
   - Set time_dimension to null
   - Set relationship_dimension to null
   - Set network_dimension to null
   - Examples: "enrollment distribution", "enrollment sizes", "how big are trials", "trial sizes for X"

4. "relationship" — user wants to see how enrollment relates to start year across individual trials
   - Set relationship_dimension to "enrollment_vs_start_year"
   - Set suggested_viz_type to "scatterplot"
   - Set comparison_dimension to null
   - Set time_dimension to null
   - Set distribution_dimension to null
   - Set network_dimension to null
   - Examples: "relationship between enrollment and start year", "enrollment vs year", "correlation between enrollment and start date", "enrollment and start year for X"
   - Distinguish from distribution (sizes/bins), trend_over_time (counts per year over time), and network (who sponsors or studies what — see below)

5. "network" — user wants to see which entities are connected in a bipartite graph (e.g. which sponsors run trials for a drug)
   - Set network_dimension to "drug_sponsor"
   - Set suggested_viz_type to "network_graph"
   - Set comparison_dimension to null
   - Set time_dimension to null
   - Set distribution_dimension to null
   - Set relationship_dimension to null
   - Examples: "which sponsors run trials for X", "network of sponsors studying X", "who is sponsoring X trials", "who is studying X"
   - Distinguish from relationship: network asks WHO is connected (sponsors, drugs); relationship asks how TWO NUMERIC VARIABLES correlate per trial (enrollment vs start year)

Intent disambiguation (network vs relationship):
- "relationship between enrollment and start year" → relationship
- "which sponsors run trials for X" → network
- "network of sponsors studying X" → network
- "who is sponsoring X trials" → network

Extract entities from the user query:
- drug_name: single intervention or drug name (null when comparing multiple drugs via comparison_targets)
- comparison_targets: array of 2–4 drug names when the user compares drugs to each other (e.g. "A vs B", "compare X and Y"); null for single-drug queries
- condition: disease, condition, or indication (null if not mentioned)
- phase: a single trial phase only when the query explicitly filters to one phase (null when comparing across phases, showing trends over time, showing enrollment distribution, showing enrollment vs start year, or showing a sponsor/drug network)
- sponsor: trial sponsor or lead sponsor organization name (null if not mentioned)
- country: country or location for trial sites, e.g. "United States", "Germany" (null if not mentioned)
- start_year: earliest study start year as a four-digit integer when the user limits trials from a year onward, e.g. "since 2015" (null if not mentioned)
- end_year: latest study start year as a four-digit integer when the user limits trials through a year, e.g. "before 2020" (null if not mentioned)

Comparison entity rules:
- Use comparison_targets (and drug_name null) for 2+ named drugs being compared
- Use drug_name (and comparison_targets null) for a single named drug
- Never populate both drug_name and comparison_targets
- comparison_targets may contain at most 4 unique drugs

Use null for fields that are not mentioned. Do not use empty strings.
Optional hints from the caller are advisory context only; prefer the user query when they conflict.`;

const RESPONSE_FORMAT = zodResponseFormat(
  QueryInterpretationOpenAiSchema,
  "query_interpretation",
);

function backoffDelayMs(attempt: number): number {
  return Math.min(250 * 2 ** (attempt - 1), 4000);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function isRetriableOpenAiError(error: unknown): boolean {
  if (error instanceof APIConnectionError || error instanceof APIConnectionTimeoutError) {
    return true;
  }

  if (error instanceof APIError) {
    const status = error.status;
    return status === HTTP_STATUS.TOO_MANY_REQUESTS || status >= HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  return false;
}

function isBlockedOrTruncatedOutput(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "LengthFinishReasonError" || error.name === "ContentFilterFinishReasonError")
  );
}

function buildUserMessage(query: string, hints?: Partial<QueryInterpretation>): string {
  if (hints === undefined || Object.keys(hints).length === 0) {
    return query;
  }

  return `${query}\n\nAdvisory hints (optional context only):\n${JSON.stringify(hints, null, 2)}`;
}

function extractInterpretation(
  completion: ParsedChatCompletion<QueryInterpretationOpenAi>,
): QueryInterpretation {
  const choice = completion.choices[0];
  if (choice === undefined) {
    throw new InterpretationError("OpenAI returned no completion choices");
  }

  if (choice.finish_reason === "length" || choice.finish_reason === "content_filter") {
    throw new InterpretationError("OpenAI interpretation was blocked or truncated");
  }

  const parsed = choice.message.parsed;
  if (parsed === null) {
    throw new InterpretationError("OpenAI returned an unparseable interpretation");
  }

  let interpretation: QueryInterpretation;
  try {
    interpretation = parseQueryInterpretation(parsed);
  } catch {
    throw new InterpretationError("OpenAI interpretation failed schema validation");
  }

  if (!(SUPPORTED_INTENTS as readonly string[]).includes(interpretation.intent)) {
    throw new UnsupportedIntentError(`Unsupported intent: ${interpretation.intent}`);
  }

  return interpretation;
}

async function requestInterpretation(
  query: string,
  hints?: Partial<QueryInterpretation>,
): Promise<QueryInterpretation> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: buildUserMessage(query, hints) },
  ];

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < config.OPENAI_RETRY_ATTEMPTS) {
    attempt += 1;

    try {
      const completion = await openai.chat.completions.parse({
        model: config.OPENAI_MODEL,
        messages,
        response_format: RESPONSE_FORMAT,
      });

      return extractInterpretation(completion);
    } catch (error) {
      if (error instanceof UnsupportedIntentError || error instanceof InterpretationError) {
        throw error;
      }

      if (error instanceof z.ZodError || isBlockedOrTruncatedOutput(error)) {
        logger.error({ err: errorMessage(error) }, "OpenAI interpretation produced invalid output");
        throw new InterpretationError("OpenAI interpretation produced invalid output");
      }

      lastError = error;

      if (error instanceof APIError && !isRetriableOpenAiError(error)) {
        logger.error({ err: errorMessage(error) }, "OpenAI interpretation request failed");
        throw new InterpretationError(`OpenAI interpretation request failed: ${errorMessage(error)}`);
      }

      if (attempt < config.OPENAI_RETRY_ATTEMPTS) {
        await sleep(backoffDelayMs(attempt));
        continue;
      }
    }
  }

  logger.error(
    { err: errorMessage(lastError) },
    "OpenAI interpretation failed after retries",
  );
  throw new InterpretationError(
    `OpenAI interpretation failed after retries: ${errorMessage(lastError)}`,
  );
}

/**
 * Interpret a natural-language query into structured entities via OpenAI.
 *
 * Always calls the LLM — `hints` are advisory context only and do not bypass
 * interpretation. Retries transient failures (429, 5xx, network) with
 * exponential backoff up to `OPENAI_RETRY_ATTEMPTS`.
 *
 * @param query - User's natural-language request.
 * @param hints - Optional partial interpretation passed as advisory context.
 * @returns Validated `QueryInterpretation` with a supported intent.
 * @throws {UnsupportedIntentError} When the model returns an unsupported intent.
 * @throws {InterpretationError} On timeout, exhausted retries, blocked/truncated
 *   output, or unparseable structured response.
 */
export async function interpretQuery(
  query: string,
  hints?: Partial<QueryInterpretation>,
): Promise<QueryInterpretation> {
  const interpretation = await requestInterpretation(query, hints);

  logger.info({ interpretation }, "Interpreted query");

  return interpretation;
}
