import "dotenv/config";

function parsePositiveInt(value: string | undefined, fallback: number, key: string): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${key}: expected a positive integer`);
  }

  return parsed;
}

function parseRequiredString(value: string | undefined, key: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const config = {
  OPENAI_API_KEY: parseRequiredString(process.env.OPENAI_API_KEY, "OPENAI_API_KEY"),
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-5.4",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  CTGOV_BASE_URL: process.env.CTGOV_BASE_URL ?? "https://clinicaltrials.gov/api/v2",
  CTGOV_MAX_PAGES: parsePositiveInt(process.env.CTGOV_MAX_PAGES, 10, "CTGOV_MAX_PAGES"),
  CTGOV_PAGE_SIZE: parsePositiveInt(process.env.CTGOV_PAGE_SIZE, 1000, "CTGOV_PAGE_SIZE"),
  CTGOV_RETRY_ATTEMPTS: parsePositiveInt(
    process.env.CTGOV_RETRY_ATTEMPTS,
    3,
    "CTGOV_RETRY_ATTEMPTS",
  ),
  OPENAI_RETRY_ATTEMPTS: parsePositiveInt(
    process.env.OPENAI_RETRY_ATTEMPTS,
    3,
    "OPENAI_RETRY_ATTEMPTS",
  ),
  OPENAI_TIMEOUT_MS: parsePositiveInt(process.env.OPENAI_TIMEOUT_MS, 30_000, "OPENAI_TIMEOUT_MS"),
  PORT: parsePositiveInt(process.env.PORT, 3000, "PORT"),
} as const;

export type AppConfig = typeof config;
