import { z } from "zod";
import { BarChartVisualizationSchema } from "./barChart.js";
import { HistogramVisualizationSchema } from "./histogram.js";
import { LineChartVisualizationSchema } from "./lineChart.js";
import { VisualizationMetaSchema } from "./visualizationMeta.js";

/** Successful `POST /visualize` response. Validated before serialization. */
export const VisualizationResponseSchema = z.object({
  visualization: z.discriminatedUnion("type", [
    BarChartVisualizationSchema,
    LineChartVisualizationSchema,
    HistogramVisualizationSchema,
  ]),
  meta: VisualizationMetaSchema,
});

export type VisualizationResponse = z.infer<typeof VisualizationResponseSchema>;
