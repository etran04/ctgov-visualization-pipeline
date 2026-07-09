import { z } from "zod";

export const NETWORK_DIMENSIONS = ["drug_sponsor"] as const;

export type NetworkDimension = (typeof NETWORK_DIMENSIONS)[number];

export const NetworkDimensionSchema = z
  .enum(NETWORK_DIMENSIONS)
  .describe("Bipartite network topology rendered in the visualization.");
