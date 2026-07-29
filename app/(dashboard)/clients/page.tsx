import { ClientManagementClient } from "@/features/clients/components/client-management-client";
import { listClientsPaginatedAction } from "@/features/clients/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientStatus } from "@/types/client";

type ClientsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  await requireAnyPagePermission(["client.read", "client.read_all"]);

  const params = (await searchParams) ?? {};
  const result = await listClientsPaginatedAction({
    search: getSearchParam(params, "search"),
    status: getSearchParam(params, "status") as ClientStatus | undefined,
    page: Number(getSearchParam(params, "page") ?? 1),
    pageSize: Number(getSearchParam(params, "pageSize") ?? 10),
  });

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Data Pelanggan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {result.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <ClientManagementClient
      clients={result.data.items}
      pagination={{
        totalItems: result.data.totalItems,
        page: result.data.page,
        pageSize: result.data.pageSize,
        totalPages: result.data.totalPages,
        search: getSearchParam(params, "search") ?? "",
        status: getSearchParam(params, "status") ?? "",
      }}
    />
  );
}
