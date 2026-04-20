import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createGenerationJob = mutation({
  args: {
    merchantId: v.string(),
    requestedBy: v.string(),
    inputSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    return ctx.db.insert("generationJobs", {
      jobId,
      merchantId: args.merchantId,
      requestedBy: args.requestedBy,
      status: "queued",
      inputSummary: args.inputSummary,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markRetrieving = mutation({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "retrieving",
      updatedAt: Date.now(),
    });
  },
});

export const markDrafting = mutation({
  args: {
    jobId: v.id("generationJobs"),
    retrievalSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "drafting",
      retrievalSummary: args.retrievalSummary,
      updatedAt: Date.now(),
    });
  },
});

export const markRendering = mutation({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "rendering",
      updatedAt: Date.now(),
    });
  },
});

export const completeGenerationJob = mutation({
  args: {
    jobId: v.id("generationJobs"),
    publicId: v.string(),
    merchantId: v.string(),
    outputType: v.string(),
    promptVersion: v.string(),
    resultJson: v.string(),
    renderedText: v.string(),
  },
  handler: async (ctx, args) => {
    const resultId = await ctx.db.insert("generationResults", {
      publicId: args.publicId,
      merchantId: args.merchantId,
      jobId: args.jobId,
      outputType: args.outputType,
      promptVersion: args.promptVersion,
      resultJson: args.resultJson,
      renderedText: args.renderedText,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.jobId, {
      status: "completed",
      resultId,
      updatedAt: Date.now(),
    });
    return resultId;
  },
});

export const getGenerationResultByPublicId = query({
  args: {
    merchantId: v.string(),
    publicId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generationResults")
      .withIndex("by_merchantId_and_publicId", (q) =>
        q.eq("merchantId", args.merchantId).eq("publicId", args.publicId),
      )
      .unique();
  },
});

export const failGenerationJob = mutation({
  args: {
    jobId: v.id("generationJobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

export const listGenerationJobsByMerchant = query({
  args: { merchantId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("generationJobs")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", args.merchantId))
      .order("desc")
      .take(100);
  },
});
