import { AuditLogManagementClient } from "@/features/audit-logs/components/audit-log-management-client";
import { listAuditLogsPaginatedAction } from "@/features/audit-logs/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuditLogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function AuditLogsPage({
  searchParams,
}: AuditLogsPageProps) {
  await requireAnyPagePermission(["audit_log.read"]);

  const params = (await searchParams) ?? {};
  const search = getParam(params, "search") ?? "";
  const moduleName = getParam(params, "module") ?? "";
  const action = getParam(params, "action") ?? "";
  const userId = getParam(params, "userId") ?? "";
  const page = getParam(params, "page") ?? "1";
  const pageSize = getParam(params, "pageSize") ?? "10";

  const auditLogsResult = await listAuditLogsPaginatedAction({
    search,
    module: moduleName || undefined,
    action: action || undefined,
    userId: userId || undefined,
    page: Number(page),
    pageSize: Number(pageSize),
  });

  if (!auditLogsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Audit Aktivitas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {auditLogsResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <AuditLogManagementClient
      auditLogs={auditLogsResult.data.items}
      pagination={{
        totalItems: auditLogsResult.data.totalItems,
        page: auditLogsResult.data.page,
        pageSize: auditLogsResult.data.pageSize,
        totalPages: auditLogsResult.data.totalPages,
        search,
        module: moduleName,
        action,
        userId,
      }}
    />
  );
}
