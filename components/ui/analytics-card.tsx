import { cn } from "@/lib/utils";

import { Card } from "@/components/ui/card";

type AnalyticsCardSize = "small" | "medium" | "large";
type AnalyticsTrendTone = "neutral" | "positive" | "negative";

type AnalyticsCardProps = {
  label: string;
  value: string;
  helperText?: string;
  trendText?: string;
  size?: AnalyticsCardSize;
  trendTone?: AnalyticsTrendTone;
  className?: string;
};

const trendToneClasses: Record<AnalyticsTrendTone, string> = {
  neutral: "text-black/80",
  positive: "text-emerald-600",
  negative: "text-rose-600",
};

export function AnalyticsCard({
  label,
  value,
  trendText,
  trendTone = "neutral",
  className,
}: AnalyticsCardProps) {
  return (
    <Card className={cn("h-full w-full shadow-none p-6", className)}>
      <div className="flex h-full flex-col justify-between gap-10">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted">{label}</p>
          <p className="text-2xl font-semibold leading-none text-foreground">
            {value}
          </p>
        </div>
        <div className="space-y-1">
          {trendText ? (
            <p className={cn("text-xs font-medium", trendToneClasses[trendTone])}>{trendText}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
