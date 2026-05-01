import Link from "next/link";

type NotFoundViewProps = {
  title?: string;
  description?: string;
  ctaHref: string;
  ctaLabel: string;
};

export function NotFoundView({
  title = "Page not found",
  description = "The page you are looking for does not exist or is unavailable.",
  ctaHref,
  ctaLabel,
}: NotFoundViewProps) {
  return (
    <main className="mx-auto flex flex-1 h-full w-full flex-col items-center justify-center gap-4 px-6 text-center bg-white/80">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
      <p className="max-w-md text-sm text-[var(--muted-foreground)]">{description}</p>
      <Link
        href={ctaHref}
        className="inline-flex items-center rounded-md bg-background px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        {ctaLabel}
      </Link>
    </main>
  );
}
