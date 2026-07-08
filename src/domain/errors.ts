type ErrorCode =
  | "UNSUPPORTED_INTENT"
  | "INVALID_PARAMETERS"
  | "NO_STUDIES_FOUND"
  | "NO_AGGREGATABLE_DATA"
  | "UPSTREAM_API_FAILURE"
  | "INTERPRETATION_FAILURE";

class DomainError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(message: string, code: ErrorCode, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UnsupportedIntentError extends DomainError {
  constructor(message = "Unsupported intent") {
    super(message, "UNSUPPORTED_INTENT", 400);
  }
}

export class InvalidParametersError extends DomainError {
  constructor(message = "Invalid visualization parameters") {
    super(message, "INVALID_PARAMETERS", 422);
  }
}

export class NoStudiesFoundError extends DomainError {
  constructor(message = "No studies found") {
    super(message, "NO_STUDIES_FOUND", 404);
  }
}

export class NoAggregatableDataError extends DomainError {
  constructor(message = "No aggregatable data found in studies") {
    super(message, "NO_AGGREGATABLE_DATA", 422);
  }
}

export class UpstreamApiError extends DomainError {
  constructor(message = "Upstream API failure") {
    super(message, "UPSTREAM_API_FAILURE", 502);
  }
}

export class InterpretationError extends DomainError {
  constructor(message = "Failed to interpret query") {
    super(message, "INTERPRETATION_FAILURE", 502);
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
