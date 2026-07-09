import { describe, expect, it } from "vitest";
import {
  buildCitations,
  buildStudyExcerptIndex,
  MAX_CITATIONS_PER_DATUM,
} from "../../../src/domain/citations/index.js";

function study(nctId: string, briefTitle?: string) {
  return {
    protocolSection: {
      identificationModule: {
        nctId,
        ...(briefTitle !== undefined ? { briefTitle } : {}),
      },
    },
  };
}

describe("buildStudyExcerptIndex", () => {
  it("maps nctId to trimmed briefTitle", () => {
    const index = buildStudyExcerptIndex([
      study("NCT00000001", "  First Study  "),
      study("NCT00000002", "Second Study"),
    ]);

    expect(index.get("NCT00000001")).toBe("First Study");
    expect(index.get("NCT00000002")).toBe("Second Study");
    expect(index.size).toBe(2);
  });

  it("skips studies missing nctId or empty briefTitle", () => {
    const index = buildStudyExcerptIndex([
      study("", "Missing ID"),
      study("NCT00000003"),
      study("NCT00000004", "   "),
      study("NCT00000005", "Valid Title"),
    ]);

    expect(index.size).toBe(1);
    expect(index.get("NCT00000005")).toBe("Valid Title");
  });
});

describe("buildCitations", () => {
  const index = new Map<string, string>([
    ["NCT00000001", "Alpha Trial"],
    ["NCT00000002", "Beta Trial"],
    ["NCT00000003", "Gamma Trial"],
  ]);

  it("resolves excerpts from index", () => {
    expect(buildCitations(["NCT00000002", "NCT00000001"], index)).toEqual([
      { nct_id: "NCT00000001", excerpt: "Alpha Trial" },
      { nct_id: "NCT00000002", excerpt: "Beta Trial" },
    ]);
  });

  it("dedupes duplicate IDs", () => {
    expect(buildCitations(["NCT00000001", "NCT00000001", "NCT00000002"], index)).toEqual([
      { nct_id: "NCT00000001", excerpt: "Alpha Trial" },
      { nct_id: "NCT00000002", excerpt: "Beta Trial" },
    ]);
  });

  it("skips IDs missing from index", () => {
    expect(buildCitations(["NCT00000099", "NCT00000001"], index)).toEqual([
      { nct_id: "NCT00000001", excerpt: "Alpha Trial" },
    ]);
  });

  it("returns empty array when no IDs resolve", () => {
    expect(buildCitations(["NCT00000099"], index)).toEqual([]);
    expect(buildCitations([], index)).toEqual([]);
  });

  it("caps at MAX_CITATIONS_PER_DATUM in sorted order", () => {
    const largeIndex = new Map<string, string>();
    const nctIds: string[] = [];

    for (let i = 1; i <= 15; i += 1) {
      const nctId = `NCT000000${String(i).padStart(2, "0")}`;
      nctIds.push(nctId);
      largeIndex.set(nctId, `Trial ${i}`);
    }

    const citations = buildCitations(nctIds, largeIndex);

    expect(MAX_CITATIONS_PER_DATUM).toBe(10);
    expect(citations).toHaveLength(10);
    expect(citations[0]?.nct_id).toBe("NCT00000001");
    expect(citations[9]?.nct_id).toBe("NCT00000010");
    expect(citations.map((c) => c.nct_id)).toEqual([
      "NCT00000001",
      "NCT00000002",
      "NCT00000003",
      "NCT00000004",
      "NCT00000005",
      "NCT00000006",
      "NCT00000007",
      "NCT00000008",
      "NCT00000009",
      "NCT00000010",
    ]);
  });

  it("respects a custom max", () => {
    const citations = buildCitations(
      ["NCT00000003", "NCT00000001", "NCT00000002"],
      index,
      2,
    );

    expect(citations).toEqual([
      { nct_id: "NCT00000001", excerpt: "Alpha Trial" },
      { nct_id: "NCT00000002", excerpt: "Beta Trial" },
    ]);
  });
});
