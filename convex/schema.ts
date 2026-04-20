import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ingestionJobs: defineTable({
    jobId: v.string(),
    documentId: v.optional(v.string()),
    merchantId: v.string(),
    sourceType: v.union(v.literal("ops"), v.literal("restaurant")),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    stage: v.optional(v.string()),
    fileNames: v.array(v.string()),
    indexedFiles: v.optional(v.number()),
    totalBlocks: v.optional(v.number()),
    totalSections: v.optional(v.number()),
    totalChunks: v.optional(v.number()),
    retries: v.number(),
    errorMessage: v.optional(v.string()),
    attemptCount: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_merchantId", ["merchantId"])
    .index("by_status", ["status"]),
  generationJobs: defineTable({
    jobId: v.string(),
    merchantId: v.string(),
    requestedBy: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("retrieving"),
      v.literal("drafting"),
      v.literal("rendering"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    inputSummary: v.string(),
    retrievalSummary: v.optional(v.string()),
    resultId: v.optional(v.id("generationResults")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_merchantId", ["merchantId"])
    .index("by_status", ["status"]),
  generationResults: defineTable({
    publicId: v.optional(v.string()),
    merchantId: v.string(),
    jobId: v.string(),
    outputType: v.string(),
    promptVersion: v.string(),
    resultJson: v.string(),
    renderedText: v.string(),
    createdAt: v.number(),
  })
    .index("by_merchantId", ["merchantId"])
    .index("by_jobId", ["jobId"])
    .index("by_publicId", ["publicId"])
    .index("by_merchantId_and_publicId", ["merchantId", "publicId"]),
});
