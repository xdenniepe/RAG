import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Placeholder worker entrypoint for ingestion orchestration.
// In production, call this from your ingest route after creating a job record.
export const processIngestionJob = internalAction({
  args: {
    jobId: v.id("ingestionJobs"),
  },
  handler: async (_ctx, args) => {
    return {
      ok: true,
      message: `Worker received job ${args.jobId}`,
    };
  },
});
