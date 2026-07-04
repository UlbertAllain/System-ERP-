import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/ui/section-card";

type StatsCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
};

export function StatsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: StatsCardProps) {
  const positive = (trend ?? 0) >= 0;

  return (
    <SectionCard className="group p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>

          <h3 className="text-3xl font-black tracking-tight">{value}</h3>

          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold",
                    positive
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-red-500/10 text-red-500",
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {Math.abs(trend)}%
                </span>

                <span className="text-xs text-muted-foreground">
                  vs last month
                </span>
              </>
            )}

            {subtitle && trend === undefined && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-lime-500/10 text-lime-600 transition duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>
    </SectionCard>
  );
}
