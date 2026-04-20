import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createIngestionJob = mutation({
  args: {
    merchantId: v.string(),
    sourceType: v.union(v.literal("ops"), v.literal("restaurant")),
    fileNames: v.array(v.string()),
    documentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("ingestionJobs", {
      jobId: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      documentId: args.documentId,
      merchantId: args.merchantId,
      sourceType: args.sourceType,
      status: "queued",
      stage: "intake",
      fileNames: args.fileNames,
      retries: 0,
      attemptCount: 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markProcessing = mutation({
  args: { jobId: v.id("ingestionJobs"), stage: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "processing",
      stage: args.stage ?? "processing",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const markCompleted = mutation({
  args: {
    jobId: v.id("ingestionJobs"),
    indexedFiles: v.number(),
    totalBlocks: v.optional(v.number()),
    totalSections: v.optional(v.number()),
    totalChunks: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      stage: "completed",
      indexedFiles: args.indexedFiles,
      totalBlocks: args.totalBlocks,
      totalSections: args.totalSections,
      totalChunks: args.totalChunks,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const markFailed = mutation({
  args: {
    jobId: v.id("ingestionJobs"),
    errorMessage: v.string(),
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.jobId);
    await ctx.db.patch(args.jobId, {
      status: "failed",
      stage: args.stage ?? "failed",
      retries: (current?.retries ?? 0) + 1,
      attemptCount: (current?.attemptCount ?? 0) + 1,
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const listJobsByMerchant = query({
  args: { merchantId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("ingestionJobs")
      .withIndex("by_merchantId", (q) => q.eq("merchantId", args.merchantId))
      .order("desc")
      .take(100);
  },
});
