import { NoAggregatableDataError } from "../errors.js";
import { NETWORK_DIMENSIONS, type NetworkDimension } from "./dimensions.js";
import {
  buildNodeId,
  normalizeEntityLabel,
  normalizeInterventionLabel,
} from "./normalizeEntityLabel.js";
import type {
  BipartiteGraphResult,
  NetworkEdge,
  NetworkGraphFilters,
  NetworkNode,
  NetworkStudyRecord,
} from "./types.js";

function normalizeLeftLabel(
  entityType: string,
  rawLabel: string,
  filters?: NetworkGraphFilters,
): string {
  if (entityType === "drug") {
    return normalizeInterventionLabel(rawLabel, filters);
  }

  return normalizeEntityLabel(rawLabel);
}

/**
 * Build a bipartite graph from normalized studies using a dimension registry entry.
 *
 * Each study contributes one edge per left-side entity (e.g. intervention) to the
 * right-side entity (e.g. lead sponsor). Edge `weight` is the number of trials
 * linking that pair. `source_nct_ids` is kept internal for future citations.
 *
 * @throws {NoAggregatableDataError} When input is empty or every study is skipped.
 */
export function buildBipartiteGraph(
  studies: NetworkStudyRecord[],
  dimension: NetworkDimension,
  filters?: NetworkGraphFilters,
): BipartiteGraphResult {
  if (studies.length === 0) {
    throw new NoAggregatableDataError("No studies were provided for aggregation");
  }

  const config = NETWORK_DIMENSIONS[dimension];
  const nodeMap = new Map<string, NetworkNode>();
  const edgeMap = new Map<string, NetworkEdge>();

  let skippedMalformed = 0;
  let aggregatableStudies = 0;

  for (const study of studies) {
    const nctId = study.protocolSection.identificationModule.nctId;
    if (typeof nctId !== "string" || nctId.length === 0) {
      skippedMalformed += 1;
      continue;
    }

    const leftEntities = config.extractLeft(study);
    const rightEntity = config.extractRight(study);

    if (leftEntities === null || leftEntities.length === 0 || rightEntity === null) {
      skippedMalformed += 1;
      continue;
    }

    aggregatableStudies += 1;

    const rightLabel = normalizeEntityLabel(rightEntity);
    const rightId = buildNodeId(config.rightEntityType, rightLabel);

    if (!nodeMap.has(rightId)) {
      nodeMap.set(rightId, {
        id: rightId,
        label: rightLabel,
        entity_type: config.rightEntityType,
      });
    }

    for (const rawLeft of leftEntities) {
      const leftLabel = normalizeLeftLabel(config.leftEntityType, rawLeft, filters);
      const leftId = buildNodeId(config.leftEntityType, leftLabel);

      if (!nodeMap.has(leftId)) {
        nodeMap.set(leftId, {
          id: leftId,
          label: leftLabel,
          entity_type: config.leftEntityType,
        });
      }

      const edgeKey = `${leftId}|${rightId}`;
      const existing = edgeMap.get(edgeKey);

      if (existing) {
        existing.weight += 1;
        existing.source_nct_ids.push(nctId);
      } else {
        edgeMap.set(edgeKey, {
          source: leftId,
          target: rightId,
          weight: 1,
          source_nct_ids: [nctId],
        });
      }
    }
  }

  if (aggregatableStudies === 0 || edgeMap.size === 0) {
    throw new NoAggregatableDataError("No studies contained aggregatable network data");
  }

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
    skipped_malformed: skippedMalformed,
  };
}
