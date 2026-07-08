const ISO_DATE_PATTERN = /^(\d{4})-\d{2}(?:-\d{2})?$/;
const YEAR_ONLY_PATTERN = /^(\d{4})$/;
const MONTH_YEAR_PATTERN = /^[A-Za-z]+\s+(\d{4})$/;

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1900 && year <= 2100;
}

/**
 * Extract a calendar year from a CT.gov `startDateStruct.date` string.
 *
 * Supports common formats such as `2024-01-15`, `2024-01`, `2024`, and
 * `January 2024`. Returns `null` for missing, empty, or unparseable values.
 */
export function parseStudyStartYear(date: unknown): number | null {
  if (typeof date !== "string") {
    return null;
  }

  const trimmed = date.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const isoMatch = ISO_DATE_PATTERN.exec(trimmed);
  if (isoMatch !== null) {
    const year = Number.parseInt(isoMatch[1], 10);
    return isValidYear(year) ? year : null;
  }

  const yearOnlyMatch = YEAR_ONLY_PATTERN.exec(trimmed);
  if (yearOnlyMatch !== null) {
    const year = Number.parseInt(yearOnlyMatch[1], 10);
    return isValidYear(year) ? year : null;
  }

  const monthYearMatch = MONTH_YEAR_PATTERN.exec(trimmed);
  if (monthYearMatch !== null) {
    const year = Number.parseInt(monthYearMatch[1], 10);
    return isValidYear(year) ? year : null;
  }

  return null;
}
