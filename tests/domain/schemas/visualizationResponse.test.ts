import { describe, expect, it } from "vitest";
import { VisualizationResponseSchema } from "../../../src/domain/schemas/index.js";

describe("VisualizationResponseSchema", () => {
  it("accepts a sample network_graph response", () => {
    const response = {
      visualization: {
        type: "network_graph",
        title: "Drug–sponsor network for Pembrolizumab",
        encoding: {
          nodes: {
            id: { field: "id", type: "nominal" },
            label: { field: "label", type: "nominal" },
            entity_type: { field: "entity_type", type: "nominal" },
          },
          edges: {
            source: { field: "source", type: "nominal" },
            target: { field: "target", type: "nominal" },
            weight: { field: "weight", type: "quantitative" },
          },
        },
        data: {
          nodes: [
            {
              id: "drug:pembrolizumab",
              label: "Pembrolizumab",
              entity_type: "drug",
            },
            {
              id: "sponsor:merck-sharp-dohme-llc",
              label: "Merck Sharp & Dohme LLC",
              entity_type: "sponsor",
            },
          ],
          edges: [
            {
              source: "drug:pembrolizumab",
              target: "sponsor:merck-sharp-dohme-llc",
              weight: 12,
            },
          ],
        },
      },
      meta: {
        filters: { drug_name: "Pembrolizumab", condition: null, phase: null },
        network_dimension: "drug_sponsor",
        source: "clinicaltrials.gov",
        fetched_studies: 120,
        skipped_malformed: 3,
        studies_with_multiple_phases: 0,
        truncated: false,
      },
    };

    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});
