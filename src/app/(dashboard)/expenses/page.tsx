import { ExpenseManagementClient } from "@/modules/finance/components/expense-management-client";
import { listExpensesPaginatedAction } from "@/modules/finance/actions";
import { listProjectsAction } from "@/modules/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanySettingService } from "@/modules/settings/services/company-setting-service";
import type { ExpenseCategory, ExpenseStatus } from "@/types/expense";
import type { PermissionSlug } from "@/constants/permissions";

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
  const projectReadPermissions: PermissionSlug[] = [
    "project.read",
    "project.read_all",
    "project.read_assigned",
  ];
  const canReadProjects = projectReadPermissions.some((permission) =>
    currentUser.permissions.includes(permission),
  );

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
            message: "Data proyek tidak ditampilkan karena akun ini tidak memiliki izin.",
            data: [],
          }),
      getCompanySettingService(),
    ]);

  if (!expensesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Pengeluaran</CardTitle>
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
          <CardTitle>Kesalahan Data Proyek</CardTitle>
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
