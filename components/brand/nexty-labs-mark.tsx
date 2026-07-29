import { cn } from "@/lib/utils";

type NextyLabsMarkProps = {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
};

export function NextyLabsMark({
  className,
  compact = false,
  inverted = false,
}: NextyLabsMarkProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-3", className)}
      aria-label="Nexty Labs ERP"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className="size-10 shrink-0"
        fill="none"
      >
        <path
          d="M9 36.5 19.6 10h8.8L39 36.5"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m15.2 36.5 8.8-21 8.8 21M16.5 29.2h15"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".72"
        />
        <path
          d="M11.4 15.3 17 9.8M36.6 15.3 31 9.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {!compact ? (
        <div className="min-w-0">
          <p
            className={cn(
              "font-display truncate text-[1.05rem] font-semibold uppercase tracking-[0.12em]",
              inverted ? "text-white" : "text-foreground",
            )}
          >
            Nexty Labs
          </p>
          <p
            className={cn(
              "mt-0.5 truncate text-[0.65rem] font-medium uppercase tracking-[0.2em]",
              inverted ? "text-white/55" : "text-muted-foreground",
            )}
          >
            Enterprise Resource Planning
          </p>
        </div>
      ) : null}
    </div>
  );
}
