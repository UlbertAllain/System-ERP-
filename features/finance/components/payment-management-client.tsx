"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Edit,
  FilterX,
  Loader2,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  cancelPaymentAction,
  createPaymentAction,
  deletePaymentAction,
  updatePaymentAction,
} from "@/features/finance/actions";
import type { ClientListItem } from "@/types/client";
import type { InvoiceListItem } from "@/types/invoice";
import type {
  PaymentListItem,
  PaymentMethod,
} from "@/types/payment";
import type { ProjectListItem } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type PaymentManagementClientProps = {
  payments: PaymentListItem[];
  invoices: InvoiceListItem[];
  clients: ClientListItem[];
  projects: ProjectListItem[];
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search: string;
    status: string;
    method: string;
    clientId: string;
    projectId: string;
  };
};

type PaymentFormState = {
  id?: string;
  invoiceId: string;
  amount: string;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber: string;
  notes: string;
};

const paymentMethods: PaymentMethod[] = [
  "CASH",
  "BANK_TRANSFER",
  "QRIS",
  "EWALLET",
  "CARD",
  "OTHER",
];

const initialForm: PaymentFormState = {
  invoiceId: "",
  amount: "0",
  paymentDate: new Date().toISOString().slice(0, 10),
  method: "BANK_TRANSFER",
  referenceNumber: "",
  notes: "",
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function parseNumber(value: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDateInput(value: Date | null): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusVariant(status: PaymentListItem["status"]) {
  if (status === "CONFIRMED") {
    return "secondary" as const;
  }

  return "destructive" as const;
}

export function PaymentManagementClient({
  payments,
  invoices,
  clients,
  projects,
  pagination,
}: PaymentManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<PaymentFormState>(initialForm);
  const [search, setSearch] = useState(pagination.search);
  const [status, setStatus] = useState(pagination.status);
  const [method, setMethod] = useState(pagination.method);
  const [clientId, setClientId] = useState(pagination.clientId);
  const [projectId, setProjectId] = useState(pagination.projectId);
  const [pageSize, setPageSize] = useState(String(pagination.pageSize));

  const payableInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status !== "VOID")
      .filter((invoice) => invoice.remainingAmount > 0)
      .sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
  }, [invoices]);

  const selectedInvoice = useMemo(() => {
    return invoices.find((invoice) => invoice.id === form.invoiceId) ?? null;
  }, [form.invoiceId, invoices]);

  const sortedPayments = useMemo(() => {
    return payments;
  }, [payments]);

  function updateQuery(next: {
    search?: string;
    status?: string;
    method?: string;
    clientId?: string;
    projectId?: string;
    page?: number;
    pageSize?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextStatus = next.status ?? status;
    const nextMethod = next.method ?? method;
    const nextClientId = next.clientId ?? clientId;
    const nextProjectId = next.projectId ?? projectId;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextPage = next.page ?? 1;

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    }

    if (nextMethod) {
      params.set("method", nextMethod);
    }

    if (nextClientId) {
      params.set("clientId", nextClientId);
    }

    if (nextProjectId) {
      params.set("projectId", nextProjectId);
    }

    params.set("page", String(nextPage));
    params.set("pageSize", nextPageSize);

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleApplyFilters() {
    updateQuery({
      page: 1,
    });
  }

  function handleResetFilters() {
    setSearch("");
    setStatus("");
    setMethod("");
    setClientId("");
    setProjectId("");
    setPageSize("10");
    router.push(`${pathname}?page=1&pageSize=10`);
  }

  function goToPage(page: number) {
    updateQuery({
      page,
    });
  }

  function resetForm() {
    const defaultInvoice = payableInvoices[0];

    setForm({
      ...initialForm,
      invoiceId: defaultInvoice?.id ?? "",
      amount: defaultInvoice ? String(defaultInvoice.remainingAmount) : "0",
    });
    setMode("create");
    setMessage(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpenDialog(true);
  }

  function openEditDialog(payment: PaymentListItem) {
    setMode("edit");
    setMessage(null);
    setForm({
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: String(payment.amount),
      paymentDate: formatDateInput(payment.paymentDate),
      method: payment.method,
      referenceNumber: payment.referenceNumber ?? "",
      notes: payment.notes ?? "",
    });
    setOpenDialog(true);
  }

  function handleInvoiceChange(invoiceId: string) {
    const invoice = invoices.find((item) => item.id === invoiceId);

    setForm((current) => ({
      ...current,
      invoiceId,
      amount: invoice ? String(invoice.remainingAmount) : "0",
    }));
  }

  function handleSubmit() {
    setMessage(null);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createPaymentAction({
          invoiceId: form.invoiceId,
          amount: parseNumber(form.amount),
          paymentDate: form.paymentDate,
          method: form.method,
          referenceNumber: emptyToNull(form.referenceNumber),
          notes: emptyToNull(form.notes),
        });

        setMessage(result.message);

        if (result.success) {
          setOpenDialog(false);
          resetForm();
          router.refresh();
        }

        return;
      }

      if (!form.id) {
        setMessage("Payment ID tidak ditemukan.");
        return;
      }

      const result = await updatePaymentAction({
        id: form.id,
        amount: parseNumber(form.amount),
        paymentDate: form.paymentDate,
        method: form.method,
        referenceNumber: emptyToNull(form.referenceNumber),
        notes: emptyToNull(form.notes),
      });

      setMessage(result.message);

      if (result.success) {
        setOpenDialog(false);
        resetForm();
        router.refresh();
      }
    });
  }

  function handleCancel(payment: PaymentListItem) {
    const confirmed = window.confirm(
      `Yakin ingin membatalkan payment untuk invoice ${payment.invoiceNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await cancelPaymentAction({
        id: payment.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleDelete(payment: PaymentListItem) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus payment untuk invoice ${payment.invoiceNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deletePaymentAction({
        id: payment.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  const canCreatePayment = payableInvoices.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Finance
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Payments
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Catat payment invoice dan sinkronkan status pembayaran otomatis.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={openCreateDialog}
              disabled={!canCreatePayment}
            >
              <Plus className="size-4" />
              New Payment
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Create Payment" : "Edit Payment"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Payment wajib terhubung ke invoice. Invoice VOID tidak bisa
                menerima payment.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                {!canCreatePayment && mode === "create" ? (
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Belum ada invoice yang bisa dibayar. Buat invoice dulu atau
                    pastikan invoice belum lunas dan bukan VOID.
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="invoiceId">Invoice</Label>
                  <select
                    id="invoiceId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={form.invoiceId}
                    onChange={(event) =>
                      handleInvoiceChange(event.target.value)
                    }
                    disabled={mode === "edit"}
                  >
                    <option value="">Pilih invoice</option>

                    {mode === "edit" && selectedInvoice ? (
                      <option value={selectedInvoice.id}>
                        {selectedInvoice.invoiceNumber} —{" "}
                        {selectedInvoice.clientName}
                      </option>
                    ) : null}

                    {payableInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} — {invoice.clientName} — Sisa{" "}
                        {formatCurrency(invoice.remainingAmount)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedInvoice ? (
                  <Card>
                    <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
                      <div>
                        <p className="text-muted-foreground">Client</p>
                        <p className="font-medium">
                          {selectedInvoice.clientName}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Invoice</p>
                        <p className="font-medium">
                          {formatCurrency(selectedInvoice.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining</p>
                        <p className="font-medium">
                          {formatCurrency(selectedInvoice.remainingAmount)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={0}
                      value={form.amount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={form.paymentDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          paymentDate: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="method">Method</Label>
                    <select
                      id="method"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.method}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          method: event.target.value as PaymentMethod,
                        }))
                      }
                    >
                      {paymentMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={form.referenceNumber}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        referenceNumber: event.target.value,
                      }))
                    }
                    placeholder="TRX-001 / No. rekening / kode referensi"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Catatan payment"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t bg-background px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDialog(false)}
                disabled={isPending}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isPending || (mode === "create" && !canCreatePayment)}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Create Payment"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="size-5" />
            Payments
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_150px_170px_180px_220px_120px_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApplyFilters();
                  }
                }}
                placeholder="Search invoice, client, reference"
                className="pl-9"
              />
            </div>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All status</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              <option value="">All methods</option>
              {paymentMethods.map((paymentMethod) => (
                <option key={paymentMethod} value={paymentMethod}>
                  {paymentMethod}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setProjectId("");
              }}
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">All projects</option>
              {projects
                .filter((project) =>
                  clientId ? project.clientId === clientId : true,
                )
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectCode} - {project.name}
                  </option>
                ))}
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={pageSize}
              onChange={(event) => {
                setPageSize(event.target.value);
                updateQuery({
                  page: 1,
                  pageSize: event.target.value,
                });
              }}
            >
              <option value="10">10 rows</option>
              <option value="20">20 rows</option>
              <option value="50">50 rows</option>
            </select>

            <Button type="button" variant="outline" onClick={handleApplyFilters}>
              <Search className="size-4" />
              Apply
            </Button>

            <Button type="button" variant="ghost" onClick={handleResetFilters}>
              <FilterX className="size-4" />
              Reset
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-medium">{payment.invoiceNumber}</p>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.clientCompany ?? "-"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      {payment.projectName ? (
                        <div>
                          <p className="font-medium">{payment.projectName}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.projectCode}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell>{formatCurrency(payment.amount)}</TableCell>

                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>

                    <TableCell>{payment.method}</TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>

                    <TableCell>{payment.referenceNumber ?? "-"}</TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(payment)}
                          disabled={isPending || payment.status === "CANCELLED"}
                        >
                          <Edit className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(payment)}
                          disabled={isPending || payment.status === "CANCELLED"}
                        >
                          <XCircle className="size-4" />
                          Cancel
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(payment)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {sortedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada payment.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>
              Showing {payments.length} of {pagination.totalItems} payments
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>

              <span>
                Page {pagination.page} / {pagination.totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
