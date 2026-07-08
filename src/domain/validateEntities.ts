import type { QueryEntities } from "./schemas/index.js";
import { InvalidParametersError } from "./errors.js";

export type ValidatedEntities = QueryEntities;

function normalizeNullableString(value: string | null, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidParametersError(`${fieldName} cannot be empty`);
  }

  return trimmed;
}

/**
 * Normalize and validate LLM-extracted entities before downstream fetch.
 *
 * Trims string fields, rejects empty strings after trim, and requires at
 * least one of `drug_name`, `condition`, or `phase` to be non-null.
 *
 * @throws {InvalidParametersError} When a string field is empty or all filters are null.
 */
export function validateEntities(entities: QueryEntities): ValidatedEntities {
  const validated: ValidatedEntities = {
    drug_name: normalizeNullableString(entities.drug_name, "drug_name"),
    condition: normalizeNullableString(entities.condition, "condition"),
    phase: entities.phase,
  };

  if (
    validated.drug_name === null &&
    validated.condition === null &&
    validated.phase === null
  ) {
    throw new InvalidParametersError(
      "At least one of drug_name, condition, or phase is required",
    );
  }

  return validated;
}
