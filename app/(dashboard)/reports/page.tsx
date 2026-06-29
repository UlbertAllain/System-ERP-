import { ReportsDashboardClient } from "@/features/reports/components/reports-dashboard-client";
import { getReportsDashboardSummaryAction } from "@/features/reports/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReportsPageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireAnyPagePermission(["report.dashboard.read"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const from = resolvedSearchParams.from;
  const to = resolvedSearchParams.to;

  const reportsResult = await getReportsDashboardSummaryAction({
    from,
    to,
  });

  if (!reportsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {reportsResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <ReportsDashboardClient
      summary={reportsResult.data}
      initialFrom={from}
      initialTo={to}
    />
  );
}
