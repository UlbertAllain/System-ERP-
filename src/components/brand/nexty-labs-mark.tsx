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
      className={cn("inline-flex min-w-0 items-center gap-2.5", className)}
      aria-label="Nexty Labs ERP"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-current/25 bg-current/10">
        <svg
          aria-hidden="true"
          viewBox="0 0 32 32"
          className="size-5"
          fill="none"
        >
          <path
            d="M7.5 24V8l8.5 11.5L24.5 8v16"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 8h4.5M19.5 24H24"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact ? (
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-[0.78rem] font-bold uppercase tracking-[0.08em]",
              inverted ? "text-white" : "text-foreground",
            )}
          >
            Nexty ERP
          </p>
          <p
            className={cn(
              "mt-0.5 truncate text-[0.57rem] font-semibold uppercase tracking-[0.13em]",
              inverted ? "text-white/55" : "text-muted-foreground",
            )}
          >
            Operations Console
          </p>
        </div>
      ) : null}
    </div>
  );
}
