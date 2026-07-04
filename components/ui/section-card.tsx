import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = React.ComponentProps<typeof Card>;

export function SectionCard({ className, ...props }: SectionCardProps) {
  return (
    <Card
      className={cn("rounded-lg border-border/70 bg-card shadow-sm", className)}
      {...props}
    />
  );
}
