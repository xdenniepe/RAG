import { getSupabaseAdminClient } from "@/lib/supabase/server";

import { RetrievedChunk } from "@/lib/retrieval/retrieve-admin";

export type RetrievalContextPackage = {
  opsChunks: RetrievedChunk[];
  merchantChunks: RetrievedChunk[];
  structured: {
    restaurantProfile: {
      restaurantName: string;
      cuisineType: string | null;
      toneOfVoice: string | null;
      brandStory: string | null;
      targetAudience: string | null;
      pricePositioning: string | null;
    } | null;
    menuItems: Array<{
      name: string;
      description: string | null;
      category: string | null;
    }>;
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
};

export async function assembleContextPackage(params: {
  merchantId: string;
  opsChunks: RetrievedChunk[];
  merchantChunks: RetrievedChunk[];
}): Promise<RetrievalContextPackage> {
  const supabase = getSupabaseAdminClient();

  const [profileRes, menuRes, wineRes, rulesRes] = await Promise.all([
    supabase
      .from("restaurant_profiles")
      .select(
        "restaurant_name,cuisine_type,tone_of_voice,brand_story,target_audience,price_positioning",
      )
      .eq("merchant_id", params.merchantId)
      .maybeSingle(),
    supabase
      .from("menu_items")
      .select("name,description,category")
      .eq("merchant_id", params.merchantId)
      .limit(20),
    supabase
      .from("wines")
      .select("id,name,producer,region,tasting_notes,approved_claims")
      .eq("merchant_id", params.merchantId)
      .limit(20),
    supabase
      .from("wine_pairing_rules")
      .select("wine_id,pair_with,avoid_with,pairing_rationale")
      .limit(40),
  ]);

  const rulesError = rulesRes.error;
  if (
    profileRes.error &&
    profileRes.error.code !== "42P01" &&
    profileRes.error.code !== "42703"
  ) {
    throw new Error(`Failed loading restaurant profile: ${profileRes.error.message}`);
  }
  if (menuRes.error && menuRes.error.code !== "42P01" && menuRes.error.code !== "42703") {
    throw new Error(`Failed loading menu items: ${menuRes.error.message}`);
  }
  if (wineRes.error && wineRes.error.code !== "42P01" && wineRes.error.code !== "42703") {
    throw new Error(`Failed loading wines: ${wineRes.error.message}`);
  }
  if (rulesError && rulesError.code !== "42P01" && rulesError.code !== "42703") {
    throw new Error(`Failed loading pairing rules: ${rulesError.message}`);
  }

  const wines = (wineRes.data ?? []) as Array<{
    id: string;
    name: string;
    producer: string | null;
    region: string | null;
    tasting_notes: string | null;
    approved_claims: string | null;
  }>;
  const wineIds = new Set(wines.map((wine) => wine.id));

  return {
    opsChunks: params.opsChunks,
    merchantChunks: params.merchantChunks,
    structured: {
      restaurantProfile: profileRes.data
        ? {
            restaurantName: profileRes.data.restaurant_name,
            cuisineType: profileRes.data.cuisine_type,
            toneOfVoice: profileRes.data.tone_of_voice,
            brandStory: profileRes.data.brand_story,
            targetAudience: profileRes.data.target_audience,
            pricePositioning: profileRes.data.price_positioning,
          }
        : null,
      menuItems: (menuRes.data ?? []) as Array<{
        name: string;
        description: string | null;
        category: string | null;
      }>,
      wines: wines.map((wine) => ({
        id: wine.id,
        name: wine.name,
        producer: wine.producer,
        region: wine.region,
        tastingNotes: wine.tasting_notes,
        approvedClaims: wine.approved_claims,
      })),
      pairingRules: ((rulesRes.data ?? []) as Array<{
        wine_id: string;
        pair_with: string | null;
        avoid_with: string | null;
        pairing_rationale: string | null;
      }>)
        .filter((rule) => wineIds.has(rule.wine_id))
        .map((rule) => ({
          wineId: rule.wine_id,
          pairWith: rule.pair_with,
          avoidWith: rule.avoid_with,
          rationale: rule.pairing_rationale,
        })),
    },
  };
}
