"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OpsImportMode, WineImportRow, wineImportRowSchema } from "@/lib/ops-import/schema";

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
  const router = useRouter();
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
  const [country, setCountry] = useState("");
  const [grapeVarietal, setGrapeVarietal] = useState("");
  const [vintage, setVintage] = useState("");
  const [style, setStyle] = useState("");
  const [body, setBody] = useState("");
  const [acidity, setAcidity] = useState("");
  const [priceBand, setPriceBand] = useState("");
  const [importMode, setImportMode] = useState<OpsImportMode>("manual");
  const [importStatus, setImportStatus] = useState("");
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSavedWines(opsMerchantId);
  }, [opsMerchantId]);

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

  async function createDraft(rows: unknown[], mode: OpsImportMode) {
    const response = await fetch("/api/ops/imports/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId: opsMerchantId.trim(),
        mode,
        rows,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Could not create import draft.");
    }
    if (!payload.draftId) {
      throw new Error("Draft id missing from response.");
    }
    router.push(`/dashboard/ops/imports/${payload.draftId}/preview`);
  }

  function hydrateFromSavedWine(wine: SavedWine) {
    setSelectedWineId(wine.id);
    setWineName(wine.name ?? "");
    setProducer(wine.producer ?? "");
    setRegion(wine.region ?? "");
    setTastingNotes(wine.tasting_notes ?? "");
    setTechnicalDetails(wine.approved_claims ?? "");
    setBrewStory("");
    setCountry("");
    setGrapeVarietal("");
    setVintage("");
    setStyle("");
    setBody("");
    setAcidity("");
    setPriceBand("");
  }

  function buildManualRow(): WineImportRow {
    return {
      name: wineName,
      producer,
      region,
      country,
      grape_varietal: grapeVarietal,
      vintage,
      style,
      body,
      acidity,
      tasting_notes: tastingNotes,
      approved_claims: technicalDetails,
      price_band: priceBand,
      metadata: brewStory.trim() ? { brew_story: brewStory.trim() } : {},
    };
  }

  async function handleStartImport() {
    setImportStatus("");
    if (!opsMerchantId.trim()) {
      setImportStatus("Merchant ID is required.");
      return;
    }
    setIsSubmittingImport(true);
    try {
      if (importMode === "manual") {
        const parsed = wineImportRowSchema.safeParse(buildManualRow());
        if (!parsed.success) {
          throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
        }
        await createDraft([parsed.data], "manual");
        return;
      }

      if (importMode === "csv") {
        if (!csvFile) {
          throw new Error("Attach a CSV file before continuing.");
        }
        const formData = new FormData();
        formData.set("merchantId", opsMerchantId.trim());
        formData.set("file", csvFile);
        const response = await fetch("/api/ops/imports/parse/csv", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not parse CSV.");
        }
        await createDraft(payload.rows ?? [], "csv");
        return;
      }

      if (!pdfFile) {
        throw new Error("Attach a PDF file before continuing.");
      }
      const formData = new FormData();
      formData.set("merchantId", opsMerchantId.trim());
      formData.set("file", pdfFile);
      const response = await fetch("/api/ops/imports/parse/pdf", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not parse PDF.");
      }
      await createDraft(payload.rows ?? [], "pdf");
    } catch (error) {
      setImportStatus(
        error instanceof Error ? error.message : "Could not start import.",
      );
    } finally {
      setIsSubmittingImport(false);
    }
  }

  function handleDownloadCsvTemplate() {
    const template = [
      [
        "name",
        "producer",
        "region",
        "country",
        "grape_varietal",
        "vintage",
        "style",
        "body",
        "acidity",
        "tasting_notes",
        "approved_claims",
        "price_band",
      ].join(","),
      [
        "Estate Reserve",
        "Silver Hills",
        "Napa Valley",
        "USA",
        "Cabernet Sauvignon",
        "2020",
        "Bold red",
        "Full",
        "Medium",
        "Blackberry, cedar, dark chocolate",
        "Estate grown and sustainably farmed",
        "$40-$60",
      ]
        .map((value) =>
          value.includes(",") ? `"${value.replaceAll('"', '""')}"` : value,
        )
        .join(","),
    ].join("\n");

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ops-wine-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      <Card>
        <CardHeader>
          <CardTitle>Ops product import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Import mode</Label>
            <div className="flex flex-wrap gap-2">
              {(["manual", "csv", "pdf"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={importMode === mode ? "default" : "secondary"}
                  onClick={() => setImportMode(mode)}
                >
                  {mode.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ops workspace / merchant ID</Label>
            <Input
              value={opsMerchantId}
              onChange={(event) => setOpsMerchantId(event.target.value)}
              placeholder="global-ops"
            />
          </div>

          {importMode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label>Saved wines (select to prefill)</Label>
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
                          onClick={() => hydrateFromSavedWine(wine)}
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
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Wine name</Label>
                  <Input
                    value={wineName}
                    onChange={(event) => setWineName(event.target.value)}
                    placeholder="Napa Valley Cabernet Reserve"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Producer</Label>
                  <Input
                    value={producer}
                    onChange={(event) => setProducer(event.target.value)}
                    placeholder="Silver Hills Estate"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    placeholder="Napa Valley"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    placeholder="USA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grape varietal</Label>
                  <Input
                    value={grapeVarietal}
                    onChange={(event) => setGrapeVarietal(event.target.value)}
                    placeholder="Cabernet Sauvignon"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Vintage</Label>
                  <Input
                    value={vintage}
                    onChange={(event) => setVintage(event.target.value)}
                    placeholder="2021"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Style</Label>
                  <Input
                    value={style}
                    onChange={(event) => setStyle(event.target.value)}
                    placeholder="Bold red"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Input
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Acidity</Label>
                  <Input
                    value={acidity}
                    onChange={(event) => setAcidity(event.target.value)}
                    placeholder="Medium"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tasting notes</Label>
                <Textarea
                  value={tastingNotes}
                  onChange={(event) => setTastingNotes(event.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label>Approved claims</Label>
                <Textarea
                  value={technicalDetails}
                  onChange={(event) => setTechnicalDetails(event.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Price band</Label>
                  <Input
                    value={priceBand}
                    onChange={(event) => setPriceBand(event.target.value)}
                    placeholder="$25-$50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brew / producer story (metadata)</Label>
                  <Input
                    value={brewStory}
                    onChange={(event) => setBrewStory(event.target.value)}
                    placeholder="Family estate, organic farming"
                  />
                </div>
              </div>
            </>
          ) : null}

          {importMode === "csv" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>CSV file</Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadCsvTemplate}
                >
                  Download template
                </Button>
              </div>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
              />
            </div>
          ) : null}

          {importMode === "pdf" ? (
            <div className="space-y-2">
              <Label>PDF file (OCR AI parsing)</Label>
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
              />
            </div>
          ) : null}

          <Button type="button" onClick={handleStartImport} disabled={isSubmittingImport}>
            {isSubmittingImport ? "Preparing preview..." : "Continue to preview"}
          </Button>
          {importStatus ? (
            <p className="text-sm text-[var(--muted-foreground)]">{importStatus}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
