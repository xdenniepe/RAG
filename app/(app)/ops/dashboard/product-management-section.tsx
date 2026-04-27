"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Upload, Wine, X } from "lucide-react";

import { ChoiceCard } from "@/components/choice-card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const PRODUCER_BULLETS = [
  "Producer name, region, and story",
  "Farming philosophy and practices",
  "Brand assets and approved messaging",
  "Upload vineyard photos, PDFs, and more",
] as const;

const PRODUCT_BULLETS = [
  "Product name, vintage, and composition",
  "Tasting notes and technical details",
  "Link to existing producer record",
  "Upload bottle images, labels, and sheets",
] as const;

export function ProductManagementSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleProducer() {
    setOpen(false);
    router.push(ROUTES.ops.producerAdd);
  }

  function handleProduct() {
    setOpen(false);
    router.push(ROUTES.ops.productAdd);
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="default"
        className="w-fit gap-2"
        onClick={() => setOpen(true)}
      >
        <Upload className="size-4" />
        Upload product
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Dismiss dialog"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={subtitleId}
            className={cn(
              "relative z-[101] flex w-full max-w-3xl flex-col rounded-xl border border-[var(--input-border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]",
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--input-border)] px-6 py-5">
              <div className="space-y-1">
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  Add New Record
                </h2>
                <p id={subtitleId} className="text-sm text-[var(--muted-foreground)]">
                  Choose the type of record you want to create
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              <ChoiceCard
                icon={<Building2 className="size-6 text-[var(--focus-ring)]" />}
                title="Add Producer"
                subtitle="Winery / brand / maker-level information"
                bullets={PRODUCER_BULLETS}
                onSelect={handleProducer}
              />
              <ChoiceCard
                icon={<Wine className="size-6 text-[var(--focus-ring)]" />}
                title="Add Product"
                subtitle="Individual SKU or offering tied to a producer"
                bullets={PRODUCT_BULLETS}
                onSelect={handleProduct}
              />
            </div>

            <footer className="border-t border-[var(--input-border)] px-6 pb-6 pt-4">
              <div className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                <span className="font-semibold text-[var(--foreground)]">Tip: </span> Start with a
                producer record if you haven&apos;t added the winery yet. Products should be linked
                to an existing producer.
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
