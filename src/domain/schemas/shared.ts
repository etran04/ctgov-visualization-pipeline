import { z } from "zod";

export const CitationSchema = z.object({
  nct_id: z.string(),
  excerpt: z.string(),
});

export const TrialCountSchema = z.number().int().nonnegative();

export const OptionalCitationsSchema = z.array(CitationSchema).nullable().optional();

export const QuantitativeTrialCountAxisSchema = z.object({
  field: z.literal("trial_count"),
  type: z.literal("quantitative"),
});

export const ChartTitleSchema = z.string().min(1);
