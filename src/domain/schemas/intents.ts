import { z } from "zod";

export const SUPPORTED_INTENTS = ["comparison", "trend_over_time", "distribution"] as const;

export type Intent = (typeof SUPPORTED_INTENTS)[number];

export const IntentSchema = z
  .enum(SUPPORTED_INTENTS)
  .describe("The visualization intent inferred from the user query.");
