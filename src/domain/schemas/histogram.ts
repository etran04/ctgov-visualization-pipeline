import { z } from "zod";
import {
  ChartTitleSchema,
  OptionalCitationsSchema,
  QuantitativeTrialCountAxisSchema,
  TrialCountSchema,
} from "./shared.js";

const HistogramDataPointSchema = z.object({
  bin_label: z.string(),
  bin_start: z.number().int().min(1),
  bin_end: z.number().int().min(1).nullable(),
  trial_count: TrialCountSchema,
  citations: OptionalCitationsSchema,
});

export const HistogramVisualizationSchema = z.object({
  type: z.literal("histogram"),
  title: ChartTitleSchema,
  encoding: z.object({
    x: z.object({
      field: z.literal("bin_label"),
      type: z.literal("ordinal"),
    }),
    y: QuantitativeTrialCountAxisSchema,
  }),
  data: z.array(HistogramDataPointSchema),
});
