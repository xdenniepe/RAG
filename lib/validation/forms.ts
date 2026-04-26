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

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([A-Fa-f0-9]{6})$/, "Use a valid hex color like #4A165C.");

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? "")
  .refine(
    (value) => !value || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value),
    "Website URL must start with http:// or https://.",
  );

export const onboardingAccountInfoSchema = z.object({
  accountName: z
    .string()
    .trim()
    .min(2, "Name is required.")
    .max(120, "Name is too long."),
});

export const onboardingRestaurantDetailsSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(2, "Restaurant name is required.")
    .max(160, "Restaurant name is too long."),
  restaurantStreetAddress: z
    .string()
    .trim()
    .min(4, "Street address is required.")
    .max(180, "Street address is too long."),
  restaurantAddressLine2: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value.length <= 180, "Address line 2 is too long."),
  restaurantCity: z
    .string()
    .trim()
    .min(2, "City is required.")
    .max(120, "City is too long."),
  restaurantState: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value.length <= 120, "State is too long."),
  restaurantCountry: z
    .string()
    .trim()
    .min(2, "Country is required.")
    .max(120, "Country is too long."),
  restaurantWebsite: optionalUrlSchema,
  menuPdfFileName: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine(
      (value) => !value || value.toLowerCase().endsWith(".pdf"),
      "Menu file must be a PDF.",
    )
    .refine((value) => value.length <= 260, "Menu file name is too long."),
});

export const onboardingBrandIdentitySchema = z.object({
  brandPrimaryColor: hexColorSchema,
  brandAccentColor: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine(
      (value) => !value || /^#([A-Fa-f0-9]{6})$/.test(value),
      "Accent color must be a valid hex color like #C4A574.",
    ),
});

export const onboardingRestaurantContextSchema = z.object({
  restaurantVibe: z
    .string()
    .trim()
    .min(2, "Restaurant vibe is required.")
    .max(120, "Restaurant vibe is too long."),
  cuisineType: z
    .string()
    .trim()
    .min(2, "Cuisine and concept is required.")
    .max(300, "Cuisine and concept is too long."),
  targetClientele: z
    .string()
    .trim()
    .min(2, "Target clientele is required.")
    .max(300, "Target clientele is too long."),
  toneOfVoice: z
    .string()
    .trim()
    .min(2, "Tone of voice is required.")
    .max(300, "Tone of voice is too long."),
  beverageProgramGoals: z
    .string()
    .trim()
    .min(2, "Beverage program goals are required.")
    .max(500, "Beverage program goals are too long."),
});

export const onboardingSubmissionSchema = onboardingAccountInfoSchema
  .merge(onboardingRestaurantDetailsSchema)
  .merge(onboardingBrandIdentitySchema)
  .merge(onboardingRestaurantContextSchema);
