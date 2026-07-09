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
              citations: [
                {
                  nct_id: "NCT03615326",
                  excerpt: "Study of Pembrolizumab in Advanced Melanoma",
                },
              ],
            },
          ],
        },
      },
      meta: {
        filters: {
          drug_name: "Pembrolizumab",
          comparison_targets: null,
          condition: null,
          phase: null,
          sponsor: null,
          country: null,
          start_year: null,
          end_year: null,
        },
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

  it("accepts a sample bar_chart response with citations", () => {
    const response = {
      visualization: {
        type: "bar_chart",
        title: "Trial phases for Pembrolizumab",
        encoding: {
          x: { field: "phase", type: "nominal" },
          y: { field: "trial_count", type: "quantitative" },
        },
        data: [
          { phase: "Phase 1", trial_count: 0 },
          {
            phase: "Phase 2",
            trial_count: 2,
            citations: [
              { nct_id: "NCT00000001", excerpt: "A Phase 2 Study of Pembrolizumab" },
              { nct_id: "NCT00000002", excerpt: "Pembrolizumab Combination Trial" },
            ],
          },
        ],
      },
      meta: {
        filters: {
          drug_name: "Pembrolizumab",
          comparison_targets: null,
          condition: null,
          phase: null,
          sponsor: null,
          country: null,
          start_year: null,
          end_year: null,
        },
        source: "clinicaltrials.gov",
        fetched_studies: 2,
        skipped_malformed: 0,
        studies_with_multiple_phases: 0,
        truncated: false,
      },
    };

    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});
