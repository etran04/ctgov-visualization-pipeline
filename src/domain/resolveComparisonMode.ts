import { InvalidParametersError } from "./errors.js";
import type { ValidatedEntities } from "./validateEntities.js";

export const MIN_GROUPED_TARGETS = 2;
export const MAX_GROUPED_TARGETS = 4;

/** Filters shared across every series in a grouped drug comparison fetch. */
export type GroupedComparisonSharedFilters = Pick<
  ValidatedEntities,
  "condition" | "phase" | "sponsor" | "country" | "start_year" | "end_year"
>;

export type ComparisonMode =
  | { kind: "single"; entities: ValidatedEntities }
  | {
      kind: "grouped";
      targets: string[];
      sharedFilters: GroupedComparisonSharedFilters;
    };

/**
 * Route a validated comparison request to single-drug or grouped-drug mode.
 *
 * Grouped mode requires 2–4 unique comparison targets. Single mode uses
 * `drug_name` or a sole comparison target as the intervention filter.
 */
export function resolveComparisonMode(entities: ValidatedEntities): ComparisonMode {
  const targets = entities.comparison_targets;

  if (targets !== null && targets.length >= MIN_GROUPED_TARGETS) {
    if (targets.length > MAX_GROUPED_TARGETS) {
      throw new InvalidParametersError(
        `comparison_targets must contain at most ${MAX_GROUPED_TARGETS} unique drugs`,
      );
    }

    if (entities.drug_name !== null) {
      throw new InvalidParametersError(
        "drug_name must be null when comparing multiple drugs via comparison_targets",
      );
    }

    return {
      kind: "grouped",
      targets,
      sharedFilters: {
        condition: entities.condition,
        phase: entities.phase,
        sponsor: entities.sponsor,
        country: entities.country,
        start_year: entities.start_year,
        end_year: entities.end_year,
      },
    };
  }

  const drugName =
    entities.drug_name ?? (targets !== null && targets.length === 1 ? targets[0] : null);

  return {
    kind: "single",
    entities: {
      drug_name: drugName,
      comparison_targets: null,
      condition: entities.condition,
      phase: entities.phase,
      sponsor: entities.sponsor,
      country: entities.country,
      start_year: entities.start_year,
      end_year: entities.end_year,
    },
  };
}
