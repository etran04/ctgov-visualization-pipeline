import type { QueryEntities } from "./schemas/index.js";
import { InvalidParametersError } from "./errors.js";
import { MAX_GROUPED_TARGETS, MIN_GROUPED_TARGETS } from "./resolveComparisonMode.js";

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

function normalizeComparisonTargets(
  targets: string[] | null,
): string[] | null {
  if (targets === null) {
    return null;
  }

  const normalized: string[] = [];
  const seenLowercase = new Set<string>();

  for (const [index, target] of targets.entries()) {
    const trimmed = target.trim();
    if (trimmed.length === 0) {
      throw new InvalidParametersError(
        `comparison_targets[${index}] cannot be empty`,
      );
    }

    const key = trimmed.toLowerCase();
    if (seenLowercase.has(key)) {
      continue;
    }

    seenLowercase.add(key);
    normalized.push(trimmed);
  }

  if (normalized.length > MAX_GROUPED_TARGETS) {
    throw new InvalidParametersError(
      `comparison_targets must contain at most ${MAX_GROUPED_TARGETS} unique drugs`,
    );
  }

  return normalized.length === 0 ? null : normalized;
}

/**
 * Normalize and validate LLM-extracted entities before downstream fetch.
 *
 * Trims string fields, rejects empty strings after trim, deduplicates
 * `comparison_targets` case-insensitively, and requires at least one of
 * `drug_name`, `comparison_targets`, `condition`, or `phase` to be non-null.
 *
 * @throws {InvalidParametersError} When a string field is empty or all filters are null.
 */
export function validateEntities(entities: QueryEntities): ValidatedEntities {
  const drug_name = normalizeNullableString(entities.drug_name, "drug_name");
  const comparison_targets = normalizeComparisonTargets(
    entities.comparison_targets ?? null,
  );
  const condition = normalizeNullableString(entities.condition, "condition");
  const phase = entities.phase;

  if (
    drug_name !== null &&
    comparison_targets !== null &&
    comparison_targets.length >= MIN_GROUPED_TARGETS
  ) {
    throw new InvalidParametersError(
      "drug_name must be null when comparing multiple drugs via comparison_targets",
    );
  }

  const validated: ValidatedEntities = {
    drug_name,
    comparison_targets,
    condition,
    phase,
  };

  if (
    validated.drug_name === null &&
    validated.comparison_targets === null &&
    validated.condition === null &&
    validated.phase === null
  ) {
    throw new InvalidParametersError(
      "At least one of drug_name, comparison_targets, condition, or phase is required",
    );
  }

  return validated;
}
