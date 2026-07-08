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
   - Set suggested_viz_type to "bar_chart"
   - Set time_dimension to null
   - Set distribution_dimension to null
   - Examples: "compare phases", "breakdown by phase", "trial phases for X"

2. "trend_over_time" — user wants to see how trials change over time
   - Set time_dimension to "start_year"
   - Set suggested_viz_type to "line_chart"
   - Set comparison_dimension to null
   - Set distribution_dimension to null
   - Examples: "over time", "timeline", "trend", "per year", "how have X trials changed"

3. "distribution" — user wants to see enrollment sizes or how trials are distributed by enrollment
   - Set distribution_dimension to "enrollment_count"
   - Set suggested_viz_type to "histogram"
   - Set comparison_dimension to null
   - Set time_dimension to null
   - Examples: "enrollment distribution", "enrollment sizes", "how big are trials", "trial sizes for X"

Extract entities from the user query:
- drug_name: intervention or drug name (null if not mentioned)
- condition: disease, condition, or indication (null if not mentioned)
- phase: a single trial phase only when the query explicitly filters to one phase (null when comparing across phases, showing trends over time, or showing enrollment distribution)

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
