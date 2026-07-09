import type { QueryEntities } from "./schemas/index.js";
import { InvalidParametersError } from "./errors.js";
import { MAX_STUDY_YEAR, MIN_STUDY_YEAR } from "./schemas/entityYears.js";
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

function normalizeYear(value: number | null, fieldName: string): number | null {
  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value)) {
    throw new InvalidParametersError(`${fieldName} must be an integer`);
  }

  if (value < MIN_STUDY_YEAR || value > MAX_STUDY_YEAR) {
    throw new InvalidParametersError(
      `${fieldName} must be between ${MIN_STUDY_YEAR} and ${MAX_STUDY_YEAR}`,
    );
  }

  return value;
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

function hasPrimaryFilter(entities: QueryEntities): boolean {
  return (
    entities.drug_name !== null ||
    (entities.comparison_targets !== null && entities.comparison_targets.length > 0) ||
    entities.condition !== null ||
    entities.phase !== null ||
    entities.sponsor !== null ||
    entities.country !== null
  );
}

/**
 * Normalize and validate LLM-extracted entities before downstream fetch.
 *
 * Trims string fields, rejects empty strings after trim, deduplicates
 * `comparison_targets` case-insensitively, validates year bounds, and requires
 * at least one primary filter (`drug_name`, `comparison_targets`, `condition`,
 * `phase`, `sponsor`, or `country`). `start_year` / `end_year` are optional
 * modifiers and do not satisfy the primary-filter requirement alone.
 *
 * @throws {InvalidParametersError} When a field is empty, years are invalid, or all primary filters are null.
 */
export function validateEntities(entities: QueryEntities): ValidatedEntities {
  const drug_name = normalizeNullableString(entities.drug_name, "drug_name");
  const comparison_targets = normalizeComparisonTargets(
    entities.comparison_targets ?? null,
  );
  const condition = normalizeNullableString(entities.condition, "condition");
  const phase = entities.phase;
  const sponsor = normalizeNullableString(entities.sponsor, "sponsor");
  const country = normalizeNullableString(entities.country, "country");
  const start_year = normalizeYear(entities.start_year, "start_year");
  const end_year = normalizeYear(entities.end_year, "end_year");

  if (
    drug_name !== null &&
    comparison_targets !== null &&
    comparison_targets.length >= MIN_GROUPED_TARGETS
  ) {
    throw new InvalidParametersError(
      "drug_name must be null when comparing multiple drugs via comparison_targets",
    );
  }

  if (start_year !== null && end_year !== null && start_year > end_year) {
    throw new InvalidParametersError("start_year cannot be after end_year");
  }

  const validated: ValidatedEntities = {
    drug_name,
    comparison_targets,
    condition,
    phase,
    sponsor,
    country,
    start_year,
    end_year,
  };

  if (!hasPrimaryFilter(validated)) {
    throw new InvalidParametersError(
      "At least one of drug_name, comparison_targets, condition, phase, sponsor, or country is required",
    );
  }

  return validated;
}
