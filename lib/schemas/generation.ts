import { z } from "zod";

const generatedPageWineItemSchema = z.object({
  wineName: z.string().trim().min(1),
  description: z.string().trim().min(1),
  pairing: z.string().trim().min(1),
  imageUrl: z.string().trim().url().optional(),
  imageAlt: z.string().trim().optional(),
});

const generatedPageSectionSchema = z.object({
  title: z.string().trim().min(1),
  items: z.array(generatedPageWineItemSchema).default([]),
});

const generatedPageComponentSchema = z.object({
  type: z.string().trim().min(1),
  title: z.string().trim().optional(),
  text: z.string().trim().optional(),
  imageUrl: z.string().trim().url().optional(),
  imageAlt: z.string().trim().optional(),
  items: z.array(z.string().trim().min(1)).default([]),
});

export const generatedMenuPageSchema = z.object({
  page: z.object({
    hero: z.object({
      headline: z.string().trim().min(1),
      subheadline: z.string().trim().min(1),
    }),
    intro: z.string().trim().min(1),
    wineSections: z.array(generatedPageSectionSchema).default([]),
    featuredBlock: z
      .object({
        headline: z.string().trim().optional(),
        text: z.string().trim().min(1),
      })
      .optional(),
    components: z.array(generatedPageComponentSchema).default([]),
  }),
});

export const generatedWineSchema = z.object({
  wineName: z.string().trim().min(1),
  menuCopy: z.string().trim().min(1),
  pairingSuggestions: z.array(z.string().trim().min(1)).default([]),
  rationale: z.string().trim().default(""),
  groundedSources: z.array(z.string().trim().min(1)).default([]),
  imageUrl: z.string().trim().url().optional(),
  imageAlt: z.string().trim().default("Wine bottle presentation"),
  visualNotes: z.array(z.string().trim().min(1)).default([]),
});

export const pageDesignSchema = z.object({
  targetAudience: z.string().trim().default("Restaurant guests"),
  toneApplied: z.string().trim().default("Warm and premium"),
  visualStyle: z.string().trim().default("Editorial wine menu"),
  heroHeadline: z.string().trim().default("Wine Menu Highlights"),
  heroSubheadline: z.string().trim().default("Curated pairings for your table"),
  colorPalette: z.array(z.string().trim().min(1)).default([]),
  componentPlan: z
    .array(
      z.object({
        component: z.string().trim().min(1),
        purpose: z.string().trim().min(1),
      }),
    )
    .default([]),
});

export const marketingCopyResultSchema = z.object({
  restaurantSummary: z.string().trim().min(1),
  wines: z.array(generatedWineSchema).default([]),
  featuredPromo: z.string().trim().optional(),
  renderPage: z
    .object({
      hero: z.object({
        headline: z.string().trim().min(1),
        subheadline: z.string().trim().min(1),
      }),
      intro: z.string().trim().min(1),
      wineSections: z.array(generatedPageSectionSchema).default([]),
      featuredBlock: z
        .object({
          headline: z.string().trim().optional(),
          text: z.string().trim().min(1),
        })
        .optional(),
      components: z.array(generatedPageComponentSchema).default([]),
    })
    .optional(),
  pageDesign: pageDesignSchema.default({
    targetAudience: "Restaurant guests",
    toneApplied: "Warm and premium",
    visualStyle: "Editorial wine menu",
    heroHeadline: "Wine Menu Highlights",
    heroSubheadline: "Curated pairings for your table",
    colorPalette: [],
    componentPlan: [],
  }),
});

export const structuredDraftSchema = z.object({
  restaurantSummary: z.string().trim().min(1),
  toneSummary: z.string().trim().default(""),
  copyDirection: z.string().trim().default(""),
  visualDirection: z.string().trim().default(""),
  wines: z
    .array(
      z.object({
        wineName: z.string().trim().min(1),
        relevantWineFacts: z.array(z.string().trim().min(1)).default([]),
        dishFacts: z.array(z.string().trim().min(1)).default([]),
        pairingRationale: z.string().trim().default(""),
        approvedClaimsUsed: z.array(z.string().trim().min(1)).default([]),
        groundedSources: z.array(z.string().trim().min(1)).default([]),
        imageDirection: z.string().trim().default(""),
      }),
    )
    .default([]),
  featuredPromoDirection: z.string().trim().optional(),
  componentPlan: z
    .array(
      z.object({
        component: z.string().trim().min(1),
        purpose: z.string().trim().min(1),
      }),
    )
    .default([]),
});

export type StructuredDraft = z.infer<typeof structuredDraftSchema>;
export type MarketingCopyResult = z.infer<typeof marketingCopyResultSchema>;
export type GeneratedMenuPage = z.infer<typeof generatedMenuPageSchema>;
