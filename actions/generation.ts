"use server";

import crypto from "node:crypto";

import { generateMarketingCopy } from "@/lib/generation/marketing-copy";
import {
  completeGenerationJob,
  createGenerationJob,
  failGenerationJob,
  markGenerationDrafting,
  markGenerationRendering,
  markGenerationRetrieving,
} from "@/lib/convex/generation-jobs";

export async function generateReport(input: {
  merchantId: string;
  sourceTypes: Array<"ops" | "restaurant">;
  brief: string;
  requestedBy?: string;
}) {
  const menuId = crypto.randomUUID();
  const jobId = await createGenerationJob({
    merchantId: input.merchantId,
    requestedBy: input.requestedBy ?? "anonymous",
    inputSummary: input.brief.slice(0, 500),
  });

  if (jobId) {
    await markGenerationRetrieving(jobId);
  }

  try {
    const result = await generateMarketingCopy({
      ...input,
      onRetrievalReady: async (summary) => {
        if (jobId) {
          await markGenerationDrafting(jobId, summary);
        }
      },
      onDraftReady: async () => {
        if (jobId) {
          await markGenerationRendering(jobId);
        }
      },
      onRenderStart: async () => {
        // Render stage is already marked right after draft readiness.
      },
    });

    if (jobId) {
      await completeGenerationJob({
        jobId,
        publicId: menuId,
        merchantId: input.merchantId,
        outputType: "wine_marketing_copy",
        promptVersion: "generation_v2",
        resultJson: JSON.stringify(result),
        renderedText: result.marketingCopy,
      });
    }

    return {
      ...result,
      jobId,
      menuId,
    };
  } catch (error) {
    if (jobId) {
      await failGenerationJob(
        jobId,
        error instanceof Error ? error.message : "Generation failed",
      );
    }
    throw error;
  }
}
