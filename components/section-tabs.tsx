"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SectionTabItem = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  section: ReactNode;
};

type SectionTabsProps = {
  tabs: SectionTabItem[];
  defaultTabId?: string;
};

export function SectionTabs({ tabs, defaultTabId }: SectionTabsProps) {
  const initialTabId = defaultTabId ?? tabs[0]?.id ?? "";
  const [activeTabId, setActiveTabId] = useState(initialTabId);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [activeTabId, tabs]);
  const activeSection = activeTab?.section ?? null;
  const activeTitle = activeTab?.title ?? "";
  const activeSubtitle = activeTab?.subtitle ?? "";

  return (
    <section className="space-y-4">
      <div className="flex w-full max-w-full flex-wrap gap-1 rounded-xl bg-muted/10 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
            className={
              tab.id === activeTabId
                ? "rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow"
                : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="bg-white shadow-none my-5 px-2 py-4">
        <CardHeader className="space-y-1 py-1">
          <CardTitle className="text-lg font-semibold">{activeTitle}</CardTitle>
          {activeSubtitle.trim() ? (
            <p className="text-sm text-[var(--muted-foreground)]">{activeSubtitle}</p>
          ) : null}
        </CardHeader>
        <CardContent className="p-6">{activeSection}</CardContent>
      </Card>
    </section>
  );
}
