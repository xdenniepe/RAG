import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGenerationResultByPublicId } from "@/lib/convex/generation-jobs";
import { marketingCopyResultSchema } from "@/lib/schemas/generation";

type PageProps = {
  params: Promise<{
    merchantId: string;
    menuId: string;
  }>;
};

function parseResultJson(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  return marketingCopyResultSchema.parse(parsed);
}

function fallbackWineImageUrl(wineName: string) {
  return `https://source.unsplash.com/featured/800x500/?wine,${encodeURIComponent(
    wineName,
  )}`;
}

function sectionAccentClass(index: number) {
  const accents = [
    "from-purple-500/10 to-rose-500/10",
    "from-amber-500/10 to-orange-500/10",
    "from-sky-500/10 to-indigo-500/10",
  ];
  return accents[index % accents.length] ?? accents[0];
}

export default async function WineMenuPage({ params }: PageProps) {
  const { merchantId, menuId } = await params;
  const result = await getGenerationResultByPublicId({
    merchantId,
    publicId: menuId,
  });

  if (!result) {
    notFound();
  }

  const menu = parseResultJson(result.resultJson);
  const renderPage = menu.renderPage;
  const pageHeroHeadline = renderPage?.hero.headline ?? menu.pageDesign.heroHeadline;
  const pageHeroSubheadline = renderPage?.hero.subheadline ?? menu.pageDesign.heroSubheadline;
  const pageIntro = renderPage?.intro ?? menu.restaurantSummary;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="space-y-3 rounded-xl border border-[var(--input-border)] bg-[var(--surface-elevated)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Wine Menu</Badge>
          <Badge>{merchantId}</Badge>
          <Badge>{menu.pageDesign.toneApplied}</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {pageHeroHeadline}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {pageHeroSubheadline}
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">{pageIntro}</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Menu ID: {menuId}
        </p>
        {menu.pageDesign.componentPlan.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {menu.pageDesign.componentPlan.map((item) => (
              <Badge key={`${item.component}-${item.purpose}`}>
                {item.component}: {item.purpose}
              </Badge>
            ))}
          </div>
        ) : null}
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard/merchant">Back to merchant dashboard</Link>
        </Button>
      </header>

      {renderPage ? (
        <section className="space-y-6">
          {renderPage.wineSections.map((section, sectionIndex) => (
            <Card
              key={section.title}
              className={`bg-gradient-to-br ${sectionAccentClass(sectionIndex)}`}
            >
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {section.items.map((item) => (
                  <article
                    key={`${section.title}-${item.wineName}`}
                    className="space-y-3 rounded-lg border border-[var(--input-border)] bg-[var(--surface)] p-4"
                  >
                    <img
                      src={item.imageUrl ?? fallbackWineImageUrl(item.wineName)}
                      alt={item.imageAlt || `${item.wineName} bottle`}
                      className="h-40 w-full rounded-md object-cover"
                      loading="lazy"
                    />
                    <h3 className="text-lg font-semibold">{item.wineName}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{item.description}</p>
                    <p className="text-sm">
                      <span className="font-medium">Pairing: </span>
                      <span className="text-[var(--muted-foreground)]">{item.pairing}</span>
                    </p>
                  </article>
                ))}
              </CardContent>
            </Card>
          ))}

          {renderPage.featuredBlock ? (
            <Card>
              <CardHeader>
                <CardTitle>{renderPage.featuredBlock.headline ?? "Featured"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {renderPage.featuredBlock.text}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {renderPage.components.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Extra Menu Components</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {renderPage.components.map((component) => (
                  <article
                    key={`${component.type}-${component.title ?? component.text ?? "component"}`}
                    className="space-y-2 rounded-lg border border-[var(--input-border)] bg-[var(--surface)] p-4"
                  >
                    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {component.type}
                    </p>
                    {component.title ? <p className="font-medium">{component.title}</p> : null}
                    {component.text ? (
                      <p className="text-sm text-[var(--muted-foreground)]">{component.text}</p>
                    ) : null}
                    {component.imageUrl ? (
                      <img
                        src={component.imageUrl}
                        alt={component.imageAlt ?? component.title ?? "Menu component image"}
                        className="h-32 w-full rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    {component.items.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
                        {component.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : (
        <section className="grid gap-4">
          {menu.wines.map((wine) => (
            <Card key={wine.wineName}>
              <CardHeader>
                <CardTitle>{wine.wineName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <img
                  src={wine.imageUrl ?? fallbackWineImageUrl(wine.wineName)}
                  alt={wine.imageAlt || `${wine.wineName} bottle`}
                  className="h-48 w-full rounded-md object-cover"
                  loading="lazy"
                />
                <p className="text-sm text-[var(--muted-foreground)]">{wine.menuCopy}</p>
                <div>
                  <p className="mb-1 text-sm font-medium">Best menu pairing</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {wine.pairingSuggestions[0] ?? "No pairing available"}
                  </p>
                </div>
                {wine.visualNotes.length > 0 ? (
                  <div>
                    <p className="mb-1 text-sm font-medium">Visual direction</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
                      {wine.visualNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {wine.pairingSuggestions.length > 1 ? (
                  <div>
                    <p className="mb-1 text-sm font-medium">Other pairings</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
                      {wine.pairingSuggestions.slice(1).map((pairing) => (
                        <li key={pairing}>{pairing}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
