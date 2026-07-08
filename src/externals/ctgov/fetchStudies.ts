import { config } from "../../config.js";
import type {
  CtgovStudyRecord,
  DistributionStudyRecord,
  PhaseStudyRecord,
  StudyRecordForIntent,
  TimelineStudyRecord,
} from "../../domain/types/ctgovStudyTypes.js";
import { HTTP_STATUS, NoStudiesFoundError, UpstreamApiError } from "../../domain/errors.js";
import type { Intent } from "../../domain/schemas/intents.js";
import { parseStudyStartYear } from "../../domain/utils/parseStudyDate.js";
import { parseEnrollmentCount } from "../../domain/utils/parseEnrollmentCount.js";
import type { ValidatedEntities } from "../../domain/validateEntities.js";
import { logger } from "../../lib/logger.js";
import { mapQueryParams } from "./mapQueryParams.js";

/** Minimal CT.gov field set for phase aggregation (V1 default). */
export const DEFAULT_CTGOV_FIELDS = ["NCTId", "Phase"] as const;

export type { CtgovStudyRecord, DistributionStudyRecord, PhaseStudyRecord, TimelineStudyRecord };

export type FetchStudiesOptions<I extends Intent = "comparison"> = {
  intent?: I;
  fields?: readonly string[];
};

type CtgovStudiesResponse = {
  studies?: unknown;
  nextPageToken?: unknown;
};

/** Result of a paginated CT.gov studies fetch. */
export type FetchStudiesResult<T extends CtgovStudyRecord = CtgovStudyRecord> = {
  studies: T[];
  pages_fetched: number;
  /** Studies dropped during response normalization (missing required fields). */
  skipped_malformed: number;
  /** True when `CTGOV_MAX_PAGES` was reached before pagination completed. */
  truncated: boolean;
};

function isRetriableStatus(status: number): boolean {
  return status === HTTP_STATUS.TOO_MANY_REQUESTS || status >= HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

function backoffDelayMs(attempt: number): number {
  return Math.min(250 * 2 ** (attempt - 1), 4000);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function extractNctId(study: Record<string, unknown>): string | null {
  const protocolSection = study.protocolSection;
  if (typeof protocolSection !== "object" || protocolSection === null) {
    return null;
  }

  const identificationModule = (protocolSection as Record<string, unknown>).identificationModule;
  if (typeof identificationModule !== "object" || identificationModule === null) {
    return null;
  }

  const nctId = (identificationModule as Record<string, unknown>).nctId;
  return typeof nctId === "string" ? nctId : null;
}

function normalizePhases(designModule: unknown): string[] | null {
  if (typeof designModule !== "object" || designModule === null) {
    return null;
  }

  const phases = (designModule as Record<string, unknown>).phases;
  if (!Array.isArray(phases)) {
    return null;
  }

  const normalizedPhases = phases.filter((phase): phase is string => typeof phase === "string");
  if (normalizedPhases.length === 0) {
    return null;
  }

  return normalizedPhases;
}

function normalizeStartDate(statusModule: unknown): string | null {
  if (typeof statusModule !== "object" || statusModule === null) {
    return null;
  }

  const startDateStruct = (statusModule as Record<string, unknown>).startDateStruct;
  if (typeof startDateStruct !== "object" || startDateStruct === null) {
    return null;
  }

  const date = (startDateStruct as Record<string, unknown>).date;
  if (typeof date !== "string" || parseStudyStartYear(date) === null) {
    return null;
  }

  return date;
}

function normalizePhaseStudy(study: unknown): PhaseStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const nctId = extractNctId(rawStudy);
  if (nctId === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const phases = normalizePhases(protocolSection.designModule);
  if (phases === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule: { nctId },
      designModule: { phases },
    },
  };
}

function normalizeTimelineStudy(study: unknown): TimelineStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const nctId = extractNctId(rawStudy);
  if (nctId === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const date = normalizeStartDate(protocolSection.statusModule);
  if (date === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule: { nctId },
      statusModule: {
        startDateStruct: { date },
      },
    },
  };
}

function normalizeEnrollmentCount(designModule: unknown): number | null {
  if (typeof designModule !== "object" || designModule === null) {
    return null;
  }

  const enrollmentInfo = (designModule as Record<string, unknown>).enrollmentInfo;
  if (typeof enrollmentInfo !== "object" || enrollmentInfo === null) {
    return null;
  }

  return parseEnrollmentCount((enrollmentInfo as Record<string, unknown>).count);
}

function normalizeDistributionStudy(study: unknown): DistributionStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const nctId = extractNctId(rawStudy);
  if (nctId === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const count = normalizeEnrollmentCount(protocolSection.designModule);
  if (count === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule: { nctId },
      designModule: {
        enrollmentInfo: { count },
      },
    },
  };
}

function normalizeStudy(
  study: unknown,
  requestedFields: readonly string[],
): CtgovStudyRecord | null {
  const fieldSet = new Set(requestedFields);

  if (fieldSet.has("Phase")) {
    return normalizePhaseStudy(study);
  }

  if (fieldSet.has("StartDate")) {
    return normalizeTimelineStudy(study);
  }

  if (fieldSet.has("EnrollmentCount")) {
    return normalizeDistributionStudy(study);
  }

  return null;
}

async function requestStudies(url: URL): Promise<CtgovStudiesResponse> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < config.CTGOV_RETRY_ATTEMPTS) {
    attempt += 1;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (isRetriableStatus(response.status) && attempt < config.CTGOV_RETRY_ATTEMPTS) {
          await sleep(backoffDelayMs(attempt));
          continue;
        }

        throw new UpstreamApiError(`ClinicalTrials.gov returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as CtgovStudiesResponse;
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < config.CTGOV_RETRY_ATTEMPTS) {
        await sleep(backoffDelayMs(attempt));
        continue;
      }
    }
  }

  const message =
    lastError instanceof Error
      ? `ClinicalTrials.gov request failed after retries: ${lastError.message}`
      : "ClinicalTrials.gov request failed after retries";
  throw new UpstreamApiError(message);
}

/**
 * Fetch clinical trial studies from ClinicalTrials.gov matching validated entities.
 *
 * Paginates through `/studies` until no `nextPageToken` or `CTGOV_MAX_PAGES` is
 * reached. Malformed records are skipped rather than failing the request.
 * No implicit study-type or status filters are applied.
 *
 * @param entities - Validated query filters mapped to CT.gov params.
 * @param options.intent - Visualization intent; narrows the returned study record type.
 * @param options.fields - Override requested fields (defaults to `DEFAULT_CTGOV_FIELDS`).
 * @throws {NoStudiesFoundError} When zero valid studies are returned.
 * @throws {UpstreamApiError} When requests fail after retries.
 */
export async function fetchStudies<I extends Intent = "comparison">(
  entities: ValidatedEntities,
  options: FetchStudiesOptions<I> = {},
): Promise<FetchStudiesResult<StudyRecordForIntent<I>>> {
  const queryParams = mapQueryParams(entities);
  const requestedFields = options.fields ?? DEFAULT_CTGOV_FIELDS;
  const fields = requestedFields.join(",");

  const studies: CtgovStudyRecord[] = [];
  let pagesFetched = 0;
  let skippedMalformed = 0;
  let pageToken: string | null = null;
  let truncated = false;

  while (pagesFetched < config.CTGOV_MAX_PAGES) {
    const url = new URL(`${config.CTGOV_BASE_URL}/studies`);
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("pageSize", String(config.CTGOV_PAGE_SIZE));
    url.searchParams.set("fields", fields);
    if (pageToken !== null) {
      url.searchParams.set("pageToken", pageToken);
    }

    const payload = await requestStudies(url);
    pagesFetched += 1;

    const pageStudies = Array.isArray(payload.studies) ? payload.studies : [];
    for (const study of pageStudies) {
      const normalized = normalizeStudy(study, requestedFields);
      if (normalized === null) {
        skippedMalformed += 1;
        continue;
      }
      studies.push(normalized);
    }

    const nextPageToken =
      typeof payload.nextPageToken === "string" && payload.nextPageToken.length > 0
        ? payload.nextPageToken
        : null;

    if (nextPageToken === null) {
      break;
    }

    pageToken = nextPageToken;
  }

  if (studies.length === 0) {
    throw new NoStudiesFoundError("ClinicalTrials.gov returned no studies for the provided filters");
  }

  if (pageToken !== null && pagesFetched >= config.CTGOV_MAX_PAGES) {
    truncated = true;
  }

  logger.info(
    {
      pages_fetched: pagesFetched,
      fetched_studies: studies.length,
      skipped_malformed: skippedMalformed,
      truncated,
    },
    "Fetched studies from ClinicalTrials.gov",
  );

  return {
    studies,
    pages_fetched: pagesFetched,
    skipped_malformed: skippedMalformed,
    truncated,
  } as FetchStudiesResult<StudyRecordForIntent<I>>;
}
