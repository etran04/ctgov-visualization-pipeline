import { MAX_CITATIONS_PER_DATUM } from "../citations/buildCitations.js";
import type { NetworkDimension } from "../network/dimensions.js";
import type { VisualizationType } from "../intents/visualizationType.js";

export type BuildAssumptionsInput = {
  visualizationType: VisualizationType;
  truncated: boolean;
  skippedMalformed: number;
  studiesWithMultiplePhases: number;
  comparisonTargets?: string[];
  networkDimension?: NetworkDimension;
};

/**
 * Human-readable notes about interpretation, aggregation policy, and data caveats.
 */
export function buildAssumptions(input: BuildAssumptionsInput): string[] {
  const assumptions: string[] = [
    "Query intent and entity filters were interpreted by the LLM and validated before fetching from ClinicalTrials.gov.",
    `Citations are capped at ${MAX_CITATIONS_PER_DATUM} per datum; excerpts use BriefTitle from fetched studies.`,
  ];

  switch (input.visualizationType) {
    case "bar_chart":
      assumptions.push(
        "Phase bins are zero-filled across all six standard categories; multi-phase studies may appear in multiple bins.",
      );
      break;
    case "grouped_bar_chart":
      assumptions.push(
        `Compared ${input.comparisonTargets?.length ?? 0} drugs in parallel with shared filters; phase bins are zero-filled per series.`,
      );
      break;
    case "line_chart":
      assumptions.push(
        "Year bins span the minimum to maximum start year in fetched studies; gap years are zero-filled.",
      );
      break;
    case "histogram":
      assumptions.push(
        "Enrollment uses six fixed bins; each study maps to exactly one bin.",
      );
      break;
    case "scatterplot":
      assumptions.push(
        "One scatterplot point per valid study; no binning or zero-fill.",
      );
      break;
    case "network_graph":
      assumptions.push(
        `Network topology is ${input.networkDimension ?? "drug_sponsor"}; edge weight counts trials per intervention–sponsor pair.`,
      );
      break;
  }

  if (input.studiesWithMultiplePhases > 0) {
    assumptions.push(
      "Some studies list multiple phases and are counted in every applicable phase bin.",
    );
  }

  if (input.skippedMalformed > 0) {
    assumptions.push(
      "Some fetched studies were skipped due to missing or invalid required fields.",
    );
  }

  if (input.truncated) {
    assumptions.push(
      "CT.gov pagination limit reached; counts and citations reflect the fetched subset only.",
    );
  }

  return assumptions;
}
