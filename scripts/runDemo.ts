/**
 * End-to-end visualization pipeline demo.
 *
 * Runs the full pipeline for a named preset or custom query. New intents only
 * need a preset entry (or a free-form query) once wired in buildVisualization.
 *
 *   npm run demo                    # default comparison preset
 *   npm run demo:comparison
 *   npm run demo:timeline
 *   npm run demo -- timeline
 *   npm run demo -- --query "Compare trial phases for Pembrolizumab"
 *   npm run demo -- --list
 *
 * Requires OPENAI_API_KEY and network access.
 */
import "dotenv/config";

import type { VisualizationResponse } from "../src/domain/schemas/index.js";

const PRESETS = {
  comparison: {
    label: "comparison → bar chart",
    query: "Compare trial phases for Pembrolizumab",
  },
  timeline: {
    label: "timeline → line chart",
    query: "How have Pembrolizumab trials changed over time?",
  },
} as const;

type PresetName = keyof typeof PRESETS;

function printUsage(): void {
  console.log(`Visualization pipeline demo

Usage:
  npm run demo [preset]
  npm run demo -- --query "your question"
  npm run demo -- --list
  npm run demo -- --verbose    # show pipeline logs (includes internal bin detail)

Presets:`);

  for (const [name, preset] of Object.entries(PRESETS)) {
    console.log(`  ${name.padEnd(12)} ${preset.label}`);
    console.log(`${"".padEnd(14)} "${preset.query}"`);
  }
}

function isPresetName(value: string): value is PresetName {
  return Object.hasOwn(PRESETS, value);
}

function resolveQuery(argv: string[]): { query: string; preset?: PresetName } {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (argv.includes("--list")) {
    printUsage();
    process.exit(0);
  }

  const queryIndex = argv.indexOf("--query");
  if (queryIndex >= 0) {
    const query = argv[queryIndex + 1];
    if (query === undefined || query.length === 0) {
      throw new Error("--query requires a value");
    }
    return { query };
  }

  const ignoredFlags = new Set(["--verbose", "-h", "--help", "--list"]);
  const positional = argv.filter((arg) => !arg.startsWith("-") && !ignoredFlags.has(arg));

  if (positional.length === 0) {
    return { query: PRESETS.comparison.query, preset: "comparison" };
  }

  const first = positional[0];
  if (isPresetName(first)) {
    return { query: PRESETS[first].query, preset: first };
  }

  return { query: positional.join(" ") };
}

function printSummary(response: VisualizationResponse): void {
  const { visualization: viz, meta } = response;

  console.log(`\n--- Summary ---`);
  console.log(`type:  ${viz.type}`);
  console.log(`title: ${viz.title}`);

  if (viz.type === "bar_chart") {
    for (const point of viz.data) {
      console.log(`${point.phase.padEnd(16)} ${point.trial_count}`);
    }
  } else {
    const years = viz.data.map((point) => point.year);
    const zeroFilled = viz.data.filter((point) => point.trial_count === 0).length;
    console.log(
      `years: ${years[0]}–${years[years.length - 1]} (${viz.data.length} bins, ${zeroFilled} zero-filled)`,
    );
  }

  console.log(
    `meta:  fetched=${meta.fetched_studies}, skipped=${meta.skipped_malformed}, ` +
      `multi_phase=${meta.studies_with_multiple_phases}, truncated=${meta.truncated}`,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("--verbose")) {
    process.env.LOG_LEVEL = "info";
  } else {
    process.env.LOG_LEVEL = "error";
  }

  const { query, preset } = resolveQuery(argv);
  const { buildVisualization } = await import("../src/application/buildVisualization.js");

  console.log("Visualization pipeline demo");
  if (preset !== undefined) {
    console.log(`Preset: ${preset} (${PRESETS[preset].label})`);
  }
  console.log(`Query: "${query}"`);

  const response = await buildVisualization({ query });
  printSummary(response);

  console.log("\n--- Response JSON ---");
  console.log(JSON.stringify(response, null, 2));
  console.log("\nDemo complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
