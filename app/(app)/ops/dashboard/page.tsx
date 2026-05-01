import { redirect } from "next/navigation";

import { SectionTabs } from "@/components/section-tabs";
import type { SectionTabItem } from "@/components/section-tabs";
import { AnalyticsCard } from "@/components/ui/analytics-card";

import { InsightSection } from "./insight-section";
import { ProductManagementSection } from "./product-management-section";
import { RecentAssetRequestSection } from "./recent-asset-request-section";
import { RestaurantActivitySection } from "./restaurant-activity-section";
import { safeCurrentUser } from "@/lib/clerk-user";
import { getOnboardingStatus } from "@/lib/onboarding/server";
import { ROUTES } from "@/lib/routes";

export default async function OpsDashboardPage() {
  const user = await safeCurrentUser();
  if (!user) {
    redirect(ROUTES.auth.postSignIn);
  }

  const isAdmin = user.privateMetadata?.role === "admin";
  if (!isAdmin) {
    const onboarding = await getOnboardingStatus(user.id);
    if (!onboarding.isCompleted) {
      redirect(ROUTES.onboarding);
    }
    redirect(ROUTES.dashboard.merchant);
  }

  const analyticsCards = [
    { label: "Restaurants", value: "18", trendText: "12 active", trendTone: "positive" },
    { label: "Products", value: "143", trendText: "7 pending", trendTone: "negative" },
    { label: "Assets Created", value: "89", trendText: "This month", trendTone: "neutral" },
    { label: "Avg. per Restaurant", value: "7.4", trendText: "Assets", trendTone: "neutral" },
    { label: "Growth Rate", value: "+24%", trendText: "Month over month", trendTone: "positive" },
    { label: "Total QR Views", value: "8.2K", trendText: "Last 30 days", trendTone: "neutral" },
  ] as const;

  const sectionTabs: SectionTabItem[] = [
    {
      id: "product-management",
      label: "Product Management",
      title: "Product management",
      subtitle: "Catalog and merchandising overview",
      section: <ProductManagementSection />,
    },
    {
      id: "restaurant-activity",
      label: "Restaurant activity",
      title: "Restaurant activity",
      subtitle: "Partner accounts and onboarding status",
      section: <RestaurantActivitySection />,
    },
    {
      id: "recent-asset-request",
      label: "Recent asset requests",
      title: "Recent Asset Requests",
      subtitle: "What restaurants are creating",
      section: <RecentAssetRequestSection />,
    },
    {
      id: "insight",
      label: "Insights",
      title: "Insights",
      subtitle: "Trends and performance snapshots",
      section: <InsightSection />,
    },
  ];

  return (
    <main className="flex-1 w-full max-w-none flex-col gap-8 bg-[var(--page-canvas)] px-4 py-8 sm:px-6">
      <div className="flex flex-col w-full max-w-7xl mx-auto space-y-8">
        <section className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {analyticsCards.map((card) => (
            <AnalyticsCard
              key={card.label}
              label={card.label}
              value={card.value}
              trendText={card.trendText}
              trendTone={card.trendTone}
            />
          ))}
        </section>
        <section>
          <SectionTabs tabs={sectionTabs} defaultTabId="product-management" />
        </section>
      </div>
    </main>
  );
}
