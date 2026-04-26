"use client";

import { useRef, useState, type SyntheticEvent } from "react";

import { IngestionPanel } from "@/components/ingestion-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  generateMarketingRequestSchema,
  merchantIngestionSchema,
} from "@/lib/validation/forms";
import {
  marketingCopyResultSchema,
  type MarketingCopyResult,
} from "@/lib/schemas/generation";

type GenerateResponse = {
  menuId: string;
  requestId: string;
};

type MenuTag = {
  name: string;
  description: string;
};

type MerchantValuesResponse = {
  profile: {
    restaurant_name: string | null;
    cuisine_type: string | null;
    brand_story: string | null;
    tone_of_voice: string | null;
  } | null;
  menuItems: Array<{
    name: string;
    description: string | null;
  }>;
  wines: Array<{
    name: string;
  }>;
};

const BRAND_TONE_OPTIONS = [
  "Warm",
  "Premium",
  "Approachable",
  "Elegant",
  "Playful",
  "Minimal",
] as const;

const BRAND_VISUAL_OPTIONS = [
  "Clean editorial",
  "Rustic heritage",
  "Modern minimal",
  "Bold contemporary",
  "Classic luxury",
  "Vibrant social",
] as const;

export function MerchantDashboardClient() {
  const [merchantId, setMerchantId] = useState("demo-merchant");
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineStyle, setCuisineStyle] = useState("");
  const [brandTones, setBrandTones] = useState<string[]>([]);
  const [brandVisuals, setBrandVisuals] = useState<string[]>([]);
  const [restaurantStory, setRestaurantStory] = useState("");
  const [menuItemName, setMenuItemName] = useState("");
  const [menuItemDescription, setMenuItemDescription] = useState("");
  const [menuTags, setMenuTags] = useState<MenuTag[]>([]);
  const [availableWineInput, setAvailableWineInput] = useState("");
  const [availableWineTags, setAvailableWineTags] = useState<string[]>([]);
  const [isLoadingCurrentValues, setIsLoadingCurrentValues] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState("");
  const [generatedMenuId, setGeneratedMenuId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<MarketingCopyResult | null>(null);

  const restaurantDetailsRef = useRef<HTMLDetailsElement>(null);
  const generateReportRef = useRef<HTMLDetailsElement>(null);

  function handleAccordionToggle(which: "restaurant" | "report") {
    return (event: SyntheticEvent<HTMLDetailsElement>) => {
      const opened = event.currentTarget.open;
      if (!opened) return;
      if (which === "restaurant" && generateReportRef.current) {
        generateReportRef.current.open = false;
      }
      if (which === "report" && restaurantDetailsRef.current) {
        restaurantDetailsRef.current.open = false;
      }
    };
  }

  function toggleBrandTone(tone: string) {
    setBrandTones((current) =>
      current.includes(tone)
        ? current.filter((item) => item !== tone)
        : [...current, tone],
    );
  }

  function toggleBrandVisual(visual: string) {
    setBrandVisuals((current) =>
      current.includes(visual)
        ? current.filter((item) => item !== visual)
        : [...current, visual],
    );
  }

  function buildBrandDirection() {
    const tonePart = brandTones.length > 0 ? `Tone: ${brandTones.join(", ")}` : "";
    const visualPart =
      brandVisuals.length > 0 ? `Visual: ${brandVisuals.join(", ")}` : "";
    return [tonePart, visualPart].filter(Boolean).join(" | ");
  }

  function addMenuTag() {
    const rawName = menuItemName.trim();
    if (!rawName) return;
    const parentheticalMatch = rawName.match(/\(([^)]+)\)/);
    const name = rawName.replace(/\s*\(([^)]+)\)\s*/g, " ").trim();
    const description =
      menuItemDescription.trim() || parentheticalMatch?.[1]?.trim() || "";
    if (!name) return;
    setMenuTags((current) => {
      if (current.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        return current;
      }
      return [...current, { name, description }];
    });
    setMenuItemName("");
    setMenuItemDescription("");
  }

  function addMenuTagFromRaw(raw: string) {
    const rawName = raw.trim();
    if (!rawName) return;
    const parentheticalMatch = rawName.match(/\(([^)]+)\)/);
    const name = rawName.replace(/\s*\(([^)]+)\)\s*/g, " ").trim();
    const description = parentheticalMatch?.[1]?.trim() || "";
    if (!name) return;
    setMenuTags((current) => {
      if (current.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        return current;
      }
      return [...current, { name, description }];
    });
  }

  function removeMenuTag(name: string) {
    setMenuTags((current) =>
      current.filter((item) => item.name.toLowerCase() !== name.toLowerCase()),
    );
  }

  function addAvailableWineTag(raw: string) {
    const wineName = raw.trim();
    if (!wineName) return;
    setAvailableWineTags((current) => {
      if (current.some((item) => item.toLowerCase() === wineName.toLowerCase())) {
        return current;
      }
      return [...current, wineName];
    });
  }

  function removeAvailableWineTag(name: string) {
    setAvailableWineTags((current) =>
      current.filter((item) => item.toLowerCase() !== name.toLowerCase()),
    );
  }

  function handleMenuNameChange(value: string) {
    if (value.includes(";")) {
      const items = value.split(";").map((item) => item.trim()).filter(Boolean);
      for (const item of items) {
        addMenuTagFromRaw(item);
      }
      setMenuItemName("");
      return;
    }
    setMenuItemName(value);
  }

  function handleAvailableWineInputChange(value: string) {
    if (value.includes(";")) {
      const items = value.split(";").map((item) => item.trim()).filter(Boolean);
      for (const item of items) {
        addAvailableWineTag(item);
      }
      setAvailableWineInput("");
      return;
    }
    setAvailableWineInput(value);
  }

  async function loadCurrentMerchantValues() {
    if (!merchantId.trim()) {
      setIngestionStatus("Merchant ID is required before loading values.");
      return;
    }

    setIsLoadingCurrentValues(true);
    setIngestionStatus("Loading merchant values...");
    try {
      const response = await fetch(
        `/api/merchant/values?merchantId=${encodeURIComponent(merchantId.trim())}`,
      );
      const payload = (await response.json()) as MerchantValuesResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed loading merchant values.");
      }

      setRestaurantName(payload.profile?.restaurant_name ?? "");
      setCuisineStyle(payload.profile?.cuisine_type ?? "");
      setRestaurantStory(payload.profile?.brand_story ?? "");
      const toneOfVoiceRaw = (payload.profile?.tone_of_voice ?? "").trim();
      const [tonePart, visualPart] = toneOfVoiceRaw.split("|").map((part) => part.trim());
      const parsePart = (part: string, prefix: string) =>
        part
          .replace(new RegExp(`^${prefix}:\\s*`, "i"), "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      setBrandTones(parsePart(tonePart ?? "", "tone"));
      setBrandVisuals(parsePart(visualPart ?? "", "visual"));
      setMenuTags(
        payload.menuItems.map((item) => ({
          name: item.name,
          description: item.description ?? "",
        })),
      );
      setAvailableWineTags(payload.wines.map((wine) => wine.name));
      setIngestionStatus("Loaded current merchant values.");
    } catch (error) {
      setIngestionStatus(
        error instanceof Error ? error.message : "Failed loading merchant values.",
      );
    } finally {
      setIsLoadingCurrentValues(false);
    }
  }

  async function handleGenerate() {
    const brandDirection = buildBrandDirection();
    const brief = [
      "Create restaurant-specific wine menu copy with pairings.",
      "Use merchant and ops context only.",
      brandDirection ? `Universal brand direction: ${brandDirection}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const requestData = {
      merchantId,
      sourceTypes: ["ops", "restaurant"] as const,
      brief,
    };
    const validation = generateMarketingRequestSchema.safeParse(requestData);
    if (!validation.success) {
      setGenerateStatus(
        validation.error.issues.map((issue) => issue.message).join(" "),
      );
      return;
    }

    setIsGenerating(true);
    setGenerateStatus("Generating menu...");
    setPreviewResult(null);
    setGeneratedMenuId(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const payload = (await response.json()) as Partial<GenerateResponse> & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed");
      }
      if (!payload.menuId) {
        throw new Error("Missing generated menu id.");
      }
      const parsedPreview = marketingCopyResultSchema.safeParse(payload);
      if (!parsedPreview.success) {
        throw new Error("Generated result could not be rendered for preview.");
      }

      setGeneratedMenuId(payload.menuId);
      setPreviewResult(parsedPreview.data);
      setGenerateStatus("Preview ready.");
    } catch (error) {
      setGenerateStatus(
        error instanceof Error ? error.message : "Unexpected generation error.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <details
        ref={restaurantDetailsRef}
        className="group/details overflow-hidden rounded-lg border border-[var(--input-border)] bg-[var(--surface-elevated)]"
        open
        onToggle={handleAccordionToggle("restaurant")}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span>1. Update restaurant details</span>
          <span
            aria-hidden
            className="text-xs text-[var(--muted-foreground)] transition-transform group-open/details:rotate-180"
          >
            ▼
          </span>
        </summary>
        <div className="border-t border-[var(--input-border)] px-2 pb-3 pt-1 sm:px-3">
          <IngestionPanel
            sourceType="restaurant"
            title="Merchant restaurant ingestion"
            description="Add restaurant profile, menu style, and available wines."
            merchantIdLabel="Restaurant merchant ID"
            merchantPlaceholder="restaurant-123"
            defaultMerchantId={merchantId}
            onMerchantIdChange={setMerchantId}
            onUploadSuccess={() => {
              setIngestionStatus("Merchant data indexed successfully.");
            }}
            validateFormData={(formData) => {
              const result = merchantIngestionSchema.safeParse({
                restaurantName: String(formData.get("restaurantName") ?? ""),
                restaurantStory: String(formData.get("restaurantStory") ?? ""),
                cuisineStyle: String(formData.get("cuisineStyle") ?? ""),
                menuHighlights: String(formData.get("menuHighlights") ?? ""),
                availableWines: String(formData.get("availableWines") ?? ""),
                brandTone: String(formData.get("brandTone") ?? ""),
              });
              return result.success
                ? []
                : result.error.issues.map((issue) => issue.message);
            }}
            buildTextPayload={(formData) => {
              const restaurantName = String(formData.get("restaurantName") ?? "").trim();
              const story = String(formData.get("restaurantStory") ?? "").trim();
              const cuisineStyle = String(formData.get("cuisineStyle") ?? "").trim();
              const menuHighlights = menuTags.map((item) => item.name).join(", ");
              const availableWines = availableWineTags.join(", ");
              const brandDirection = buildBrandDirection();
              const menuLines = menuTags
                .map((item) =>
                  `Menu Item: ${item.name}${item.description ? ` - ${item.description}` : ""}`,
                )
                .join("\n");

              const content = [
                `Restaurant Name: ${restaurantName}`,
                `Restaurant Story: ${story}`,
                `Cuisine Style: ${cuisineStyle}`,
                `Menu Highlights: ${menuHighlights}`,
                `Available Wines: ${availableWines}`,
                `Brand Direction: ${brandDirection}`,
                menuLines,
              ]
                .filter((line) => !line.endsWith(": "))
                .join("\n");

              return {
                title: restaurantName || "merchant-restaurant-entry",
                content,
              };
            }}
            formFields={
          <>
            <div className="space-y-2">
              <Label>Merchant profile values</Label>
              <Button
                type="button"
                variant="secondary"
                onClick={loadCurrentMerchantValues}
                disabled={isLoadingCurrentValues}
              >
                {isLoadingCurrentValues
                  ? "Loading current values..."
                  : "Show current values for this merchant"}
              </Button>
              {ingestionStatus ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {ingestionStatus}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Restaurant name</Label>
              <Input
                name="restaurantName"
                value={restaurantName}
                onChange={(event) => setRestaurantName(event.target.value)}
                placeholder="Luna Steakhouse"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cuisine style</Label>
              <Input
                name="cuisineStyle"
                value={cuisineStyle}
                onChange={(event) => setCuisineStyle(event.target.value)}
                placeholder="Modern steak and seafood"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Restaurant story</Label>
              <Textarea
                name="restaurantStory"
                value={restaurantStory}
                onChange={(event) => setRestaurantStory(event.target.value)}
                placeholder="A short story about your restaurant brand and positioning."
              />
            </div>
            <div className="space-y-2">
              <Label>Menu items (tag list)</Label>
              <div className="grid gap-2 md:grid-cols-[1fr,1fr,auto]">
                <Input
                  value={menuItemName}
                  onChange={(event) => handleMenuNameChange(event.target.value)}
                  placeholder="Food name; use semicolon to auto-add multiple"
                />
                <Input
                  value={menuItemDescription}
                  onChange={(event) => setMenuItemDescription(event.target.value)}
                  placeholder="Description (optional)"
                />
                <Button type="button" variant="secondary" onClick={addMenuTag}>
                  Add
                </Button>
              </div>
              {menuTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-md border border-[var(--input-border)] p-2">
                  {menuTags.map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => removeMenuTag(item.name)}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--input-border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
                      title="Remove menu item"
                    >
                      <span>{item.name}</span>
                      {item.description ? <span>({item.description})</span> : null}
                      <span aria-hidden>×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Add menu items to build pairing context. Click a tag to remove it.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Available wines (tag list)</Label>
              <Input
                name="availableWines"
                value={availableWineInput}
                onChange={(event) =>
                  handleAvailableWineInputChange(event.target.value)
                }
                placeholder="Type wine names; separate with semicolon"
              />
              {availableWineTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-md border border-[var(--input-border)] p-2">
                  {availableWineTags.map((wine) => (
                    <button
                      type="button"
                      key={wine}
                      onClick={() => removeAvailableWineTag(wine)}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--input-border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
                      title="Remove wine"
                    >
                      <span>{wine}</span>
                      <span aria-hidden>×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Use semicolon to add multiple wines quickly.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <Label>Brand direction</Label>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Choose voice (how it reads) and visual (how it should feel on the page)
                  for AI wine menu generation.
                </p>
              </div>
              <Input
                type="hidden"
                name="brandTone"
                value={buildBrandDirection()}
                readOnly
              />

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 rounded-lg border border-[var(--input-border)] p-3">
                  <div>
                    <p className="text-sm font-medium">Voice &amp; tone</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Personality of the copy.
                    </p>
                  </div>
                  <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-dashed border-[var(--input-border)] bg-[var(--background)] p-2">
                    {brandTones.length > 0 ? (
                      brandTones.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => toggleBrandTone(tone)}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--input-border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
                          title="Remove tone"
                        >
                          <span>{tone}</span>
                          <span aria-hidden>×</span>
                        </button>
                      ))
                    ) : (
                      <span className="self-center text-xs text-[var(--muted-foreground)]">
                        No tones yet — pick below.
                      </span>
                    )}
                  </div>
                  <label className="sr-only" htmlFor="merchant-brand-tone-select">
                    Add tone
                  </label>
                  <select
                    id="merchant-brand-tone-select"
                    value=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      toggleBrandTone(event.target.value);
                      event.currentTarget.value = "";
                    }}
                    className="h-9 w-full rounded-md border border-[var(--input-border)] bg-transparent px-2 text-sm"
                  >
                    <option value="">Add tone…</option>
                    {BRAND_TONE_OPTIONS.filter(
                      (option) => !brandTones.includes(option),
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-[var(--input-border)] p-3">
                  <div>
                    <p className="text-sm font-medium">Visual style</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Look and layout energy for the menu.
                    </p>
                  </div>
                  <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-dashed border-[var(--input-border)] bg-[var(--background)] p-2">
                    {brandVisuals.length > 0 ? (
                      brandVisuals.map((visual) => (
                        <button
                          key={visual}
                          type="button"
                          onClick={() => toggleBrandVisual(visual)}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--input-border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
                          title="Remove visual"
                        >
                          <span>{visual}</span>
                          <span aria-hidden>×</span>
                        </button>
                      ))
                    ) : (
                      <span className="self-center text-xs text-[var(--muted-foreground)]">
                        No visuals yet — pick below.
                      </span>
                    )}
                  </div>
                  <label className="sr-only" htmlFor="merchant-brand-visual-select">
                    Add visual style
                  </label>
                  <select
                    id="merchant-brand-visual-select"
                    value=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      toggleBrandVisual(event.target.value);
                      event.currentTarget.value = "";
                    }}
                    className="h-9 w-full rounded-md border border-[var(--input-border)] bg-transparent px-2 text-sm"
                  >
                    <option value="">Add visual style…</option>
                    {BRAND_VISUAL_OPTIONS.filter(
                      (option) => !brandVisuals.includes(option),
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {buildBrandDirection() ? (
                <div className="rounded-md border border-[var(--input-border)] bg-[var(--surface-elevated)] px-3 py-2">
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    Sent to AI
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                    {buildBrandDirection()}
                  </p>
                </div>
              ) : null}
            </div>
          </>
            }
          />
        </div>
      </details>

      <details
        ref={generateReportRef}
        className="group/report overflow-hidden rounded-lg border border-[var(--input-border)] bg-[var(--surface-elevated)]"
        onToggle={handleAccordionToggle("report")}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span>2. Generate report</span>
          <span
            aria-hidden
            className="text-xs text-[var(--muted-foreground)] transition-transform group-open/report:rotate-180"
          >
            ▼
          </span>
        </summary>
        <div className="border-t border-[var(--input-border)] p-4">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Wine menu generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
              <div className="space-y-2">
                <Label>Merchant ID</Label>
                <Input
                  value={merchantId}
                  onChange={(event) => setMerchantId(event.target.value)}
                  placeholder="restaurant-123"
                  required
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="success"
              >
                {isGenerating ? "Generating..." : "Generate wine menu"}
              </Button>
              {generateStatus ? (
                <p className="text-sm text-[var(--muted-foreground)]">{generateStatus}</p>
              ) : null}
              {previewResult ? (
                <div className="space-y-3 rounded-md border border-[var(--input-border)] bg-[var(--surface)] p-3">
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Preview menu ID: {generatedMenuId}
                    </p>
                    <p className="text-lg font-semibold">
                      {previewResult.renderPage?.hero.headline ??
                        previewResult.pageDesign.heroHeadline}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {previewResult.renderPage?.hero.subheadline ??
                        previewResult.pageDesign.heroSubheadline}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {previewResult.renderPage?.intro ?? previewResult.restaurantSummary}
                    </p>
                  </div>
                  {previewResult.wines.length > 0 ? (
                    <div className="grid gap-2">
                      {previewResult.wines.slice(0, 6).map((wine) => (
                        <div
                          key={wine.wineName}
                          className="rounded-md border border-[var(--input-border)] bg-[var(--surface-elevated)] p-2"
                        >
                          <p className="text-sm font-medium">{wine.wineName}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {wine.menuCopy}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      No wines in the generated result yet.
                    </p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </details>
    </section>
  );
}
