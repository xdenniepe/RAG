import { z } from "zod";

export const merchantIdSchema = z
  .string()
  .trim()
  .min(2, "Merchant ID is required.")
  .max(64, "Merchant ID is too long.")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    "Merchant ID must use letters, numbers, dashes, or underscores.",
  );

export const actorIdSchema = z
  .string()
  .trim()
  .min(2, "Actor ID is required.")
  .max(128, "Actor ID is too long.")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/,
    "Actor ID must use safe identifier characters.",
  );

export const opsIngestionSchema = z.object({
  wineName: z.string().trim().min(2, "Wine name is required."),
  producer: z.string().trim().min(2, "Producer / Vineyard is required."),
  region: z.string().trim().min(2, "Region is required."),
  tastingNotes: z.string().trim().optional(),
  brewStory: z.string().trim().optional(),
  technicalDetails: z.string().trim().optional(),
});

export const merchantIngestionSchema = z.object({
  restaurantName: z.string().trim().min(2, "Restaurant name is required."),
  restaurantStory: z.string().trim().optional(),
  cuisineStyle: z.string().trim().min(2, "Cuisine style is required."),
  menuHighlights: z.string().trim().optional(),
  availableWines: z.string().trim().optional(),
  brandTone: z.string().trim().optional(),
});

export const generateMarketingRequestSchema = z.object({
  merchantId: merchantIdSchema,
  sourceTypes: z.array(z.enum(["ops", "restaurant"])).min(1).max(2),
  brief: z
    .string()
    .trim()
    .min(10, "Prompt/brief should be at least 10 characters.")
    .max(2400, "Prompt/brief is too long."),
  requestedBy: actorIdSchema.optional(),
});
