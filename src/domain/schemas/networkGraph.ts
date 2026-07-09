import { z } from "zod";
import { ChartTitleSchema, OptionalCitationsSchema } from "./shared.js";

const NominalFieldSchema = z.object({
  field: z.string(),
  type: z.literal("nominal"),
});

const QuantitativeFieldSchema = z.object({
  field: z.string(),
  type: z.literal("quantitative"),
});

const NetworkNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  entity_type: z.string(),
});

const NetworkEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  weight: z.number().int().min(1),
  citations: OptionalCitationsSchema,
});

export const NetworkGraphVisualizationSchema = z.object({
  type: z.literal("network_graph"),
  title: ChartTitleSchema,
  encoding: z.object({
    nodes: z.object({
      id: NominalFieldSchema,
      label: NominalFieldSchema,
      entity_type: NominalFieldSchema,
    }),
    edges: z.object({
      source: NominalFieldSchema,
      target: NominalFieldSchema,
      weight: QuantitativeFieldSchema,
    }),
  }),
  data: z.object({
    nodes: z.array(NetworkNodeSchema),
    edges: z.array(NetworkEdgeSchema),
  }),
});
