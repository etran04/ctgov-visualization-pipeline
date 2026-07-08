import { z } from "zod";
import { ChartTitleSchema, OptionalCitationsSchema } from "./shared.js";

const ScatterplotDataPointSchema = z.object({
  nct_id: z.string(),
  enrollment_count: z.number().int().min(1),
  year: z.number().int(),
  citations: OptionalCitationsSchema,
});

export const ScatterplotVisualizationSchema = z.object({
  type: z.literal("scatterplot"),
  title: ChartTitleSchema,
  encoding: z.object({
    x: z.object({
      field: z.literal("enrollment_count"),
      type: z.literal("quantitative"),
    }),
    y: z.object({
      field: z.literal("year"),
      type: z.literal("temporal"),
    }),
  }),
  data: z.array(ScatterplotDataPointSchema),
});
