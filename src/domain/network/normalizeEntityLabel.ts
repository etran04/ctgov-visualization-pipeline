import type { NetworkGraphFilters } from "./types.js";

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Lowercase slug with alphanumeric segments separated by hyphens.
 * Prevents collisions between entity types when prefixed in node IDs.
 */
export function slugifyEntityLabel(label: string): string {
  return collapseWhitespace(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildNodeId(entityType: string, label: string): string {
  return `${entityType}:${slugifyEntityLabel(label)}`;
}

/**
 * Normalize an intervention name for graph nodes.
 *
 * When `filters.drug_name` is set and the intervention contains that name
 * (case-insensitive), collapse to the filter label so variants like
 * "Pembrolizumab 2 mg/kg" merge with "Pembrolizumab".
 */
export function normalizeInterventionLabel(
  name: string,
  filters?: NetworkGraphFilters,
): string {
  let label = collapseWhitespace(name);
  const drugFilter = filters?.drug_name;

  if (drugFilter && label.toLowerCase().includes(drugFilter.toLowerCase())) {
    label = drugFilter;
  }

  return label;
}

/** Trim and collapse whitespace for non-intervention entity labels. */
export function normalizeEntityLabel(name: string): string {
  return collapseWhitespace(name);
}
