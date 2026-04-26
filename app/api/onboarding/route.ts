import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import { onboardingSubmissionSchema } from "@/lib/validation/forms";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type OnboardingProfileRow = {
  restaurant_name: string | null;
  restaurant_location: string | null;
  restaurant_street_address: string | null;
  restaurant_address_line2: string | null;
  restaurant_city: string | null;
  restaurant_state: string | null;
  restaurant_country: string | null;
  restaurant_website: string | null;
  menu_pdf_file_name: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  restaurant_vibe: string | null;
  cuisine_type: string | null;
  target_clientele: string | null;
  tone_of_voice: string | null;
  beverage_program_goals: string | null;
  metadata: Record<string, unknown> | null;
  onboarding_completed_at: string | null;
};

function splitLocationParts(location: string | null) {
  if (!location) {
    return {
      restaurantStreetAddress: "",
      restaurantCity: "",
      restaurantCountry: "",
    };
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return {
      restaurantStreetAddress: parts.slice(0, -2).join(", "),
      restaurantCity: parts[parts.length - 2] ?? "",
      restaurantCountry: parts[parts.length - 1] ?? "",
    };
  }

  if (parts.length === 2) {
    return {
      restaurantStreetAddress: parts[0] ?? "",
      restaurantCity: parts[1] ?? "",
      restaurantCountry: "",
    };
  }

  return {
    restaurantStreetAddress: parts[0] ?? "",
    restaurantCity: "",
    restaurantCountry: "",
  };
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isUserAdmin(user: Awaited<ReturnType<typeof currentUser>>) {
  return user?.privateMetadata?.role === "admin";
}

function isUserEmailVerified(user: Awaited<ReturnType<typeof currentUser>>) {
  return user?.primaryEmailAddress?.verification?.status === "verified";
}

function ensureVerifiedEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  const isEmailVerified = isUserEmailVerified(user);
  if (!isEmailVerified) {
    return NextResponse.json(
      { error: "Confirm your email before onboarding." },
      { status: 403 },
    );
  }
  return null;
}

function normalizeProfile(row: OnboardingProfileRow | null) {
  const metadataBeverageProgramGoals =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.beverageProgramGoals === "string"
      ? row.metadata.beverageProgramGoals
      : "";
  const metadataStreetAddress =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantStreetAddress === "string"
      ? row.metadata.restaurantStreetAddress
      : "";
  const metadataLocationAddress =
    row?.metadata &&
    typeof row.metadata === "object" &&
    row.metadata.location &&
    typeof row.metadata.location === "object" &&
    typeof (row.metadata.location as Record<string, unknown>).address === "string"
      ? ((row.metadata.location as Record<string, unknown>).address as string)
      : "";
  const metadataCity =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantCity === "string"
      ? row.metadata.restaurantCity
      : "";
  const metadataLocationCity =
    row?.metadata &&
    typeof row.metadata === "object" &&
    row.metadata.location &&
    typeof row.metadata.location === "object" &&
    typeof (row.metadata.location as Record<string, unknown>).city === "string"
      ? ((row.metadata.location as Record<string, unknown>).city as string)
      : "";
  const metadataAddressLine2 =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantAddressLine2 === "string"
      ? row.metadata.restaurantAddressLine2
      : "";
  const metadataState =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantState === "string"
      ? row.metadata.restaurantState
      : "";
  const metadataLocationState =
    row?.metadata &&
    typeof row.metadata === "object" &&
    row.metadata.location &&
    typeof row.metadata.location === "object" &&
    typeof (row.metadata.location as Record<string, unknown>).state === "string"
      ? ((row.metadata.location as Record<string, unknown>).state as string)
      : "";
  const metadataCountry =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantCountry === "string"
      ? row.metadata.restaurantCountry
      : "";
  const metadataLocationCountry =
    row?.metadata &&
    typeof row.metadata === "object" &&
    row.metadata.location &&
    typeof row.metadata.location === "object" &&
    typeof (row.metadata.location as Record<string, unknown>).country === "string"
      ? ((row.metadata.location as Record<string, unknown>).country as string)
      : "";
  const metadataMenuPdfFileName =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.menuPdfFileName === "string"
      ? row.metadata.menuPdfFileName
      : "";
  const fallbackLocationParts = splitLocationParts(row?.restaurant_location ?? null);

  return {
    restaurantName: row?.restaurant_name ?? "",
    restaurantStreetAddress:
      row?.restaurant_street_address ||
      metadataStreetAddress ||
      metadataLocationAddress ||
      fallbackLocationParts.restaurantStreetAddress,
    restaurantAddressLine2: row?.restaurant_address_line2 || metadataAddressLine2,
    restaurantCity:
      row?.restaurant_city ||
      metadataCity ||
      metadataLocationCity ||
      fallbackLocationParts.restaurantCity,
    restaurantState: row?.restaurant_state || metadataState || metadataLocationState,
    restaurantCountry:
      row?.restaurant_country ||
      metadataCountry ||
      metadataLocationCountry ||
      fallbackLocationParts.restaurantCountry,
    restaurantWebsite: row?.restaurant_website ?? "",
    menuPdfFileName: row?.menu_pdf_file_name || metadataMenuPdfFileName,
    brandPrimaryColor: row?.brand_primary_color ?? "#4A165C",
    brandAccentColor: row?.brand_accent_color ?? "#C4A574",
    restaurantVibe: row?.restaurant_vibe ?? "",
    cuisineType: row?.cuisine_type ?? "",
    targetClientele: row?.target_clientele ?? "",
    toneOfVoice: row?.tone_of_voice ?? "",
    beverageProgramGoals: row?.beverage_program_goals || metadataBeverageProgramGoals,
    completedAt: row?.onboarding_completed_at ?? null,
    isCompleted: Boolean(row?.onboarding_completed_at),
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedResponse();
  }
  const user = await currentUser();
  const isAdmin = isUserAdmin(user);

  const emailGateResponse = isAdmin ? null : ensureVerifiedEmail(user);
  if (emailGateResponse && !isAdmin) {
    return emailGateResponse;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select(
      "restaurant_name,restaurant_location,restaurant_street_address,restaurant_address_line2,restaurant_city,restaurant_state,restaurant_country,restaurant_website,menu_pdf_file_name,brand_primary_color,brand_accent_color,restaurant_vibe,cuisine_type,target_clientele,tone_of_voice,beverage_program_goals,metadata,onboarding_completed_at",
    )
    .eq("merchant_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    userId,
    isAdmin,
    profile: normalizeProfile((data as OnboardingProfileRow | null) ?? null),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedResponse();
  }
  const user = await currentUser();
  const emailGateResponse = ensureVerifiedEmail(user);
  if (emailGateResponse) {
    return emailGateResponse;
  }

  const body = await request.json();
  const validation = onboardingSubmissionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues.map((issue) => issue.message).join(" ") },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: existingProfile, error: fetchError } = await supabase
    .from("restaurant_profiles")
    .select("metadata,onboarding_completed_at")
    .eq("merchant_id", userId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (existingProfile?.onboarding_completed_at) {
    return NextResponse.json(
      { error: "Onboarding has already been completed." },
      { status: 409 },
    );
  }

  const restaurantLocation = [
    validation.data.restaurantStreetAddress,
    validation.data.restaurantAddressLine2,
    validation.data.restaurantCity,
    validation.data.restaurantState,
    validation.data.restaurantCountry,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
  const mergedMetadata = {
    ...((existingProfile?.metadata as Record<string, unknown> | null) ?? {}),
    clerkUserId: userId,
    restaurantName: validation.data.restaurantName,
    restaurantLocation,
    location: {
      address: validation.data.restaurantStreetAddress,
      addressLine2: validation.data.restaurantAddressLine2,
      city: validation.data.restaurantCity,
      state: validation.data.restaurantState,
      country: validation.data.restaurantCountry,
      fullAddress: restaurantLocation,
    },
    beverageProgramGoals: validation.data.beverageProgramGoals,
    restaurantStreetAddress: validation.data.restaurantStreetAddress,
    restaurantAddressLine2: validation.data.restaurantAddressLine2,
    restaurantCity: validation.data.restaurantCity,
    restaurantState: validation.data.restaurantState,
    restaurantCountry: validation.data.restaurantCountry,
    restaurantWebsite: validation.data.restaurantWebsite,
    menuPdfFileName: validation.data.menuPdfFileName,
    brandPrimaryColor: validation.data.brandPrimaryColor,
    brandAccentColor: validation.data.brandAccentColor,
    restaurantVibe: validation.data.restaurantVibe,
    cuisineType: validation.data.cuisineType,
    targetClientele: validation.data.targetClientele,
    toneOfVoice: validation.data.toneOfVoice,
  };

  const { error: upsertError } = await supabase.from("restaurant_profiles").upsert(
    {
      merchant_id: userId,
      restaurant_name: validation.data.restaurantName,
      restaurant_location: restaurantLocation,
      restaurant_street_address: validation.data.restaurantStreetAddress,
      restaurant_address_line2: validation.data.restaurantAddressLine2 || null,
      restaurant_city: validation.data.restaurantCity,
      restaurant_state: validation.data.restaurantState || null,
      restaurant_country: validation.data.restaurantCountry,
      restaurant_website: validation.data.restaurantWebsite || null,
      menu_pdf_file_name: validation.data.menuPdfFileName || null,
      brand_primary_color: validation.data.brandPrimaryColor,
      brand_accent_color: validation.data.brandAccentColor || null,
      restaurant_vibe: validation.data.restaurantVibe,
      cuisine_type: validation.data.cuisineType,
      target_clientele: validation.data.targetClientele,
      tone_of_voice: validation.data.toneOfVoice,
      beverage_program_goals: validation.data.beverageProgramGoals,
      metadata: mergedMetadata,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "merchant_id",
    },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
