"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Pipette } from "lucide-react";
import { Country, State } from "country-state-city";
import Select, { type StylesConfig } from "react-select";
import { HexColorPicker } from "react-colorful";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  onboardingAccountInfoSchema,
  onboardingBrandIdentitySchema,
  onboardingRestaurantContextSchema,
  onboardingRestaurantDetailsSchema,
  onboardingSubmissionSchema,
} from "@/lib/validation/forms";

const VIBE_OPTIONS = [
  "Fine Dining",
  "Fine Casual / Upscale Casual",
  "Casual / Neighborhood",
  "Wine Bar / Specialty Bar",
] as const;

const ONBOARDING_DRAFT_STORAGE_PREFIX = "tastefari:onboarding-draft:";

function getSafeHexColor(value: string, fallbackHex: string) {
  return /^#([A-Fa-f0-9]{6})$/.test(value.trim()) ? value.trim() : fallbackHex;
}

type OnboardingState = {
  accountName: string;
  restaurantName: string;
  streetAddress: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  restaurantLocation: string;
  restaurantWebsite: string;
  menuPdfFileName: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  restaurantVibe: string[];
  cuisineType: string;
  targetClientele: string;
  toneOfVoice: string;
  beverageProgramGoals: string;
};

type OnboardingApiProfile = {
  accountName: string;
  restaurantName: string;
  restaurantStreetAddress: string;
  restaurantAddressLine2: string;
  restaurantCity: string;
  restaurantState: string;
  restaurantCountry: string;
  restaurantWebsite: string;
  menuPdfFileName: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  restaurantVibe: string;
  cuisineType: string;
  targetClientele: string;
  toneOfVoice: string;
  beverageProgramGoals: string;
  isCompleted?: boolean;
};

type OnboardingDraftState = {
  form: OnboardingState;
  step: number;
  selectedCountryIso: string;
  selectedStateIso: string;
};

type LocationOption = {
  value: string;
  label: string;
};

type OnboardingStep = {
  title: string;
  description: string;
};

const INITIAL_STATE: OnboardingState = {
  accountName: "",
  restaurantName: "",
  streetAddress: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  restaurantLocation: "",
  restaurantWebsite: "",
  menuPdfFileName: "",
  brandPrimaryColor: "#4A165C",
  brandAccentColor: "#C4A574",
  restaurantVibe: [],
  cuisineType: "",
  targetClientele: "",
  toneOfVoice: "",
  beverageProgramGoals: "",
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Welcome to Tastefari",
    description: "Let's set up your restaurant profile",
  },
  {
    title: "Restaurant Details",
    description: "Tell us about your establishment",
  },
  {
    title: "Brand Identity",
    description: "Upload your logo and define your brand colors",
  },
  {
    title: "Restaurant Context",
    description: "Help us understand your concept and guest experience",
  },
];

export function RestaurantOnboardingClient() {
  const router = useRouter();
  const restaurantNameInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Loading onboarding...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<OnboardingState>(INITIAL_STATE);
  const [selectedCountryIso, setSelectedCountryIso] = useState("");
  const [selectedStateIso, setSelectedStateIso] = useState("");
  const [openColorPicker, setOpenColorPicker] = useState<"primary" | "accent" | null>(
    null,
  );
  const primaryPickerRef = useRef<HTMLDivElement | null>(null);
  const accentPickerRef = useRef<HTMLDivElement | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/onboarding");
        const payload = (await response.json()) as {
          userId?: string;
          profile?: Partial<OnboardingApiProfile>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load onboarding profile.");
        }
        if (payload.profile?.isCompleted) {
          router.replace("/dashboard");
          return;
        }
        const userId = payload.userId ?? null;
        setSessionUserId(userId);
        const serverForm = mapApiProfileToForm(payload.profile);
        const storageKey = userId ? `${ONBOARDING_DRAFT_STORAGE_PREFIX}${userId}` : null;
        const draft = storageKey
          ? parseDraft(window.localStorage.getItem(storageKey))
          : null;
        const mergedForm = draft ? { ...serverForm, ...draft.form } : serverForm;
        setForm(mergedForm);
        if (draft) {
          setStep(Math.min(Math.max(draft.step, 0), ONBOARDING_STEPS.length - 1));
          setSelectedCountryIso(draft.selectedCountryIso);
          setSelectedStateIso(draft.selectedStateIso);
        } else {
          const countryIso =
            Country.getAllCountries().find((item) => item.name === mergedForm.country)
              ?.isoCode ?? "";
          setSelectedCountryIso(countryIso);
          const stateIso = countryIso
            ? State.getStatesOfCountry(countryIso).find(
                (item) => item.name === mergedForm.state,
              )?.isoCode ?? ""
            : "";
          setSelectedStateIso(stateIso);
        }
        setStatus("");
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Failed to load onboarding.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, [router]);

  function setField<K extends keyof OnboardingState>(
    field: K,
    value: OnboardingState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toSubmissionData(currentForm: OnboardingState) {
    return {
      accountName: currentForm.accountName,
      restaurantName: currentForm.restaurantName,
      restaurantStreetAddress: currentForm.streetAddress,
      restaurantAddressLine2: currentForm.addressLine2,
      restaurantCity: currentForm.city,
      restaurantState: currentForm.state,
      restaurantCountry: currentForm.country,
      restaurantWebsite: currentForm.restaurantWebsite,
      menuPdfFileName: currentForm.menuPdfFileName,
      brandPrimaryColor: currentForm.brandPrimaryColor,
      brandAccentColor: currentForm.brandAccentColor,
      restaurantVibe: currentForm.restaurantVibe.join(", "),
      cuisineType: currentForm.cuisineType,
      targetClientele: currentForm.targetClientele,
      toneOfVoice: currentForm.toneOfVoice,
      beverageProgramGoals: currentForm.beverageProgramGoals,
    };
  }

  function mapApiProfileToForm(profile: Partial<OnboardingApiProfile> | undefined): OnboardingState {
    const parsedVibe =
      typeof profile?.restaurantVibe === "string"
        ? profile.restaurantVibe
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
    return {
      ...INITIAL_STATE,
      accountName: profile?.accountName ?? "",
      restaurantName: profile?.restaurantName ?? "",
      streetAddress: profile?.restaurantStreetAddress ?? "",
      addressLine2: profile?.restaurantAddressLine2 ?? "",
      city: profile?.restaurantCity ?? "",
      state: profile?.restaurantState ?? "",
      country: profile?.restaurantCountry ?? "",
      restaurantWebsite: profile?.restaurantWebsite ?? "",
      menuPdfFileName: profile?.menuPdfFileName ?? "",
      brandPrimaryColor: profile?.brandPrimaryColor ?? INITIAL_STATE.brandPrimaryColor,
      brandAccentColor: profile?.brandAccentColor ?? INITIAL_STATE.brandAccentColor,
      restaurantVibe: parsedVibe,
      cuisineType: profile?.cuisineType ?? "",
      targetClientele: profile?.targetClientele ?? "",
      toneOfVoice: profile?.toneOfVoice ?? "",
      beverageProgramGoals: profile?.beverageProgramGoals ?? "",
      restaurantLocation: "",
    };
  }

  function parseDraft(rawValue: string | null): OnboardingDraftState | null {
    if (!rawValue) {
      return null;
    }
    try {
      const parsed = JSON.parse(rawValue) as Partial<OnboardingDraftState>;
      if (!parsed.form || typeof parsed.form !== "object") {
        return null;
      }
      const mergedForm = { ...INITIAL_STATE, ...parsed.form };
      const rawRestaurantVibe = (parsed.form as { restaurantVibe?: unknown }).restaurantVibe;
      const normalizedRestaurantVibe = Array.isArray(rawRestaurantVibe)
        ? rawRestaurantVibe.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          )
        : typeof rawRestaurantVibe === "string" && rawRestaurantVibe.trim().length > 0
          ? rawRestaurantVibe
              .split(",")
              .map((value: string) => value.trim())
              .filter(Boolean)
          : [];
      const normalizedForm: OnboardingState = {
        ...mergedForm,
        restaurantVibe: normalizedRestaurantVibe,
      };

      return {
        form: normalizedForm,
        step: typeof parsed.step === "number" ? parsed.step : 0,
        selectedCountryIso:
          typeof parsed.selectedCountryIso === "string" ? parsed.selectedCountryIso : "",
        selectedStateIso:
          typeof parsed.selectedStateIso === "string" ? parsed.selectedStateIso : "",
      };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const locationParts = [
      form.streetAddress.trim(),
      form.addressLine2.trim(),
      form.city.trim(),
      form.state.trim(),
      form.country.trim(),
    ].filter(Boolean);
    const nextLocation = locationParts.join(", ");
    if (nextLocation !== form.restaurantLocation) {
      setForm((current) => ({ ...current, restaurantLocation: nextLocation }));
    }
  }, [
    form.streetAddress,
    form.addressLine2,
    form.city,
    form.state,
    form.country,
    form.restaurantLocation,
  ]);

  useEffect(() => {
    if (!sessionUserId || isLoading) {
      return;
    }
    const storageKey = `${ONBOARDING_DRAFT_STORAGE_PREFIX}${sessionUserId}`;
    const draft: OnboardingDraftState = {
      form,
      step,
      selectedCountryIso,
      selectedStateIso,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [form, isLoading, selectedCountryIso, selectedStateIso, sessionUserId, step]);

  const countryOptions = useMemo<LocationOption[]>(
    () =>
      Country.getAllCountries().map((item) => ({
        value: item.isoCode,
        label: item.name,
      })),
    [],
  );

  const stateOptions = useMemo<LocationOption[]>(
    () =>
      selectedCountryIso
        ? State.getStatesOfCountry(selectedCountryIso).map((item) => ({
            value: item.isoCode,
            label: item.name,
          }))
        : [],
    [selectedCountryIso],
  );

  const selectedCountryOption = useMemo(
    () => countryOptions.find((option) => option.value === selectedCountryIso) ?? null,
    [countryOptions, selectedCountryIso],
  );

  const selectedStateOption = useMemo(
    () => stateOptions.find((option) => option.value === selectedStateIso) ?? null,
    [stateOptions, selectedStateIso],
  );

  const locationSelectStyles = useMemo<StylesConfig<LocationOption, false>>(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 40,
        height: 40,
        borderRadius: 10,
        borderColor: state.isFocused ? "var(--focus-ring)" : "var(--input-border)",
        backgroundColor: "var(--input-background)",
        boxShadow: state.isFocused ? "0 0 0 2px var(--focus-ring)" : "none",
        "&:hover": {
          borderColor: "var(--input-border-hover)",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        height: 40,
        padding: "0 12px",
      }),
      indicatorsContainer: (base) => ({
        ...base,
        height: 40,
      }),
      input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
        color: "var(--control-foreground)",
      }),
      menu: (base) => ({
        ...base,
        zIndex: 50,
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? "var(--surface-elevated)" : "var(--input-background)",
        color: "var(--control-foreground)",
      }),
      singleValue: (base) => ({
        ...base,
        color: "var(--control-foreground)",
      }),
      placeholder: (base) => ({
        ...base,
        color: "var(--muted-foreground)",
      }),
    }),
    [],
  );

  useEffect(() => {
    if (isLoading || step !== 1) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      restaurantNameInputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isLoading, step]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!(event.target instanceof Node)) {
        return;
      }
      const clickedPrimary = primaryPickerRef.current?.contains(event.target);
      const clickedAccent = accentPickerRef.current?.contains(event.target);
      if (!clickedPrimary && !clickedAccent) {
        setOpenColorPicker(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function validateCurrentStep() {
    if (step === 0) {
      return onboardingAccountInfoSchema.safeParse({
        accountName: form.accountName,
      });
    }
    if (step === 1) {
      return onboardingRestaurantDetailsSchema.safeParse(toSubmissionData(form));
    }
    if (step === 2) {
      return onboardingBrandIdentitySchema.safeParse({
        brandPrimaryColor: form.brandPrimaryColor,
        brandAccentColor: form.brandAccentColor,
      });
    }
    return onboardingRestaurantContextSchema.safeParse({
      restaurantVibe: form.restaurantVibe.join(", "),
      cuisineType: form.cuisineType,
      targetClientele: form.targetClientele,
      toneOfVoice: form.toneOfVoice,
      beverageProgramGoals: form.beverageProgramGoals,
    });
  }

  function toggleVibe(option: string) {
    setForm((current) => {
      const hasOption = current.restaurantVibe.includes(option);
      return {
        ...current,
        restaurantVibe: hasOption
          ? current.restaurantVibe.filter((vibe) => vibe !== option)
          : [...current.restaurantVibe, option],
      };
    });
  }

  function handleNextStep() {
    const validation = validateCurrentStep();
    if (!validation.success) {
      setStatus(validation.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    setStatus("");
    setStep((current) => Math.min(current + 1, ONBOARDING_STEPS.length - 1));
  }

  function handlePreviousStep() {
    setStatus("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit() {
    const validation = onboardingSubmissionSchema.safeParse(toSubmissionData(form));
    if (!validation.success) {
      setStatus(validation.error.issues.map((issue) => issue.message).join(" "));
      return;
    }

    setIsSubmitting(true);
    setStatus("Saving your onboarding profile...");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to complete onboarding.");
      }
      if (sessionUserId) {
        window.localStorage.removeItem(
          `${ONBOARDING_DRAFT_STORAGE_PREFIX}${sessionUserId}`,
        );
      }
      setStatus("Onboarding complete. Redirecting...");
      router.replace("/dashboard");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to complete onboarding.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-10">
        <p className="text-sm text-[var(--muted-foreground)]">{status}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-6">
        <header className="space-y-2 text-center">
          <h1 className="flex items-center justify-center -ml-2 text-3xl font-semibold tracking-tight text-white">
            <Image
              src="/assets/logo.png"
              alt="Tastefari logo"
              width={44}
              height={44}
              className="size-20 object-contain"
              priority
            />
            <span className="text-4xl font-bold tracking-tight text-white">Tastefari</span>
          </h1>
          <p className="pt-1 text-base font-medium text-[var(--onboarding-hero-subtitle)]">
            Create premium product experiences for your guests
          </p>
        </header>

        <Card className="w-full max-w-2xl backdrop-blur-md mb-8">
          <CardContent className="space-y-6 p-6">
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {ONBOARDING_STEPS[step].title}
            </p>
            <p className="text-base text-[var(--muted-foreground)] pt-1">
              {ONBOARDING_STEPS[step].description}
            </p>
          </div>

          {step === 0 ? (
            <section className="space-y-6">
              <Label htmlFor="account-name">Your Name</Label>
              <Input
                id="account-name"
                value={form.accountName}
                onChange={(event) => setField("accountName", event.target.value)}
                placeholder="John Smith"
              />
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="restaurant-name">Restaurant Name</Label>
                <Input
                  ref={restaurantNameInputRef}
                  id="restaurant-name"
                  value={form.restaurantName}
                  onChange={(event) =>
                    setField("restaurantName", event.target.value)
                  }
                  placeholder="The Garden Table"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="restaurant-street-address">Street Address</Label>
                <Input
                  id="restaurant-street-address"
                  value={form.streetAddress}
                  onChange={(event) => setField("streetAddress", event.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="restaurant-city">City</Label>
                <Input
                  id="restaurant-city"
                  value={form.city}
                  onChange={(event) => setField("city", event.target.value)}
                  placeholder="Pasadena"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="restaurant-address-line-2">Address Line 2 (Optional)</Label>
                <Input
                  id="restaurant-address-line-2"
                  value={form.addressLine2}
                  onChange={(event) => setField("addressLine2", event.target.value)}
                  placeholder="Suite 200"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="restaurant-country">Country</Label>
                  <Select
                    inputId="restaurant-country"
                    className="w-full"
                    styles={locationSelectStyles}
                    options={countryOptions}
                    value={selectedCountryOption}
                    onChange={(option) => {
                      setSelectedCountryIso(option?.value ?? "");
                      setSelectedStateIso("");
                      setField("state", "");
                      setField("country", option?.label ?? "");
                    }}
                    placeholder="Select country"
                    isSearchable
                    isClearable
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="restaurant-state">State</Label>
                  {selectedCountryIso ? (
                    <Select
                      inputId="restaurant-state"
                      className="w-full"
                      styles={locationSelectStyles}
                      options={stateOptions}
                      value={selectedStateOption}
                      onChange={(option) => {
                        setSelectedStateIso(option?.value ?? "");
                        setField("state", option?.label ?? "");
                      }}
                      placeholder="Select state"
                      isSearchable
                      isClearable
                    />
                  ) : (
                    <Input id="restaurant-state" value="" placeholder="Select country first" disabled />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="restaurant-website">Website URL</Label>
                <Input
                  id="restaurant-website"
                  value={form.restaurantWebsite}
                  onChange={(event) =>
                    setField("restaurantWebsite", event.target.value)
                  }
                  placeholder="https://www.yourrestaurant.com"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="menu-pdf">Menu PDF (Optional)</Label>
                <Input
                  id="menu-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    setField("menuPdfFileName", selectedFile?.name ?? "");
                  }}
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Upload your menu to help us understand your offerings
                </p>
                {form.menuPdfFileName ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Selected: {form.menuPdfFileName}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative flex flex-col gap-2" ref={primaryPickerRef}>
                  <Label htmlFor="brand-primary-color">Primary Brand Color</Label>
                  <div className="relative">
                    <Input
                      id="brand-primary-color"
                      value={form.brandPrimaryColor}
                      onChange={(event) =>
                        setField("brandPrimaryColor", event.target.value)
                      }
                      placeholder="e.g. primary brand color"
                      className="pr-11"
                    />
                    <button
                      type="button"
                      aria-label="Open primary color picker"
                      onClick={() =>
                        setOpenColorPicker((current) =>
                          current === "primary" ? null : "primary",
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-[var(--input-border)] bg-[var(--surface-elevated)] p-1 text-[var(--muted-foreground)] transition hover:border-[var(--input-border-hover)]"
                    >
                      <Pipette className="h-4 w-4" />
                    </button>
                  </div>
                  {openColorPicker === "primary" ? (
                    <div className="absolute left-0 top-full z-20 mt-2 rounded-md border border-[var(--input-border)] bg-[var(--surface)] p-2 shadow-soft">
                      <HexColorPicker
                        color={getSafeHexColor(form.brandPrimaryColor, "#4A165C")}
                        onChange={(nextColor) => setField("brandPrimaryColor", nextColor)}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="relative flex flex-col gap-2" ref={accentPickerRef}>
                  <Label htmlFor="brand-accent-color">Accent Color (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="brand-accent-color"
                      value={form.brandAccentColor}
                      onChange={(event) =>
                        setField("brandAccentColor", event.target.value)
                      }
                      placeholder="e.g. accent color"
                      className="pr-11"
                    />
                    <button
                      type="button"
                      aria-label="Open accent color picker"
                      onClick={() =>
                        setOpenColorPicker((current) =>
                          current === "accent" ? null : "accent",
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-[var(--input-border)] bg-[var(--surface-elevated)] p-1 text-[var(--muted-foreground)] transition hover:border-[var(--input-border-hover)]"
                    >
                      <Pipette className="h-4 w-4" />
                    </button>
                  </div>
                  {openColorPicker === "accent" ? (
                    <div className="absolute left-0 top-full z-20 mt-2 rounded-md border border-[var(--input-border)] bg-[var(--surface)] p-2 shadow-soft">
                      <HexColorPicker
                        color={getSafeHexColor(form.brandAccentColor, "#C4A574")}
                        onChange={(nextColor) => setField("brandAccentColor", nextColor)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-3 rounded-md border border-[var(--input-border)] bg-[var(--surface-elevated)] p-3">
                  <span
                    className="h-10 w-10 rounded-md border"
                    style={{
                      borderColor: "var(--swatch-border)",
                      backgroundColor:
                        form.brandPrimaryColor || "var(--brand-primary-default)",
                    }}
                  />
                  <span
                    className="h-10 w-10 rounded-md border"
                    style={{
                      borderColor: "var(--swatch-border)",
                      backgroundColor:
                        form.brandAccentColor || "var(--brand-accent-default)",
                    }}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-6">
              <div className="flex flex-col gap-2">
                <Label>Restaurant Vibe</Label>
                <div className="flex flex-wrap gap-2">
                  {VIBE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleVibe(option)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        form.restaurantVibe.includes(option)
                          ? "border-[var(--link)] bg-[color-mix(in_oklab,var(--link)_90%,white)] text-white"
                          : "border-[var(--input-border)] text-foreground hover:border-[var(--input-border-hover)]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cuisine-type">Cuisine & Concept</Label>
                <Textarea
                  id="cuisine-type"
                  value={form.cuisineType}
                  onChange={(event) => setField("cuisineType", event.target.value)}
                  placeholder="Farm-to-table California cuisine with seasonal ingredients."
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="target-clientele">Target Clientele</Label>
                <Textarea
                  id="target-clientele"
                  value={form.targetClientele}
                  onChange={(event) =>
                    setField("targetClientele", event.target.value)
                  }
                  placeholder="Local professionals, date nights, and food enthusiasts."
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tone-of-voice">Tone of Voice</Label>
                <Textarea
                  id="tone-of-voice"
                  value={form.toneOfVoice}
                  onChange={(event) => setField("toneOfVoice", event.target.value)}
                  placeholder="Warm and approachable, educational but not pretentious."
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="beverage-program-goals">Beverage Program Goals</Label>
                <Textarea
                  id="beverage-program-goals"
                  value={form.beverageProgramGoals}
                  onChange={(event) =>
                    setField("beverageProgramGoals", event.target.value)
                  }
                  placeholder="Showcase local wines, educate guests, and increase pairings."
                  rows={3}
                />
              </div>
            </section>
          ) : null}

          {status ? (
            <p className="text-sm text-[var(--muted-foreground)]">{status}</p>
          ) : null}

          <div className="grid w-full grid-cols-2 gap-4">
            <Button
              variant="secondary"
              type="button"
              onClick={handlePreviousStep}
              disabled={step === 0 || isSubmitting}
              className="w-full rounded-xl"
            >
              <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
              <span>Back</span>
            </Button>

            {step < ONBOARDING_STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={isSubmitting}
                className="w-full rounded-xl font-semibold"
              >
                <span>Continue</span>
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full rounded-xl font-semibold"
              >
                <span>{isSubmitting ? "Completing setup..." : "Complete Setup"}</span>
                <Check aria-hidden="true" className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
