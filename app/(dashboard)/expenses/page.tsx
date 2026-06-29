import { ExpenseManagementClient } from "@/features/finance/components/expense-management-client";
import { listExpensesAction } from "@/features/finance/actions";
import { listProjectsAction } from "@/features/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanySettingAction } from "@/features/settings/actions";

export default async function ExpensesPage() {
  await requireAnyPagePermission(["expense.read"]);

  const [expensesResult, projectsResult, companySettingResult] =
    await Promise.all([
      listExpensesAction({}),
      listProjectsAction({}),
      getCompanySettingAction(),
    ]);

  if (!expensesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {expensesResult.message}
        </CardContent>
      </Card>
    );
  }

  if (!projectsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Data Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {projectsResult.message}
        </CardContent>
      </Card>
    );
  }
  if (!companySettingResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Setting Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {companySettingResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <ExpenseManagementClient
      expenses={expensesResult.data}
      projects={projectsResult.data}
      companySetting={companySettingResult.data}
    />
  );
}
