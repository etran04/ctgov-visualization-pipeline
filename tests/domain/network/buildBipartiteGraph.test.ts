import { describe, expect, it } from "vitest";
import { buildBipartiteGraph } from "../../../src/domain/network/buildBipartiteGraph.js";
import { NoAggregatableDataError } from "../../../src/domain/errors.js";
import {
  asNetworkStudy,
  malformedNetworkStudyEmptyInterventions,
  malformedNetworkStudyMissingNctId,
  malformedNetworkStudyMissingSponsor,
  validNetworkComboTrialStudy,
  validNetworkMultiInterventionStudy,
  validNetworkSamePairSecondStudy,
  validNetworkSingleInterventionStudy,
} from "../../fixtures/ctgovStudies.js";

describe("buildBipartiteGraph", () => {
  it("accumulates edge weight for repeated drug-sponsor pairs across studies", () => {
    const result = buildBipartiteGraph(
      [validNetworkSingleInterventionStudy, validNetworkSamePairSecondStudy],
      "drug_sponsor",
      { drug_name: "Pembrolizumab" },
    );

    expect(result.nodes).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toEqual([
      {
        source: "drug:pembrolizumab",
        target: "sponsor:merck-sharp-dohme-llc",
        weight: 2,
        source_nct_ids: ["NCT00000401", "NCT00000403"],
      },
    ]);
    expect(result.skipped_malformed).toBe(0);
  });

  it("deduplicates nodes and creates one edge per intervention in multi-intervention studies", () => {
    const result = buildBipartiteGraph([validNetworkMultiInterventionStudy], "drug_sponsor");

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        {
          id: "drug:pembrolizumab",
          label: "Pembrolizumab",
          entity_type: "drug",
        },
        {
          id: "drug:carboplatin",
          label: "Carboplatin",
          entity_type: "drug",
        },
        {
          id: "sponsor:national-cancer-institute",
          label: "National Cancer Institute",
          entity_type: "sponsor",
        },
      ]),
    );
    expect(result.edges).toHaveLength(2);
    expect(result.edges).toEqual(
      expect.arrayContaining([
        {
          source: "drug:pembrolizumab",
          target: "sponsor:national-cancer-institute",
          weight: 1,
          source_nct_ids: ["NCT00000402"],
        },
        {
          source: "drug:carboplatin",
          target: "sponsor:national-cancer-institute",
          weight: 1,
          source_nct_ids: ["NCT00000402"],
        },
      ]),
    );
  });

  it("collapses intervention labels to the drug filter when the name contains it", () => {
    const result = buildBipartiteGraph([validNetworkSamePairSecondStudy], "drug_sponsor", {
      drug_name: "Pembrolizumab",
    });

    expect(result.nodes).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(result.nodes).toHaveLength(2);
  });

  it("creates separate edges for each drug in combo trials", () => {
    const result = buildBipartiteGraph([validNetworkComboTrialStudy], "drug_sponsor");

    expect(result.edges).toHaveLength(3);
    expect(result.edges.every((edge) => edge.target === "sponsor:acme-pharma-inc")).toBe(true);
    expect(result.edges.map((edge) => edge.source).sort()).toEqual([
      "drug:drug-a",
      "drug:drug-b",
      "drug:placebo",
    ]);
  });

  it("skips malformed studies and reports how many were skipped", () => {
    const result = buildBipartiteGraph(
      [
        validNetworkSingleInterventionStudy,
        asNetworkStudy(malformedNetworkStudyMissingSponsor),
        malformedNetworkStudyEmptyInterventions,
        malformedNetworkStudyMissingNctId,
      ],
      "drug_sponsor",
    );

    expect(result.edges).toHaveLength(1);
    expect(result.skipped_malformed).toBe(3);
  });

  it("throws when the input study list is empty", () => {
    expect(() => buildBipartiteGraph([], "drug_sponsor")).toThrow(NoAggregatableDataError);
  });

  it("throws when every study is malformed", () => {
    expect(() =>
      buildBipartiteGraph(
        [
          asNetworkStudy(malformedNetworkStudyMissingSponsor),
          malformedNetworkStudyEmptyInterventions,
          malformedNetworkStudyMissingNctId,
        ],
        "drug_sponsor",
      ),
    ).toThrow(NoAggregatableDataError);
  });
});
