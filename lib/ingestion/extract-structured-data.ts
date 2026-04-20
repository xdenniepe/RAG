import {
  NormalizedSection,
  SourceType,
  StructuredExtractionResult,
} from "@/lib/ingestion/types";

function captureField(text: string, label: string): string | undefined {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, "gim");
  const match = pattern.exec(text);
  return match?.[1]?.trim() || undefined;
}

function parseCsvLikeList(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(/[,\n;]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseMenuItemsFromLines(corpus: string) {
  const lines = corpus.split("\n");
  return lines
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith("menu item:"))
    .map((line) => line.replace(/^menu item:\s*/i, "").trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, ...descriptionParts] = entry.split(" - ");
      return {
        name: name?.trim() ?? "",
        description: descriptionParts.join(" - ").trim() || undefined,
      };
    })
    .filter((item) => item.name.length > 0);
}

export function extractStructuredData(params: {
  sourceType: SourceType;
  sections: NormalizedSection[];
}): StructuredExtractionResult {
  const corpus = params.sections.map((section) => section.sectionText).join("\n\n");

  if (params.sourceType === "restaurant") {
    const restaurantName = captureField(corpus, "Restaurant Name");
    const cuisineType = captureField(corpus, "Cuisine Style");
    const brandTone = captureField(corpus, "Brand Tone");
    const menuHighlights = parseCsvLikeList(captureField(corpus, "Menu Highlights"));
    const restaurantStory = captureField(corpus, "Restaurant Story");
    const menuItemsFromLines = parseMenuItemsFromLines(corpus);
    const mergedMenuItems = [
      ...menuItemsFromLines,
      ...menuHighlights.map((name) => ({ name, description: undefined })),
    ];
    const dedupedMenuItems = mergedMenuItems.reduce<Array<{
      name: string;
      description?: string;
    }>>((items, candidate) => {
      if (
        items.some(
          (item) => item.name.toLowerCase() === candidate.name.toLowerCase(),
        )
      ) {
        return items;
      }
      items.push(candidate);
      return items;
    }, []);

    return {
      restaurantProfile: restaurantName
        ? {
            restaurantName,
            cuisineType,
            toneOfVoice: brandTone,
            brandStory: restaurantStory,
          }
        : null,
      menuItems: dedupedMenuItems.map((item) => ({
        name: item.name,
        description: item.description,
        category: cuisineType,
      })),
      wines: [],
      pairingRules: [],
    };
  }

  const wineName = captureField(corpus, "Wine Name");
  const producer = captureField(corpus, "Producer") ?? captureField(corpus, "Producer / Winery");
  const region = captureField(corpus, "Region");
  const tastingNotes = captureField(corpus, "Tasting Notes");
  const approvedClaims =
    captureField(corpus, "Marketing Angle") ?? captureField(corpus, "Approved Claims");
  const pairWith = captureField(corpus, "Pair With");
  const avoidWith = captureField(corpus, "Avoid With");

  return {
    restaurantProfile: null,
    menuItems: [],
    wines: wineName
      ? [
          {
            name: wineName,
            producer,
            region,
            tastingNotes,
            approvedClaims,
          },
        ]
      : [],
    pairingRules: wineName
      ? [
          {
            wineName,
            pairWith,
            avoidWith,
            rationale: captureField(corpus, "Pairing Rationale"),
          },
        ]
      : [],
  };
}
