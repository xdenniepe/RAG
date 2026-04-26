import { getChatModel, getOpenAIClient, withOpenAIRetry } from "@/lib/ai/openai";
import { retrieveContext } from "@/lib/retrieval/retrieve-context";
import {
  generatedMenuArtifactSchema,
  GeneratedMenuArtifact,
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

function normalizeWineKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePairingList(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/[,\n;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniq(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function normalizeGeneratedMenuArtifact(parsed: GeneratedMenuArtifact): MarketingCopyResult {
  const menu = parsed.menu;
  const wineSections = menu.sections.map((section) => ({
    title: section.title,
    items: section.wines.map((wine) => ({
      wineName: wine.wineName,
      description: wine.description,
      pairing: wine.pairing,
      imageUrl: wine.imageUrl,
      imageAlt: wine.imageAlt ?? `${wine.wineName} presentation`,
    })),
  }));

  const wines = wineSections.flatMap((section) =>
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
    restaurantSummary: menu.header.subtitle,
    wines,
    featuredPromo: menu.featuredWine
      ? `${menu.featuredWine.wineName}: ${menu.featuredWine.highlight} Pairing: ${menu.featuredWine.pairing}`
      : undefined,
    renderPage: {
      hero: {
        headline: menu.header.title,
        subheadline: menu.header.subtitle,
      },
      intro: menu.header.subtitle,
      wineSections,
      featuredBlock: menu.featuredWine
        ? {
            headline: menu.featuredWine.wineName,
            text: `${menu.featuredWine.highlight} Pairing: ${menu.featuredWine.pairing}`,
          }
        : undefined,
      components: [],
    },
    pageDesign: {
      targetAudience: "Restaurant guests",
      toneApplied: "Brand tone from merchant brief",
      visualStyle: "AI-generated menu layout",
      heroHeadline: menu.header.title,
      heroSubheadline: menu.header.subtitle,
      colorPalette: [],
      componentPlan: menu.sections.map((section) => ({
        component: section.title,
        purpose: `Wine section with ${section.wines.length} selections`,
      })),
    },
  };
}

function ensureAllAvailableWines(params: {
  result: MarketingCopyResult;
  structured: {
    menuItems: Array<{ name: string }>;
    wines: Array<{
      id: string;
      name: string;
      producer: string | null;
      region: string | null;
      tastingNotes: string | null;
      approvedClaims: string | null;
    }>;
    pairingRules: Array<{
      wineId: string;
      pairWith: string | null;
      avoidWith: string | null;
      rationale: string | null;
    }>;
  };
}) {
  const { result, structured } = params;
  const existingWineKeys = new Set(
    result.wines.map((wine) => normalizeWineKey(wine.wineName)),
  );

  const menuDishNames = uniq(
    structured.menuItems.map((item) => item.name.trim()).filter(Boolean),
  );

  const extraWines = structured.wines
    .filter((wine) => wine.name.trim().length > 0)
    .filter((wine) => !existingWineKeys.has(normalizeWineKey(wine.name)))
    .map((wine) => {
      const rulePairings = uniq(
        structured.pairingRules
          .filter((rule) => rule.wineId === wine.id)
          .flatMap((rule) => parsePairingList(rule.pairWith)),
      );
      const fallbackPairings = menuDishNames.slice(0, 3);
      const pairingSuggestions = uniq([...rulePairings, ...fallbackPairings]);
      const bestWith =
        pairingSuggestions[0] ??
        "Chef's featured dishes";
      const producerRegion = [wine.producer, wine.region]
        .filter((value): value is string => Boolean(value))
        .join(", ");
      const description =
        wine.tastingNotes ??
        wine.approvedClaims ??
        (producerRegion || "Menu-ready wine selection from the current list.");

      return {
        wineName: wine.name,
        menuCopy: description,
        pairingSuggestions: [bestWith, ...pairingSuggestions.slice(1, 4)],
        rationale: "",
        groundedSources: [],
        imageAlt: `${wine.name} presentation`,
        visualNotes: ["Included from merchant available wines list"],
      };
    });

  if (!extraWines.length) {
    return result;
  }

  const extraSection = {
    title: "More Available Wines",
    items: extraWines.map((wine) => ({
      wineName: wine.wineName,
      description: wine.menuCopy,
      pairing: wine.pairingSuggestions[0] ?? "Chef's featured dishes",
      imageAlt: wine.imageAlt,
    })),
  };

  return {
    ...result,
    wines: [...result.wines, ...extraWines],
    renderPage: result.renderPage
      ? {
          ...result.renderPage,
          wineSections: [...result.renderPage.wineSections, extraSection],
        }
      : {
          hero: {
            headline: result.pageDesign.heroHeadline,
            subheadline: result.pageDesign.heroSubheadline,
          },
          intro: result.restaurantSummary,
          wineSections: [extraSection],
          components: [],
        },
    pageDesign: {
      ...result.pageDesign,
      componentPlan: [
        ...result.pageDesign.componentPlan,
        {
          component: extraSection.title,
          purpose: `Auto-appended ${extraWines.length} missing available wines`,
        },
      ],
    },
  };
}

function normalizeMarketingResult(parsed: unknown): MarketingCopyResult {
  const legacy = marketingCopyResultSchema.safeParse(parsed);
  if (legacy.success) {
    return legacy.data;
  }

  const artifactResult = generatedMenuArtifactSchema.safeParse(parsed);
  if (artifactResult.success) {
    return normalizeGeneratedMenuArtifact(artifactResult.data);
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
  const normalizedFinal = ensureAllAvailableWines({
    result: normalizeMarketingResult(parsedFinal),
    structured: chunks.structured,
  });
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
