import { z } from "zod";

export const MIN_STUDY_YEAR = 1900;
export const MAX_STUDY_YEAR = 2100;

export const EntityYearSchema = z
  .number()
  .int()
  .min(MIN_STUDY_YEAR)
  .max(MAX_STUDY_YEAR)
  .nullable()
  .describe("Four-digit calendar year filter (null if not mentioned).");
