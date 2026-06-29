import { ClientManagementClient } from "@/features/clients/components/client-management-client";
import { listClientsAction } from "@/features/clients/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClientsPage() {
  await requireAnyPagePermission(["client.read", "client.read_all"]);

  const result = await listClientsAction({});

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {result.message}
        </CardContent>
      </Card>
    );
  }

  return <ClientManagementClient clients={result.data} />;
}
