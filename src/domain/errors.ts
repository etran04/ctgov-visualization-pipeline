type ErrorCode =
  | "UNSUPPORTED_INTENT"
  | "INVALID_PARAMETERS"
  | "NO_STUDIES_FOUND"
  | "NO_AGGREGATABLE_DATA"
  | "UPSTREAM_API_FAILURE"
  | "INTERPRETATION_FAILURE";

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
} as const;

type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

class DomainError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: HttpStatusCode;

  constructor(message: string, code: ErrorCode, statusCode: HttpStatusCode) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UnsupportedIntentError extends DomainError {
  constructor(message = "Unsupported intent") {
    super(message, "UNSUPPORTED_INTENT", HTTP_STATUS.BAD_REQUEST);
  }
}

export class InvalidParametersError extends DomainError {
  constructor(message = "Invalid visualization parameters") {
    super(message, "INVALID_PARAMETERS", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

export class NoStudiesFoundError extends DomainError {
  constructor(message = "No studies found") {
    super(message, "NO_STUDIES_FOUND", HTTP_STATUS.NOT_FOUND);
  }
}

export class NoAggregatableDataError extends DomainError {
  constructor(message = "No aggregatable data found in studies") {
    super(message, "NO_AGGREGATABLE_DATA", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

export class UpstreamApiError extends DomainError {
  constructor(message = "Upstream API failure") {
    super(message, "UPSTREAM_API_FAILURE", HTTP_STATUS.BAD_GATEWAY);
  }
}

export class InterpretationError extends DomainError {
  constructor(message = "Failed to interpret query") {
    super(message, "INTERPRETATION_FAILURE", HTTP_STATUS.BAD_GATEWAY);
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
