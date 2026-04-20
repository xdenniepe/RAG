import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createJob,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
} from "@/lib/convex/ingestion-jobs";
import { ingestUploadedFiles } from "@/lib/ingestion/pipeline";

const requestSchema = z.object({
  merchantId: z.string().trim().min(2, "Merchant ID is required."),
  count: z.coerce.number().int().min(1).max(25).optional(),
});

type SampleWine = {
  id?: number;
  wine?: string;
  winery?: string;
  location?: string;
  image?: string;
  rating?: {
    average?: string;
    reviews?: string;
  };
};

function toWineDetailText(wine: SampleWine, index: number) {
  const wineName = wine.wine?.trim() || `Seed Wine ${index + 1}`;
  const winery = wine.winery?.trim() || "Unknown winery";
  const location = wine.location?.trim() || "Unknown region";
  const average = wine.rating?.average?.trim() || "N/A";
  const reviews = wine.rating?.reviews?.trim() || "N/A";

  return {
    title: `${wineName} - ${winery}`,
    fileName: `ops-seed-${index + 1}-${wineName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`,
    content: [
      `Wine Name: ${wineName}`,
      `Producer / Winery: ${winery}`,
      `Region: ${location}`,
      `Average Rating: ${average}`,
      `Review Volume: ${reviews}`,
      `Image Source: ${wine.image || "N/A"}`,
      "Tasting Notes: Rich fruit-forward profile with balanced acidity and a smooth finish.",
      "Producer Story: This producer is recognized for consistent craftsmanship and approachable premium style.",
      "Technical Details: Suggested serving temperature 14-18C. Pair with roasted meats, aged cheese, and savory dishes.",
      "Marketing Angle: Great by-the-glass feature wine with broad menu pairing flexibility.",
    ].join("\n"),
  };
}

async function fetchSampleWines() {
  const urls = [
    "https://api.sampleapis.com/wines/reds",
    "https://api.sampleapis.com/wines/whites",
    "https://api.sampleapis.com/wines/rose",
  ];

  const responses = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, {
        next: { revalidate: 60 * 60 },
      });
      if (!response.ok) {
        return [] as SampleWine[];
      }
      return (await response.json()) as SampleWine[];
    }),
  );

  const merged = responses.flat();
  const seen = new Set<string>();
  const unique = merged.filter((wine) => {
    const key = `${wine.wine ?? ""}::${wine.winery ?? ""}`.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

const FALLBACK_WINES: SampleWine[] = Array.from({ length: 12 }, (_, i) => ({
  wine: `Demo Seed Wine ${i + 1}`,
  winery: "Demo Vineyard",
  location: "California, USA",
  rating: { average: "4.5", reviews: "120" },
}));

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let jobId: string | null = null;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Expected JSON body with merchantId (and optional count).", requestId },
        { status: 400 },
      );
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          issues: parsed.error.flatten().fieldErrors,
          requestId,
        },
        { status: 400 },
      );
    }

    const { merchantId, count = 10 } = parsed.data;
    let scrapedWines = await fetchSampleWines();
    let seedSource = "sampleapis.com/wines";

    if (scrapedWines.length === 0) {
      scrapedWines = FALLBACK_WINES;
      seedSource = "local-fallback (sampleapis unavailable)";
    }

    const selected = scrapedWines.slice(0, count);
    const seedFiles = selected.map((wine, index) => {
      const detail = toWineDetailText(wine, index);
      return new File([detail.content], detail.fileName, { type: "text/plain" });
    });

    jobId = await createJob({
      merchantId,
      sourceType: "ops",
      fileNames: seedFiles.map((file) => file.name),
    });
    if (jobId) {
      await markJobProcessing(jobId, "seed_ingestion");
    }

    const result = await ingestUploadedFiles({
      merchantId,
      sourceType: "ops",
      files: seedFiles,
    });

    if (jobId) {
      await markJobCompleted({
        jobId,
        indexedFiles: result.indexedFiles,
        totalBlocks: result.totalBlocks,
        totalSections: result.totalSections,
        totalChunks: result.totalChunks,
      });
    }

    return NextResponse.json({
      ...result,
      requestId,
      jobId,
      source: seedSource,
      generatedItems: selected.map((wine, index) => {
        const detail = toWineDetailText(wine, index);
        return {
          title: detail.title,
          winery: wine.winery ?? "Unknown winery",
          region: wine.location ?? "Unknown region",
        };
      }),
    });
  } catch (error) {
    if (jobId) {
      await markJobFailed(
        jobId,
        error instanceof Error ? error.message : "Seed ingestion failed",
      );
    }
    const message =
      error instanceof Error ? error.message : "Ops seed generation failed";
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
