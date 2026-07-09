/**
 * Generate committed example JSON outputs for all visualization presets.
 *
 *   npm run examples:generate
 *
 * Requires OPENAI_API_KEY and network access.
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildVisualization } from "../src/application/buildVisualization.js";

/** One example per visualization type, using varied drugs and conditions. */
const EXAMPLES = [
  {
    id: "comparison",
    filename: "01-comparison-bar-chart.json",
    query: "Compare trial phases for Metformin",
    filter: "drug: Metformin",
  },
  {
    id: "timeline",
    filename: "02-timeline-line-chart.json",
    query: "How many breast cancer trials started each year?",
    filter: "condition: breast cancer",
  },
  {
    id: "distribution",
    filename: "03-distribution-histogram.json",
    query: "What is the enrollment distribution for Nivolumab trials?",
    filter: "drug: Nivolumab",
  },
  {
    id: "relationship",
    filename: "04-relationship-scatterplot.json",
    query:
      "What is the relationship between enrollment and start year for type 2 diabetes trials?",
    filter: "condition: type 2 diabetes",
  },
  {
    id: "network",
    filename: "05-network-drug-sponsor.json",
    query: "Which sponsors are running trials for melanoma?",
    filter: "condition: melanoma",
  },
] as const;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = path.resolve(__dirname, "../examples");

async function main(): Promise<void> {
  process.env.LOG_LEVEL = "error";
  await mkdir(EXAMPLES_DIR, { recursive: true });

  for (const example of EXAMPLES) {
    process.stderr.write(`Generating ${example.filename} (${example.filter})…\n`);

    const response = await buildVisualization({ query: example.query });
    const output = {
      request: { query: example.query },
      response,
      generated_at: new Date().toISOString(),
      preset: example.id,
    };
    const filePath = path.join(EXAMPLES_DIR, example.filename);
    await writeFile(filePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    process.stderr.write(`  → ${filePath} (${response.visualization.type})\n`);
  }

  process.stderr.write(`\nWrote ${EXAMPLES.length} examples to ${EXAMPLES_DIR}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
