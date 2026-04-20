"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { IngestionPanel } from "@/components/ingestion-panel";
import { Badge } from "@/components/ui/badge";
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

export function MerchantDashboardClient() {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState("demo-merchant");
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineStyle, setCuisineStyle] = useState("");
  const [brandTones, setBrandTones] = useState<string[]>([]);
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

  function toggleBrandTone(tone: string) {
    setBrandTones((current) =>
      current.includes(tone)
        ? current.filter((item) => item !== tone)
        : [...current, tone],
    );
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
      setBrandTones(
        (payload.profile?.tone_of_voice ?? "")
          .split(",")
          .map((tone) => tone.trim())
          .filter(Boolean),
      );
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
    const brief = [
      "Create restaurant-specific wine menu copy with pairings.",
      "Use merchant and ops context only.",
      brandTones.length > 0 ? `Preferred brand tone: ${brandTones.join(", ")}.` : "",
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
      const normalizedMerchant = merchantId.trim();
      router.push(`/${normalizedMerchant}/wine-menu/${payload.menuId}`);
    } catch (error) {
      setGenerateStatus(
        error instanceof Error ? error.message : "Unexpected generation error.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
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
          const brandTone = brandTones.join(", ");
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
            `Brand Tone: ${brandTone}`,
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
            <div className="space-y-2">
              <Label>Brand tone</Label>
              <div className="rounded-md border border-[var(--input-border)] p-2">
                <div className="mb-2 flex flex-wrap gap-2">
                  {brandTones.length > 0 ? (
                    brandTones.map((tone) => <Badge key={tone}>{tone}</Badge>)
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Select one or more tone tags.
                    </p>
                  )}
                </div>
                <select
                  value=""
                  onChange={(event) => {
                    if (!event.target.value) return;
                    toggleBrandTone(event.target.value);
                    event.currentTarget.value = "";
                  }}
                  className="h-9 w-full rounded-md border border-[var(--input-border)] bg-transparent px-2 text-sm"
                >
                  <option value="">Add brand tone tag...</option>
                  {BRAND_TONE_OPTIONS.filter(
                    (option) => !brandTones.includes(option),
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Generate marketing copy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </section>
  );
}
