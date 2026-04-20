import { getChatModel, getOpenAIClient, withOpenAIRetry } from "@/lib/ai/openai";
import { retrieveContext } from "@/lib/retrieval/retrieve-context";
import {
  generatedMenuPageSchema,
  GeneratedMenuPage,
  MarketingCopyResult,
  marketingCopyResultSchema,
  structuredDraftSchema,
  StructuredDraft,
} from "@/lib/schemas/generation";
import { buildMarketingPrompt } from "@/prompts/marketingCopy";
import { buildStructuredDraftPrompt } from "@/prompts/structuredDraft";

function parseJsonOutput<T>(output: string, fallback: T): T {
  const trimmed = output.trim();
  const candidate = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return fallback;
  }
}

function defaultStructuredDraft(): StructuredDraft {
  return {
    restaurantSummary: "Restaurant-specific wine copy direction",
    toneSummary: "",
    copyDirection: "",
    visualDirection: "",
    wines: [],
    componentPlan: [],
  };
}

function defaultMarketingResult(): MarketingCopyResult {
  return {
    restaurantSummary: "Restaurant wine highlights",
    wines: [],
    pageDesign: {
      targetAudience: "Restaurant guests",
      toneApplied: "Warm and premium",
      visualStyle: "Editorial wine menu",
      heroHeadline: "Wine Menu Highlights",
      heroSubheadline: "Curated pairings for your table",
      colorPalette: [],
      componentPlan: [],
    },
    renderPage: {
      hero: {
        headline: "Wine Menu Highlights",
        subheadline: "Curated pairings for your table",
      },
      intro: "A guest-ready menu highlighting wines and pairings.",
      wineSections: [],
      components: [],
    },
  };
}

function normalizeGeneratedPage(parsed: GeneratedMenuPage): MarketingCopyResult {
  const page = parsed.page;
  const wines = page.wineSections.flatMap((section) =>
    section.items.map((item) => ({
      wineName: item.wineName,
      menuCopy: item.description,
      pairingSuggestions: [item.pairing],
      rationale: "",
      groundedSources: [],
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt ?? `${item.wineName} presentation`,
      visualNotes: [`Presented under ${section.title}`],
    })),
  );

  return {
    restaurantSummary: page.intro,
    wines,
    featuredPromo: page.featuredBlock?.text,
    renderPage: page,
    pageDesign: {
      targetAudience: "Restaurant guests",
      toneApplied: "Brand tone from merchant brief",
      visualStyle: "AI-generated menu layout",
      heroHeadline: page.hero.headline,
      heroSubheadline: page.hero.subheadline,
      colorPalette: [],
      componentPlan: page.components.map((component) => ({
        component: component.type,
        purpose:
          component.title ??
          component.text ??
          "AI-defined page component for the menu layout",
      })),
    },
  };
}

function normalizeMarketingResult(parsed: unknown): MarketingCopyResult {
  const legacy = marketingCopyResultSchema.safeParse(parsed);
  if (legacy.success) {
    return legacy.data;
  }

  const pageResult = generatedMenuPageSchema.safeParse(parsed);
  if (pageResult.success) {
    return normalizeGeneratedPage(pageResult.data);
  }

  return defaultMarketingResult();
}

function toLegacyPresentation(result: MarketingCopyResult) {
  const title = result.restaurantSummary || "Wine Menu Highlights";
  const pairings = result.wines.flatMap((wine) => wine.pairingSuggestions).slice(0, 3);
  const marketingCopy = [
    result.restaurantSummary,
    ...result.wines.map((wine) => `${wine.wineName}: ${wine.menuCopy}`),
    result.featuredPromo ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { title, marketingCopy, pairings };
}

export async function generateMarketingCopy(params: {
  merchantId: string;
  sourceTypes: Array<"ops" | "restaurant">;
  brief: string;
  onRetrievalReady?: (summary: string) => Promise<void> | void;
  onDraftReady?: () => Promise<void> | void;
  onRenderStart?: () => Promise<void> | void;
}) {
  const chunks = await retrieveContext({
    merchantId: params.merchantId,
    sourceTypes: params.sourceTypes,
    query: params.brief,
    topK: 6,
  });
  await params.onRetrievalReady?.(
    `ops=${chunks.opsChunks.length}, merchant=${chunks.merchantChunks.length}, total=${chunks.chunks.length}`,
  );

  const openai = getOpenAIClient();
  const structuredDraftPrompt = buildStructuredDraftPrompt({
    brief: params.brief,
    context: chunks,
  });

  const structuredDraftResponse = await withOpenAIRetry(() =>
    openai.responses.create({
      model: getChatModel(),
      input: [
        {
          role: "user",
          content: structuredDraftPrompt,
        },
      ],
    }),
  );

  const parsedDraft = parseJsonOutput(
    structuredDraftResponse.output_text,
    defaultStructuredDraft(),
  );
  const validatedDraft = structuredDraftSchema.parse(parsedDraft);
  await params.onDraftReady?.();

  const finalPrompt = buildMarketingPrompt({
    brief: params.brief,
    draft: validatedDraft,
  });
  await params.onRenderStart?.();
  const finalResponse = await withOpenAIRetry(() =>
    openai.responses.create({
      model: getChatModel(),
      input: [
        {
          role: "user",
          content: finalPrompt,
        },
      ],
    }),
  );
  const parsedFinal = parseJsonOutput<unknown>(finalResponse.output_text, defaultMarketingResult());
  const normalizedFinal = normalizeMarketingResult(parsedFinal);
  const validatedFinal = marketingCopyResultSchema.parse(normalizedFinal);
  const legacy = toLegacyPresentation(validatedFinal);

  return {
    ...validatedFinal,
    ...legacy,
    retrieval: {
      retrievalVersion: chunks.retrievalVersion,
      rewrittenQuery: chunks.rewrittenQuery,
    },
    sources: chunks.chunks.map((chunk) => ({
      id: chunk.id,
      fileName: chunk.fileName,
      sourceType: chunk.sourceType,
      score: chunk.score,
      sectionTitle: chunk.sectionTitle,
      pageNumber: chunk.pageNumber,
    })),
    structuredDraft: validatedDraft,
  };
}
