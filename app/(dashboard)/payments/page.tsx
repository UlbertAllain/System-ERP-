import { PaymentManagementClient } from "@/features/finance/components/payment-management-client";
import {
  listInvoicesAction,
  listPaymentsPaginatedAction,
} from "@/features/finance/actions";
import { listClientsAction } from "@/features/clients/actions";
import { listProjectsAction } from "@/features/projects/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentMethod, PaymentStatus } from "@/types/payment";

type PaymentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  await requireAnyPagePermission(["payment.read", "payment.read_all"]);

  const params = (await searchParams) ?? {};
  const search = getParam(params, "search") ?? "";
  const status = getParam(params, "status") as PaymentStatus | undefined;
  const method = getParam(params, "method") as PaymentMethod | undefined;
  const clientId = getParam(params, "clientId");
  const projectId = getParam(params, "projectId");
  const page = getParam(params, "page") ?? "1";
  const pageSize = getParam(params, "pageSize") ?? "10";

  const [paymentsResult, invoicesResult, clientsResult, projectsResult] =
    await Promise.all([
      listPaymentsPaginatedAction({
        search,
        status: status || undefined,
        method: method || undefined,
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        page: Number(page),
        pageSize: Number(pageSize),
      }),
      listInvoicesAction({}),
      listClientsAction({}),
      listProjectsAction({}),
    ]);

  if (!paymentsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {paymentsResult.message}
        </CardContent>
      </Card>
    );
  }

  if (!invoicesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Data Error</CardTitle>
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

  return (
    <PaymentManagementClient
      payments={paymentsResult.data.items}
      invoices={invoicesResult.data}
      clients={clientsResult.data}
      projects={projectsResult.data}
      pagination={{
        totalItems: paymentsResult.data.totalItems,
        page: paymentsResult.data.page,
        pageSize: paymentsResult.data.pageSize,
        totalPages: paymentsResult.data.totalPages,
        search,
        status: status ?? "",
        method: method ?? "",
        clientId: clientId ?? "",
        projectId: projectId ?? "",
      }}
    />
  );
}
