export const SOURCE_TYPES = ["ops", "restaurant"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export type IngestionInput = {
  merchantId: string;
  sourceType: SourceType;
  files: File[];
};

export type ExtractionBlock = {
  blockIndex: number;
  pageNumber: number | null;
  rawText: string;
  metadata: Record<string, string | number>;
};

export type ParsedFile = {
  fileName: string;
  mimeType: string;
  sourceType: SourceType;
  merchantId: string;
  rawText: string;
  extractedBlocks: ExtractionBlock[];
  metadata: Record<string, string | number>;
};

export type NormalizedSection = {
  sectionOrder: number;
  sectionTitle: string | null;
  sectionText: string;
  metadata: Record<string, string | number>;
};

export type ChunkRecord = {
  chunkIndex: number;
  tokenCount: number;
  content: string;
  sectionOrder: number;
  sectionTitle: string | null;
  pageNumber: number | null;
  metadata: Record<string, string | number>;
};

export type StructuredExtractionResult = {
  restaurantProfile:
    | {
        restaurantName: string;
        cuisineType?: string;
        toneOfVoice?: string;
        brandStory?: string;
        targetAudience?: string;
        pricePositioning?: string;
      }
    | null;
  menuItems: Array<{
    name: string;
    description?: string;
    category?: string;
  }>;
  wines: Array<{
    name: string;
    producer?: string;
    region?: string;
    grapeVarietal?: string;
    tastingNotes?: string;
    approvedClaims?: string;
  }>;
  pairingRules: Array<{
    wineName: string;
    pairWith?: string;
    avoidWith?: string;
    rationale?: string;
  }>;
};
