# Example Runs

Real JSON outputs from the visualization pipeline (OpenAI interpretation + live ClinicalTrials.gov data). Each file includes the request query, full response, and generation timestamp.

Non-empty data points and network edges may include a `citations` array (`nct_id` + `excerpt` from CT.gov `BriefTitle`), capped at 10 per datum. Zero-fill bins omit `citations`.

Examples use **varied drugs and conditions** (not a single Pembrolizumab-only set).

Regenerate with:

```bash
npm run examples:generate
```

| File | Query | Filter | Visualization |
|------|-------|--------|---------------|
| [`01-comparison-bar-chart.json`](01-comparison-bar-chart.json) | Compare trial phases for Metformin | drug | `bar_chart` |
| [`06-grouped-bar-chart.json`](06-grouped-bar-chart.json) | Compare phases for Metformin vs Pembrolizumab | drugs | `grouped_bar_chart` |
| [`02-timeline-line-chart.json`](02-timeline-line-chart.json) | How many breast cancer trials started each year? | condition | `line_chart` |
| [`03-distribution-histogram.json`](03-distribution-histogram.json) | What is the enrollment distribution for Nivolumab trials? | drug | `histogram` |
| [`04-relationship-scatterplot.json`](04-relationship-scatterplot.json) | What is the relationship between enrollment and start year for type 2 diabetes trials? | condition | `scatterplot` |
| [`05-network-drug-sponsor.json`](05-network-drug-sponsor.json) | Which sponsors are running trials for melanoma? | condition | `network_graph` |

Scatterplot and network files may be large when CT.gov returns many studies (per-study points or full graphs).
