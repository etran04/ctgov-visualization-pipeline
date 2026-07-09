import type { QueryEntities } from "../../src/domain/schemas/entities.js";

/** Default null entity modifiers for tests constructing partial query entities. */
export const EMPTY_ENTITY_MODIFIERS = {
  sponsor: null,
  country: null,
  start_year: null,
  end_year: null,
} as const satisfies Pick<
  QueryEntities,
  "sponsor" | "country" | "start_year" | "end_year"
>;

export function makeQueryEntities(
  overrides: Partial<QueryEntities>,
): QueryEntities {
  return {
    drug_name: null,
    comparison_targets: null,
    condition: null,
    phase: null,
    ...EMPTY_ENTITY_MODIFIERS,
    ...overrides,
  };
}
