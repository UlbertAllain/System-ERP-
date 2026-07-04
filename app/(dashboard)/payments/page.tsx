import { PaymentManagementClient } from "@/features/finance/components/payment-management-client";
import {
  listInvoicesAction,
  listPaymentsAction,
} from "@/features/finance/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PaymentsPage() {
  await requireAnyPagePermission(["payment.read", "payment.read_all"]);

  const [paymentsResult, invoicesResult] = await Promise.all([
    listPaymentsAction({}),
    listInvoicesAction({}),
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

  return (
    <PaymentManagementClient
      payments={paymentsResult.data}
      invoices={invoicesResult.data}
    />
  );
}
