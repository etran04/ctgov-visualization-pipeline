import { z } from "zod";
import {
  NETWORK_DIMENSION_VALUES,
  type NetworkDimension,
} from "../network/dimensions.js";

export { NETWORK_DIMENSION_VALUES, type NetworkDimension };

export const NetworkDimensionSchema = z
  .enum(NETWORK_DIMENSION_VALUES)
  .describe("Bipartite network topology rendered in the visualization.");
