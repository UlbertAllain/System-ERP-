import { AuditLogManagementClient } from "@/features/audit-logs/components/audit-log-management-client";
import { listAuditLogsAction } from "@/features/audit-logs/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuditLogsPage() {
  await requireAnyPagePermission(["audit_log.read"]);

  const auditLogsResult = await listAuditLogsAction({
    limit: 200,
  });

  if (!auditLogsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {auditLogsResult.message}
        </CardContent>
      </Card>
    );
  }

  return <AuditLogManagementClient auditLogs={auditLogsResult.data} />;
}
