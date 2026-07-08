import { config } from "../../config.js";
import { HTTP_STATUS, NoStudiesFoundError, UpstreamApiError } from "../../domain/errors.js";
import type { ValidatedEntities } from "../../domain/validateEntities.js";
import { logger } from "../../lib/logger.js";
import { mapQueryParams } from "./mapQueryParams.js";

const DEFAULT_FIELDS = ["NCTId", "Phase"] as const;

type CtgovStudy = {
  protocolSection: {
    identificationModule: {
      nctId: string;
    };
    designModule: {
      phases: string[];
    };
  };
};

type CtgovStudiesResponse = {
  studies?: unknown;
  nextPageToken?: unknown;
};

export type FetchStudiesResult = {
  studies: CtgovStudy[];
  pages_fetched: number;
  skipped_malformed: number;
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

function normalizeStudy(study: unknown): CtgovStudy | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const protocolSection = (study as Record<string, unknown>).protocolSection;
  if (typeof protocolSection !== "object" || protocolSection === null) {
    return null;
  }

  const identificationModule = (protocolSection as Record<string, unknown>).identificationModule;
  const designModule = (protocolSection as Record<string, unknown>).designModule;
  if (
    typeof identificationModule !== "object" ||
    identificationModule === null ||
    typeof designModule !== "object" ||
    designModule === null
  ) {
    return null;
  }

  const nctId = (identificationModule as Record<string, unknown>).nctId;
  const phases = (designModule as Record<string, unknown>).phases;
  if (typeof nctId !== "string" || !Array.isArray(phases)) {
    return null;
  }

  const normalizedPhases = phases.filter((phase): phase is string => typeof phase === "string");
  if (normalizedPhases.length === 0) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule: {
        nctId,
      },
      designModule: {
        phases: normalizedPhases,
      },
    },
  };
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

export async function fetchStudies(entities: ValidatedEntities): Promise<FetchStudiesResult> {
  const queryParams = mapQueryParams(entities);
  const fields = DEFAULT_FIELDS.join(",");

  const studies: CtgovStudy[] = [];
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
      const normalized = normalizeStudy(study);
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
  };
}
