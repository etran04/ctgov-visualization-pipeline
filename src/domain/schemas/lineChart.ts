import { z } from "zod";
import {
  ChartTitleSchema,
  OptionalCitationsSchema,
  QuantitativeTrialCountAxisSchema,
  TrialCountSchema,
} from "./shared.js";

const LineChartDataPointSchema = z.object({
  year: z.number().int(),
  trial_count: TrialCountSchema,
  citations: OptionalCitationsSchema,
});

export const LineChartVisualizationSchema = z.object({
  type: z.literal("line_chart"),
  title: ChartTitleSchema,
  encoding: z.object({
    x: z.object({
      field: z.literal("year"),
      type: z.literal("temporal"),
    }),
    y: QuantitativeTrialCountAxisSchema,
  }),
  data: z.array(LineChartDataPointSchema),
});
