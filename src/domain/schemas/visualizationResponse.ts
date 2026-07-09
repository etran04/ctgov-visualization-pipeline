import { z } from "zod";
import { BarChartVisualizationSchema } from "./barChart.js";
import { GroupedBarChartVisualizationSchema } from "./groupedBarChart.js";
import { HistogramVisualizationSchema } from "./histogram.js";
import { LineChartVisualizationSchema } from "./lineChart.js";
import { NetworkGraphVisualizationSchema } from "./networkGraph.js";
import { ScatterplotVisualizationSchema } from "./scatterplot.js";
import { VisualizationMetaSchema } from "./visualizationMeta.js";

/** Successful `POST /visualize` response. Validated before serialization. */
export const VisualizationResponseSchema = z.object({
  visualization: z.discriminatedUnion("type", [
    BarChartVisualizationSchema,
    GroupedBarChartVisualizationSchema,
    LineChartVisualizationSchema,
    HistogramVisualizationSchema,
    ScatterplotVisualizationSchema,
    NetworkGraphVisualizationSchema,
  ]),
  meta: VisualizationMetaSchema,
});

export type VisualizationResponse = z.infer<typeof VisualizationResponseSchema>;
