"use client";

import { useEffect, useMemo, useState } from "react";

import { IngestionPanel } from "@/components/ingestion-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { opsIngestionSchema } from "@/lib/validation/forms";

type SavedWine = {
  id: string;
  name: string;
  producer: string | null;
  region: string | null;
  tasting_notes: string | null;
  approved_claims: string | null;
  updated_at: string | null;
};

export function OpsDashboardClient() {
  const [opsMerchantId, setOpsMerchantId] = useState("global-ops");
  const [seedStatus, setSeedStatus] = useState("");
  const [seedItems, setSeedItems] = useState<
    Array<{ title: string; winery: string; region: string }>
  >([]);
  const [isGeneratingSeeds, setIsGeneratingSeeds] = useState(false);
  const [savedWines, setSavedWines] = useState<SavedWine[]>([]);
  const [loadingWines, setLoadingWines] = useState(false);
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null);
  const [wineName, setWineName] = useState("");
  const [producer, setProducer] = useState("");
  const [region, setRegion] = useState("");
  const [tastingNotes, setTastingNotes] = useState("");
  const [brewStory, setBrewStory] = useState("");
  const [technicalDetails, setTechnicalDetails] = useState("");

  const selectedWine = useMemo(
    () => savedWines.find((wine) => wine.id === selectedWineId) ?? null,
    [savedWines, selectedWineId],
  );

  async function loadSavedWines(merchantId: string) {
    if (merchantId.trim().length < 2) {
      setSavedWines([]);
      setSelectedWineId(null);
      return;
    }
    setLoadingWines(true);
    try {
      const response = await fetch(
        `/api/ops/wines?merchantId=${encodeURIComponent(merchantId.trim())}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load saved wines.");
      }
      setSavedWines(payload.wines ?? []);
      setSelectedWineId((current) =>
        (payload.wines ?? []).some((wine: SavedWine) => wine.id === current)
          ? current
          : null,
      );
    } catch (error) {
      setSeedStatus(
        error instanceof Error ? error.message : "Could not load saved wines.",
      );
    } finally {
      setLoadingWines(false);
    }
  }

  useEffect(() => {
    loadSavedWines(opsMerchantId);
  }, [opsMerchantId]);

  useEffect(() => {
    if (!selectedWine) return;
    setWineName(selectedWine.name ?? "");
    setProducer(selectedWine.producer ?? "");
    setRegion(selectedWine.region ?? "");
    setTastingNotes(selectedWine.tasting_notes ?? "");
    setBrewStory("");
    setTechnicalDetails(selectedWine.approved_claims ?? "");
  }, [selectedWine]);

  async function handleGenerateSeeds() {
    if (!opsMerchantId.trim()) {
      setSeedStatus("Merchant ID is required for seed generation.");
      return;
    }

    setIsGeneratingSeeds(true);
    setSeedStatus("Fetching wine data from web and generating seed files...");
    setSeedItems([]);

    try {
      const response = await fetch("/api/seeds/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: opsMerchantId.trim(),
          count: 10,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Seed generation failed.");
      }

      setSeedItems(payload.generatedItems ?? []);
      setSeedStatus(
        `Generated and ingested ${payload.indexedFiles} seed files (${payload.totalChunks} chunks). Source: ${payload.source}.`,
      );
      await loadSavedWines(opsMerchantId);
    } catch (error) {
      setSeedStatus(
        error instanceof Error ? error.message : "Seed generation failed.",
      );
    } finally {
      setIsGeneratingSeeds(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Temporary seed generator (10 Ops wines)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ops workspace / merchant ID</Label>
            <Input
              value={opsMerchantId}
              onChange={(event) => setOpsMerchantId(event.target.value)}
              placeholder="global-ops"
            />
          </div>
          <Button onClick={handleGenerateSeeds} disabled={isGeneratingSeeds}>
            {isGeneratingSeeds ? "Generating seeds..." : "Generate Ops Seeds (10)"}
          </Button>
          {seedStatus ? (
            <p className="text-sm text-[var(--muted-foreground)]">{seedStatus}</p>
          ) : null}
          {seedItems.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
              {seedItems.map((item) => (
                <li key={`${item.title}-${item.winery}`}>
                  {item.title} - {item.winery} ({item.region})
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <IngestionPanel
        sourceType="ops"
        title="Ops wine ingestion"
        description="Add wine details, producer/brew stories, and deeper technical notes."
        merchantIdLabel="Ops workspace / merchant ID"
        merchantPlaceholder="global-ops"
        defaultMerchantId={opsMerchantId}
        onMerchantIdChange={setOpsMerchantId}
        onUploadSuccess={async () => {
          await loadSavedWines(opsMerchantId);
        }}
        validateFormData={(formData) => {
          const normalizedWineName = String(formData.get("wineName") ?? "")
            .trim()
            .toLowerCase();
          const selectedName = selectedWine?.name.trim().toLowerCase() ?? "";
          const hasDuplicate =
            normalizedWineName.length > 0 &&
            savedWines.some(
              (wine) =>
                wine.name.trim().toLowerCase() === normalizedWineName &&
                wine.name.trim().toLowerCase() !== selectedName,
            );
          const result = opsIngestionSchema.safeParse({
            wineName: String(formData.get("wineName") ?? ""),
            producer: String(formData.get("producer") ?? ""),
            region: String(formData.get("region") ?? ""),
            tastingNotes: String(formData.get("tastingNotes") ?? ""),
            brewStory: String(formData.get("brewStory") ?? ""),
            technicalDetails: String(formData.get("technicalDetails") ?? ""),
          });
          const schemaIssues = result.success
            ? []
            : result.error.issues.map((issue) => issue.message);
          if (hasDuplicate) {
            schemaIssues.push(
              "This wine name already exists for this merchant. Select it from the saved list to edit/reindex.",
            );
          }
          return schemaIssues;
        }}
        buildTextPayload={(formData) => {
          const wineName = String(formData.get("wineName") ?? "").trim();
          const producer = String(formData.get("producer") ?? "").trim();
          const region = String(formData.get("region") ?? "").trim();
          const tastingNotes = String(formData.get("tastingNotes") ?? "").trim();
          const brewStory = String(formData.get("brewStory") ?? "").trim();
          const technicalDetails = String(
            formData.get("technicalDetails") ?? "",
          ).trim();

          const content = [
            `Wine Name: ${wineName}`,
            `Producer: ${producer}`,
            `Region: ${region}`,
            `Tasting Notes: ${tastingNotes}`,
            `Brew/Producer Story: ${brewStory}`,
            `Technical Details: ${technicalDetails}`,
          ]
            .filter((line) => !line.endsWith(": "))
            .join("\n");

          return {
            title: wineName || "ops-wine-entry",
            content,
          };
        }}
        formFields={
          <>
            <div className="space-y-2">
              <Label>Saved wines (select to edit/reindex)</Label>
              <div className="rounded-md border border-[var(--input-border)] p-2">
                {loadingWines ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Loading saved wines...
                  </p>
                ) : savedWines.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    No saved wines for this merchant yet.
                  </p>
                ) : (
                  <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
                    {savedWines.map((wine) => (
                      <button
                        type="button"
                        key={wine.id}
                        onClick={() => setSelectedWineId(wine.id)}
                        className={`rounded-md border px-2 py-1 text-left text-sm ${
                          selectedWineId === wine.id
                            ? "border-[var(--chart-1)] bg-[var(--surface-elevated)]"
                            : "border-[var(--input-border)]"
                        }`}
                      >
                        <span className="font-medium">{wine.name}</span>
                        <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                          {wine.producer ? `- ${wine.producer}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedWine ? (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedWineId(null);
                        setWineName("");
                        setProducer("");
                        setRegion("");
                        setTastingNotes("");
                        setBrewStory("");
                        setTechnicalDetails("");
                      }}
                    >
                      Clear selection
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Wine name</Label>
                <Input
                  name="wineName"
                  value={wineName}
                  onChange={(event) => setWineName(event.target.value)}
                  placeholder="Napa Valley Cabernet Reserve"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Producer / Vineyard</Label>
                <Input
                  name="producer"
                  value={producer}
                  onChange={(event) => setProducer(event.target.value)}
                  placeholder="Silver Hills Estate"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Input
                name="region"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="California, Napa Valley"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tasting notes</Label>
              <Textarea
                name="tastingNotes"
                value={tastingNotes}
                onChange={(event) => setTastingNotes(event.target.value)}
                className="min-h-24"
                placeholder="Blackberry, cedar, dark chocolate, smooth tannins..."
              />
            </div>
            <div className="space-y-2">
              <Label>Brew / producer story</Label>
              <Textarea
                name="brewStory"
                value={brewStory}
                onChange={(event) => setBrewStory(event.target.value)}
                className="min-h-24"
                placeholder="Family-owned since 1980, sustainable methods..."
              />
            </div>
            <div className="space-y-2">
              <Label>Detailed technical info</Label>
              <Textarea
                name="technicalDetails"
                value={technicalDetails}
                onChange={(event) => setTechnicalDetails(event.target.value)}
                className="min-h-24"
                placeholder="ABV, aging notes, soil, elevation, harvest details..."
              />
            </div>
          </>
        }
      />
    </div>
  );
}
