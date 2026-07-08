import { z } from "zod";
import {
  ChartTitleSchema,
  OptionalCitationsSchema,
  QuantitativeTrialCountAxisSchema,
  TrialCountSchema,
} from "./shared.js";

const BarChartDataPointSchema = z.object({
  phase: z.string(),
  trial_count: TrialCountSchema,
  citations: OptionalCitationsSchema,
});

export const BarChartVisualizationSchema = z.object({
  type: z.literal("bar_chart"),
  title: ChartTitleSchema,
  encoding: z.object({
    x: z.object({
      field: z.literal("phase"),
      type: z.literal("nominal"),
    }),
    y: QuantitativeTrialCountAxisSchema,
  }),
  data: z.array(BarChartDataPointSchema),
});
