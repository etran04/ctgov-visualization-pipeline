import { mapDomainPhaseToCtgov } from "../../domain/mapPhaseValues.js";
import type { ValidatedEntities } from "../../domain/validateEntities.js";

export type CtgovQueryParams = Partial<
  Record<"query.intr" | "query.cond" | "filter.phase", string>
>;

export function mapQueryParams(entities: ValidatedEntities): CtgovQueryParams {
  const params: CtgovQueryParams = {};

  if (entities.drug_name !== null) {
    params["query.intr"] = entities.drug_name;
  }

  if (entities.condition !== null) {
    params["query.cond"] = entities.condition;
  }

  if (entities.phase !== null) {
    const ctgovPhase = mapDomainPhaseToCtgov(entities.phase);
    if (ctgovPhase !== null) {
      params["filter.phase"] = ctgovPhase;
    }
  }

  return params;
}
