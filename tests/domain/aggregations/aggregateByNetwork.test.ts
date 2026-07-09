import { describe, expect, it } from "vitest";
import { aggregateByNetwork } from "../../../src/domain/aggregations/aggregateByNetwork.js";
import { buildBipartiteGraph } from "../../../src/domain/network/buildBipartiteGraph.js";
import {
  validNetworkMultiInterventionStudy,
  validNetworkSingleInterventionStudy,
} from "../../fixtures/ctgovStudies.js";

describe("aggregateByNetwork", () => {
  it("delegates to buildBipartiteGraph for the requested dimension", () => {
    const studies = [validNetworkSingleInterventionStudy, validNetworkMultiInterventionStudy];
    const filters = { drug_name: "Pembrolizumab" };

    expect(aggregateByNetwork(studies, "drug_sponsor", filters)).toEqual(
      buildBipartiteGraph(studies, "drug_sponsor", filters),
    );
  });
});
