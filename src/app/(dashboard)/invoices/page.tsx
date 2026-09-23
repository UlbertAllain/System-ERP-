import { InvoiceManagementClient } from "@/features/finance/components/invoice-management-client";
import { listInvoicesPaginatedAction } from "@/features/finance/actions";
import { listClientsAction } from "@/features/clients/actions";
import { listProjectsAction } from "@/features/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanySettingAction } from "@/features/settings/actions";
import type { InvoiceStatus } from "@/types/invoice";

type InvoicesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  await requireAnyPagePermission([
    "invoice.read",
    "invoice.read_all",
    "invoice.read_project",
  ]);

  const params = (await searchParams) ?? {};
  const search = getParam(params, "search") ?? "";
  const status = getParam(params, "status") as InvoiceStatus | undefined;
  const clientId = getParam(params, "clientId");
  const projectId = getParam(params, "projectId");
  const page = getParam(params, "page") ?? "1";
  const pageSize = getParam(params, "pageSize") ?? "10";

  const [invoicesResult, clientsResult, projectsResult, companySettingResult] =
    await Promise.all([
      listInvoicesPaginatedAction({
        search,
        status: status || undefined,
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        page: Number(page),
        pageSize: Number(pageSize),
      }),
      listClientsAction({}),
      listProjectsAction({}),
      getCompanySettingAction(),
    ]);

  if (!invoicesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Tagihan</CardTitle>
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
          <CardTitle>Kesalahan Data Pelanggan</CardTitle>
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
          <CardTitle>Kesalahan Data Proyek</CardTitle>
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
          <CardTitle>Kesalahan Pengaturan Perusahaan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {companySettingResult.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <InvoiceManagementClient
      invoices={invoicesResult.data.items}
      clients={clientsResult.data}
      projects={projectsResult.data}
      companySetting={companySettingResult.data}
      pagination={{
        totalItems: invoicesResult.data.totalItems,
        page: invoicesResult.data.page,
        pageSize: invoicesResult.data.pageSize,
        totalPages: invoicesResult.data.totalPages,
        search,
        status: status ?? "",
        clientId: clientId ?? "",
        projectId: projectId ?? "",
      }}
    />
  );
}
