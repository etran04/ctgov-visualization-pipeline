import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoStudiesFoundError, UpstreamApiError } from "../../../src/domain/errors.js";
import { getFieldsForIntent } from "../../../src/domain/intents/fieldProfiles.js";
import { validMultiPhaseStudy, validSinglePhaseStudy } from "../../fixtures/ctgovStudies.js";

vi.mock("../../../src/externals/ctgov/fetchStudies.js", () => ({
  fetchStudies: vi.fn(),
  DEFAULT_CTGOV_FIELDS: ["NCTId", "Phase"],
}));

import { fetchStudies } from "../../../src/externals/ctgov/fetchStudies.js";
import { fetchStudiesForGroupedComparison } from "../../../src/externals/ctgov/fetchStudiesForGroupedComparison.js";

const mockFetchStudies = vi.mocked(fetchStudies);

function makeFetchResult(
  studies: typeof validSinglePhaseStudy[],
  overrides: Partial<{
    pages_fetched: number;
    skipped_malformed: number;
    truncated: boolean;
  }> = {},
) {
  return {
    studies,
    pages_fetched: overrides.pages_fetched ?? 1,
    skipped_malformed: overrides.skipped_malformed ?? 0,
    truncated: overrides.truncated ?? false,
  };
}

describe("fetchStudiesForGroupedComparison", () => {
  const sharedFilters = { condition: "Diabetes", phase: "Phase 2" as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches each target in parallel with shared filters and comparison fields", async () => {
    mockFetchStudies.mockImplementation(async (entities) => {
      if (entities.drug_name === "Metformin") {
        return makeFetchResult([validSinglePhaseStudy], { skipped_malformed: 1 });
      }
      return makeFetchResult([validMultiPhaseStudy], { pages_fetched: 2, truncated: true });
    });

    const result = await fetchStudiesForGroupedComparison({
      targets: ["Metformin", "Pembrolizumab"],
      sharedFilters,
    });

    expect(mockFetchStudies).toHaveBeenCalledTimes(2);
    expect(mockFetchStudies).toHaveBeenCalledWith(
      {
        drug_name: "Metformin",
        comparison_targets: null,
        condition: "Diabetes",
        phase: "Phase 2",
      },
      { intent: "comparison", fields: ["NCTId", "Phase"] },
    );
    expect(mockFetchStudies).toHaveBeenCalledWith(
      {
        drug_name: "Pembrolizumab",
        comparison_targets: null,
        condition: "Diabetes",
        phase: "Phase 2",
      },
      { intent: "comparison", fields: ["NCTId", "Phase"] },
    );

    expect(result.seriesResults).toEqual([
      {
        series: "Metformin",
        studies: [validSinglePhaseStudy],
        pages_fetched: 1,
        skipped_malformed: 1,
        truncated: false,
      },
      {
        series: "Pembrolizumab",
        studies: [validMultiPhaseStudy],
        pages_fetched: 2,
        skipped_malformed: 0,
        truncated: true,
      },
    ]);
    expect(result.fetched_studies).toBe(2);
    expect(result.skipped_malformed).toBe(1);
    expect(result.pages_fetched).toBe(3);
    expect(result.truncated).toBe(true);
  });

  it("issues parallel fetches rather than waiting for each target sequentially", async () => {
    let releaseFetches: (() => void) | null = null;
    const fetchGate = new Promise<void>((resolve) => {
      releaseFetches = resolve;
    });
    const startedTargets: string[] = [];

    mockFetchStudies.mockImplementation(async (entities) => {
      startedTargets.push(entities.drug_name ?? "unknown");
      await fetchGate;
      return makeFetchResult([validSinglePhaseStudy]);
    });

    const pending = fetchStudiesForGroupedComparison({
      targets: ["Metformin", "Pembrolizumab"],
      sharedFilters: { condition: null, phase: null },
    });

    await vi.waitFor(() => {
      expect(startedTargets).toHaveLength(2);
    });

    releaseFetches!();
    await pending;

    expect(startedTargets).toEqual(["Metformin", "Pembrolizumab"]);
  });

  it("uses custom fields when provided", async () => {
    mockFetchStudies.mockResolvedValue(makeFetchResult([validSinglePhaseStudy]));

    await fetchStudiesForGroupedComparison(
      {
        targets: ["Metformin"],
        sharedFilters: { condition: null, phase: null },
      },
      { fields: getFieldsForIntent("comparison") },
    );

    expect(mockFetchStudies).toHaveBeenCalledWith(
      expect.objectContaining({ drug_name: "Metformin" }),
      { intent: "comparison", fields: ["NCTId", "Phase"] },
    );
  });

  it("zero-fills a series when its fetch returns no studies", async () => {
    mockFetchStudies.mockImplementation(async (entities) => {
      if (entities.drug_name === "Metformin") {
        throw new NoStudiesFoundError("no studies");
      }
      return makeFetchResult([validSinglePhaseStudy]);
    });

    const result = await fetchStudiesForGroupedComparison({
      targets: ["Metformin", "Pembrolizumab"],
      sharedFilters: { condition: null, phase: null },
    });

    expect(result.seriesResults[0]).toEqual({
      series: "Metformin",
      studies: [],
      pages_fetched: 0,
      skipped_malformed: 0,
      truncated: false,
    });
    expect(result.seriesResults[1]?.studies).toEqual([validSinglePhaseStudy]);
    expect(result.fetched_studies).toBe(1);
    expect(result.truncated).toBe(false);
  });

  it("sets truncated when any series fetch was truncated", async () => {
    mockFetchStudies
      .mockResolvedValueOnce(makeFetchResult([validSinglePhaseStudy], { truncated: false }))
      .mockResolvedValueOnce(makeFetchResult([validMultiPhaseStudy], { truncated: true }));

    const result = await fetchStudiesForGroupedComparison({
      targets: ["Metformin", "Pembrolizumab"],
      sharedFilters: { condition: null, phase: null },
    });

    expect(result.truncated).toBe(true);
  });

  it("throws NoStudiesFoundError when every target returns no studies", async () => {
    mockFetchStudies.mockRejectedValue(new NoStudiesFoundError("no studies"));

    await expect(
      fetchStudiesForGroupedComparison({
        targets: ["Metformin", "Pembrolizumab"],
        sharedFilters: { condition: null, phase: null },
      }),
    ).rejects.toThrow(NoStudiesFoundError);
  });

  it("propagates upstream errors from individual series fetches", async () => {
    mockFetchStudies
      .mockResolvedValueOnce(makeFetchResult([validSinglePhaseStudy]))
      .mockRejectedValueOnce(new UpstreamApiError("ClinicalTrials.gov unavailable"));

    await expect(
      fetchStudiesForGroupedComparison({
        targets: ["Metformin", "Pembrolizumab"],
        sharedFilters: { condition: null, phase: null },
      }),
    ).rejects.toThrow(UpstreamApiError);
  });
});
