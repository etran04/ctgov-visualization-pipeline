import { mapDomainPhaseToCtgov } from "../../domain/mappings/phases.js";
import type { ValidatedEntities } from "../../domain/validateEntities.js";
import { buildStartDateRangeFilter } from "./buildStartDateRangeFilter.js";

export type CtgovQueryParams = Partial<
  Record<
    | "query.intr"
    | "query.cond"
    | "query.spons"
    | "query.locn"
    | "filter.phase"
    | "filter.advanced",
    string
  >
>;

/**
 * Map validated domain entities to ClinicalTrials.gov v2 query parameters.
 *
 * - `drug_name` → `query.intr`
 * - `condition` → `query.cond`
 * - `sponsor` → `query.spons`
 * - `country` → `query.locn`
 * - `phase` → `filter.phase` (domain label converted to API enum)
 * - `start_year` / `end_year` → `filter.advanced` start-date range
 */
export function mapQueryParams(entities: ValidatedEntities): CtgovQueryParams {
  const params: CtgovQueryParams = {};

  if (entities.drug_name !== null) {
    params["query.intr"] = entities.drug_name;
  }

  if (entities.condition !== null) {
    params["query.cond"] = entities.condition;
  }

  if (entities.sponsor !== null) {
    params["query.spons"] = entities.sponsor;
  }

  if (entities.country !== null) {
    params["query.locn"] = entities.country;
  }

  if (entities.phase !== null) {
    const ctgovPhase = mapDomainPhaseToCtgov(entities.phase);
    if (ctgovPhase !== null) {
      params["filter.phase"] = ctgovPhase;
    }
  }

  const startDateFilter = buildStartDateRangeFilter(
    entities.start_year,
    entities.end_year,
  );
  if (startDateFilter !== null) {
    params["filter.advanced"] = startDateFilter;
  }

  return params;
}
