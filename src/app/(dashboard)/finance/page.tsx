import { FinanceDashboardClient } from "@/modules/finance/components/finance-dashboard-client";
import { getFinanceDashboardSummaryAction } from "@/modules/finance/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FinancePageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
};

export default async function FinancePage({ searchParams }: FinancePageProps) {
  await requireAnyPagePermission(["finance.dashboard.read"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const from = resolvedSearchParams.from;
  const to = resolvedSearchParams.to;

  const summaryResult = await getFinanceDashboardSummaryAction({
    from,
    to,
  });

  if (!summaryResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Ringkasan Keuangan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {summaryResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <FinanceDashboardClient
      summary={summaryResult.data}
      initialFrom={from}
      initialTo={to}
    />
  );
}
