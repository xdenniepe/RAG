import { readFile } from "node:fs/promises";

const API_BASE_URL = process.env.EVAL_API_BASE_URL ?? "http://localhost:3000";
const API_ROUTE = `${API_BASE_URL}/api/generate`;

function scoreContains(text, expected) {
  const lower = text.toLowerCase();
  const hits = expected.filter((item) => lower.includes(item.toLowerCase())).length; 
  return expected.length === 0 ? 1 : hits / expected.length;
}

function summarizeSources(response) {
  const sourceTypes = new Set((response.sources ?? []).map((source) => source.sourceType));
  return sourceTypes;
}

async function runCase(testCase) {
  const payload = {
    merchantId: testCase.merchantId,
    sourceTypes: ["ops", "restaurant"],
    brief: testCase.brief,
  };

  const response = await fetch(API_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();

  if (!response.ok) {
    return {
      id: testCase.id,
      ok: false,
      error: body.error ?? "Unknown generation error",
      scores: { restaurant: 0, wine: 0, sourceCoverage: 0, overall: 0 },
    };
  }

  const aggregateText = [
    body.restaurantSummary ?? "",
    body.marketingCopy ?? "",
    ...(body.wines ?? []).map((wine) => `${wine.wineName} ${wine.menuCopy}`),
  ]
    .filter(Boolean)
    .join(" ");

  const restaurantScore = scoreContains(aggregateText, testCase.expectedRestaurantFacts);
  const wineScore = scoreContains(aggregateText, testCase.expectedWineFacts);
  const actualSources = summarizeSources(body);
  const covered = testCase.expectedSourceTypes.filter((expected) =>
    actualSources.has(expected),
  ).length;
  const sourceCoverage =
    testCase.expectedSourceTypes.length === 0
      ? 1
      : covered / testCase.expectedSourceTypes.length;

  const overall = Number(((restaurantScore + wineScore + sourceCoverage) / 3).toFixed(3));
  return {
    id: testCase.id,
    ok: true,
    scores: {
      restaurant: Number(restaurantScore.toFixed(3)),
      wine: Number(wineScore.toFixed(3)),
      sourceCoverage: Number(sourceCoverage.toFixed(3)),
      overall,
    },
  };
}

async function main() {
  const raw = await readFile(new URL("../evals/retrieval-generation-pack.json", import.meta.url));
  const testCases = JSON.parse(raw.toString("utf8"));

  const results = [];
  for (const testCase of testCases) {
    // Keep it serial for predictable local load on MVP infra.
    const result = await runCase(testCase);
    results.push(result);
    if (!result.ok) {
      console.error(`[${result.id}] FAILED: ${result.error}`);
    } else {
      console.log(
        `[${result.id}] overall=${result.scores.overall} restaurant=${result.scores.restaurant} wine=${result.scores.wine} sources=${result.scores.sourceCoverage}`,
      );
    }
  }

  const successful = results.filter((result) => result.ok);
  const avgOverall =
    successful.reduce((sum, result) => sum + result.scores.overall, 0) /
      (successful.length || 1);
  const failedCount = results.length - successful.length;

  console.log("\n=== Eval Summary ===");
  console.log(`total=${results.length}`);
  console.log(`successful=${successful.length}`);
  console.log(`failed=${failedCount}`);
  console.log(`avgOverall=${avgOverall.toFixed(3)}`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Eval harness failed:", error);
  process.exitCode = 1;
});
