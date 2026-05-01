"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChoiceCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  bullets: readonly string[];
  onSelect: () => void;
  className?: string;
};

export function ChoiceCard({
  icon,
  title,
  subtitle,
  bullets,
  onSelect,
  className,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col rounded-xl border border-[var(--input-border)] bg-[var(--surface)] p-5 text-left text-[var(--secondary)] transition",
        "hover:border-[var(--secondary)] hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 ring-offset-[var(--surface)]",
        className,
      )}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary)]/15 text-[var(--secondary)] transition-colors group-hover:bg-[var(--secondary)] group-hover:text-white [&_svg]:text-current">
        {icon}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="font-semibold text-[var(--foreground)]">{title}</span>
        <ArrowRight className="size-4 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
      </div>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</p>
      <ul className="mt-4 space-y-2 text-sm text-[var(--foreground)]">
        {bullets.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className="mt-[0.35rem] size-1.5 shrink-0 rounded-full bg-[var(--brand-primary-default)]"
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
