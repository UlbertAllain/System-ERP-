import { InvoiceManagementClient } from "@/features/finance/components/invoice-management-client";
import { listInvoicesAction } from "@/features/finance/actions";
import { listClientsAction } from "@/features/clients/actions";
import { listProjectsAction } from "@/features/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanySettingAction } from "@/features/settings/actions";

export default async function InvoicesPage() {
  await requireAnyPagePermission([
    "invoice.read",
    "invoice.read_all",
    "invoice.read_project",
  ]);

  const [invoicesResult, clientsResult, projectsResult, companySettingResult] =
    await Promise.all([
      listInvoicesAction({}),
      listClientsAction({}),
      listProjectsAction({}),
      getCompanySettingAction(),
    ]);

  if (!invoicesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {invoicesResult.message}
        </CardContent>
      </Card>
    );
  }

  if (!clientsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Data Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {clientsResult.message}
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
    <InvoiceManagementClient
      invoices={invoicesResult.data}
      clients={clientsResult.data}
      projects={projectsResult.data}
      companySetting={companySettingResult.data}
    />
  );
}
