import { z } from "zod";
import {
  ChartTitleSchema,
  OptionalCitationsSchema,
  QuantitativeTrialCountAxisSchema,
  TrialCountSchema,
} from "./shared.js";

const GroupedBarChartDataPointSchema = z.object({
  phase: z.string(),
  series: z.string(),
  trial_count: TrialCountSchema,
  citations: OptionalCitationsSchema,
});

export const GroupedBarChartVisualizationSchema = z.object({
  type: z.literal("grouped_bar_chart"),
  title: ChartTitleSchema,
  encoding: z.object({
    x: z.object({
      field: z.literal("phase"),
      type: z.literal("nominal"),
    }),
    y: QuantitativeTrialCountAxisSchema,
    color: z.object({
      field: z.literal("series"),
      type: z.literal("nominal"),
    }),
  }),
  data: z.array(GroupedBarChartDataPointSchema),
});
