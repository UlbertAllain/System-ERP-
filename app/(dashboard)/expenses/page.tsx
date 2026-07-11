import { ExpenseManagementClient } from "@/features/finance/components/expense-management-client";
import { listExpensesPaginatedAction } from "@/features/finance/actions";
import { listProjectsAction } from "@/features/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanySettingService } from "@/features/settings/services/company-setting-service";
import type { ExpenseCategory, ExpenseStatus } from "@/types/expense";

type ExpensesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
  const currentUser = await requireAnyPagePermission([
    "expense.read",
    "expense.read_all",
    "expense.read_own",
  ]);

  const params = (await searchParams) ?? {};
  const search = getParam(params, "search") ?? "";
  const status = getParam(params, "status") as ExpenseStatus | undefined;
  const category = getParam(params, "category") as ExpenseCategory | undefined;
  const projectId = getParam(params, "projectId");
  const page = getParam(params, "page") ?? "1";
  const pageSize = getParam(params, "pageSize") ?? "10";
  const canReadProjects = [
    "project.read",
    "project.read_all",
    "project.read_assigned",
  ].some((permission) => currentUser.permissions.includes(permission));

  const [expensesResult, projectsResult, companySettingResult] =
    await Promise.all([
      listExpensesPaginatedAction({
        search,
        status: status || undefined,
        category: category || undefined,
        projectId: projectId || undefined,
        page: Number(page),
        pageSize: Number(pageSize),
      }),
      canReadProjects
        ? listProjectsAction({})
        : Promise.resolve({
            success: true as const,
            message: "Projects tidak dimuat untuk permission akun ini.",
            data: [],
          }),
      getCompanySettingService(),
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
  return (
    <ExpenseManagementClient
      expenses={expensesResult.data.items}
      projects={projectsResult.data}
      companySetting={companySettingResult}
      pagination={{
        totalItems: expensesResult.data.totalItems,
        page: expensesResult.data.page,
        pageSize: expensesResult.data.pageSize,
        totalPages: expensesResult.data.totalPages,
        search,
        status: status ?? "",
        category: category ?? "",
        projectId: projectId ?? "",
      }}
    />
  );
}
