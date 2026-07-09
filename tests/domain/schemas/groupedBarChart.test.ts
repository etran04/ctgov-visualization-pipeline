import { describe, expect, it } from "vitest";
import { GroupedBarChartVisualizationSchema } from "../../../src/domain/schemas/groupedBarChart.js";
import { VisualizationMetaSchema } from "../../../src/domain/schemas/visualizationMeta.js";
import { parseQueryInterpretation } from "../../../src/domain/schemas/interpretation.js";

describe("GroupedBarChartVisualizationSchema", () => {
  it("accepts a sample grouped bar chart visualization", () => {
    const visualization = {
      type: "grouped_bar_chart",
      title: "Trial phases: Metformin vs Pembrolizumab",
      encoding: {
        x: { field: "phase", type: "nominal" },
        y: { field: "trial_count", type: "quantitative" },
        color: { field: "series", type: "nominal" },
      },
      data: [
        {
          phase: "Phase 1",
          series: "Metformin",
          trial_count: 120,
          citations: [{ nct_id: "NCT00000001", excerpt: "Metformin Phase 1 Study" }],
        },
        { phase: "Phase 1", series: "Pembrolizumab", trial_count: 1031 },
        { phase: "Phase 2", series: "Metformin", trial_count: 85 },
        { phase: "Phase 2", series: "Pembrolizumab", trial_count: 400 },
      ],
    };

    expect(GroupedBarChartVisualizationSchema.parse(visualization)).toEqual(visualization);
  });
});

describe("VisualizationMetaSchema grouped comparison fields", () => {
  it("accepts comparison_targets and comparison_dimension", () => {
    const meta = {
      filters: {
        drug_name: null,
        comparison_targets: null,
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      comparison_targets: ["Metformin", "Pembrolizumab"],
      comparison_dimension: "phase",
      source: "clinicaltrials.gov",
      fetched_studies: 5600,
      skipped_malformed: 12,
      studies_with_multiple_phases: 508,
      truncated: false,
    };

    expect(VisualizationMetaSchema.parse(meta)).toEqual(meta);
  });
});

describe("parseQueryInterpretation grouped comparison", () => {
  it("parses grouped_bar_chart comparison interpretation", () => {
    const interpretation = parseQueryInterpretation({
      intent: "comparison",
      entities: {
        drug_name: null,
        comparison_targets: ["Metformin", "Pembrolizumab"],
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      comparison_dimension: "phase",
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: null,
      suggested_viz_type: "grouped_bar_chart",
    });

    expect(interpretation).toEqual({
      intent: "comparison",
      entities: {
        drug_name: null,
        comparison_targets: ["Metformin", "Pembrolizumab"],
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      comparison_dimension: "phase",
      suggested_viz_type: "grouped_bar_chart",
    });
  });
});
