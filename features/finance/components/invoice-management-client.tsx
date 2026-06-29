"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Edit,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  createInvoiceAction,
  deleteInvoiceAction,
  getInvoiceByIdAction,
  issueInvoiceAction,
  markInvoicePaidAction,
  updateInvoiceAction,
  voidInvoiceAction,
} from "@/features/finance/actions";
import type { ClientListItem } from "@/types/client";
import type { CompanySetting } from "@/types/company-setting";
import type { InvoiceDetail, InvoiceListItem } from "@/types/invoice";
import type { ProjectListItem } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

type InvoiceManagementClientProps = {
  invoices: InvoiceListItem[];
  clients: ClientListItem[];
  projects: ProjectListItem[];
  companySetting: CompanySetting;
};

type InvoiceLineItemFormState = {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type InvoiceFormState = {
  invoiceNumber: string;
  clientId: string;
  projectId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  discountAmount: string;
  taxAmount: string;
  paidAmount: string;
  lineItems: InvoiceLineItemFormState[];
};

type InvoiceLineItemInput = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
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

function formatDateInput(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

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

function generateInvoiceNumber(prefix: string) {
  const normalizedPrefix = prefix.trim().toUpperCase() || "INV";
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");

  return `${normalizedPrefix}-${year}${month}-${random}`;
}

function createEmptyLineItem(): InvoiceLineItemFormState {
  return {
    id: undefined,
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

function createInitialForm(companySetting: CompanySetting): InvoiceFormState {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 14);

  return {
    invoiceNumber: generateInvoiceNumber(companySetting.invoicePrefix),
    clientId: "",
    projectId: "",
    issueDate: today.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    notes: "",
    discountAmount: "0",
    taxAmount: "0",
    paidAmount: "0",
    lineItems: [createEmptyLineItem()],
  };
}
function mapInvoiceDetailToForm(invoice: InvoiceDetail): InvoiceFormState {
  return {
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    projectId: invoice.projectId ?? "",
    issueDate: formatDateInput(invoice.issueDate),
    dueDate: formatDateInput(invoice.dueDate),
    notes: invoice.notes ?? "",
    discountAmount: String(invoice.discountAmount ?? 0),
    taxAmount: String(invoice.taxAmount ?? 0),
    paidAmount: String(invoice.paidAmount ?? 0),
    lineItems:
      invoice.lineItems.length > 0
        ? invoice.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
          }))
        : [createEmptyLineItem()],
  };
}

function getStatusVariant(status: string) {
  if (status === "PAID") {
    return "default";
  }

  if (status === "VOID") {
    return "destructive";
  }

  return "outline";
}

export function InvoiceManagementClient({
  invoices,
  clients,
  projects,
  companySetting,
}: InvoiceManagementClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");

  const [form, setForm] = useState<InvoiceFormState>(() =>
    createInitialForm(companySetting),
  );

  const projectOptions = useMemo(() => {
    if (!form.clientId) {
      return projects;
    }

    return projects.filter((project) => project.clientId === form.clientId);
  }, [form.clientId, projects]);

  const formSubtotal = useMemo(() => {
    return form.lineItems.reduce((total, item) => {
      return total + parseNumber(item.quantity) * parseNumber(item.unitPrice);
    }, 0);
  }, [form.lineItems]);
  const formTotal = useMemo(() => {
    return (
      formSubtotal -
      parseNumber(form.discountAmount) +
      parseNumber(form.taxAmount)
    );
  }, [form.discountAmount, form.taxAmount, formSubtotal]);

  const saving = isPending || isLoadingDetail;

  function updateForm<K extends keyof InvoiceFormState>(
    key: K,
    value: InvoiceFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateLineItem(
    index: number,
    key: keyof InvoiceLineItemFormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          [key]: value,
        };
      }),
    }));
  }

  function addLineItem() {
    setForm((current) => ({
      ...current,
      lineItems: [...current.lineItems, createEmptyLineItem()],
    }));
  }

  function removeLineItem(index: number) {
    setForm((current) => {
      if (current.lineItems.length <= 1) {
        return current;
      }

      return {
        ...current,
        lineItems: current.lineItems.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      };
    });
  }

  function buildLineItemsPayload(): InvoiceLineItemInput[] {
    return form.lineItems
      .map((item) => ({
        id: item.id,
        description: item.description.trim(),
        quantity: parseNumber(item.quantity),
        unitPrice: parseNumber(item.unitPrice),
      }))
      .filter((item) => item.description.length > 0);
  }

  function resetForm() {
    setSelectedInvoice(null);
    setPaidAmount("");
    setForm(createInitialForm(companySetting));
  }

  function handleCreate() {
    resetForm();
    setMessage(null);
    setIsFormOpen(true);
  }

  async function handleEdit(invoice: InvoiceListItem) {
    setMessage(null);
    setIsLoadingDetail(true);

    const result = await getInvoiceByIdAction({
      id: invoice.id,
    });

    setIsLoadingDetail(false);

    if (!result.success) {
      setMessage(result.message);
      return;
    }

    setSelectedInvoice(result.data);
    setForm(mapInvoiceDetailToForm(result.data));
    setIsFormOpen(true);
  }

  function handleSave() {
    setMessage(null);

    const lineItems = buildLineItemsPayload();

    if (lineItems.length === 0) {
      setMessage("Minimal 1 line item wajib diisi.");
      return;
    }

    startTransition(async () => {
      const payload = {
        invoiceNumber: form.invoiceNumber,
        clientId: form.clientId,
        projectId: emptyToNull(form.projectId),
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        notes: emptyToNull(form.notes),
        discountAmount: parseNumber(form.discountAmount),
        taxAmount: parseNumber(form.taxAmount),
        paidAmount: parseNumber(form.paidAmount),
        lineItems,
      };

      const result = selectedInvoice
        ? await updateInvoiceAction({
            id: selectedInvoice.id,
            ...payload,
          })
        : await createInvoiceAction(payload);

      setMessage(result.message);

      if (result.success) {
        resetForm();
        setIsFormOpen(false);
      }
    });
  }

  function handleDelete(invoice: InvoiceListItem) {
    const confirmed = window.confirm(
      `Hapus invoice ${invoice.invoiceNumber}? Data akan soft delete.`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteInvoiceAction({
        id: invoice.id,
      });

      setMessage(result.message);
    });
  }

  function handleIssue(invoice: InvoiceListItem) {
    setMessage(null);

    startTransition(async () => {
      const result = await issueInvoiceAction({
        id: invoice.id,
      });

      setMessage(result.message);
    });
  }

  function openPaidDialog(invoice: InvoiceListItem) {
    setSelectedInvoice({
      ...invoice,
      lineItems: [],
    } as InvoiceDetail);
    setPaidAmount(String(invoice.remainingAmount || invoice.totalAmount));
    setIsPaidDialogOpen(true);
  }

  function handleMarkPaid() {
    if (!selectedInvoice) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await markInvoicePaidAction({
        id: selectedInvoice.id,
        paidAmount: parseNumber(paidAmount),
      });

      setMessage(result.message);

      if (result.success) {
        setIsPaidDialogOpen(false);
        setSelectedInvoice(null);
        setPaidAmount("");
      }
    });
  }

  function handleVoid(invoice: InvoiceListItem) {
    const confirmed = window.confirm(
      `Void invoice ${invoice.invoiceNumber}? Action ini akan membatalkan invoice.`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await voidInvoiceAction({
        id: invoice.id,
      });

      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Finance
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Invoices
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola invoice client, line items, status, dan pembayaran.
          </p>
        </div>

        <Button onClick={handleCreate} disabled={saving} className="gap-2">
          <Plus className="size-4" />
          New Invoice
        </Button>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Invoice List
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-[260px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Issue: {formatDate(invoice.issueDate)}
                      </p>
                    </TableCell>

                    <TableCell>{invoice.clientName}</TableCell>

                    <TableCell>
                      <p className="font-medium">
                        {invoice.projectCode ?? "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.projectName ?? "-"}
                      </p>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell>{formatCurrency(invoice.paidAmount)}</TableCell>
                    <TableCell>
                      {formatCurrency(invoice.remainingAmount)}
                    </TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => handleEdit(invoice)}
                        >
                          {isLoadingDetail ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Edit className="size-4" />
                          )}
                          Edit
                        </Button>

                        {invoice.status === "DRAFT" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => handleIssue(invoice)}
                          >
                            <Send className="size-4" />
                            Issue
                          </Button>
                        ) : null}

                        {invoice.status !== "PAID" &&
                        invoice.status !== "VOID" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => openPaidDialog(invoice)}
                          >
                            <CheckCircle2 className="size-4" />
                            Paid
                          </Button>
                        ) : null}

                        {invoice.status !== "VOID" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => handleVoid(invoice)}
                          >
                            <XCircle className="size-4" />
                            Void
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={saving}
                          onClick={() => handleDelete(invoice)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada invoice.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);

          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>
              {selectedInvoice ? "Edit Invoice" : "Create Invoice"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Isi informasi invoice dan line items.
            </p>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    updateForm("invoiceNumber", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientId">Client</Label>
                <select
                  id="clientId"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.clientId}
                  onChange={(event) => {
                    updateForm("clientId", event.target.value);
                    updateForm("projectId", "");
                  }}
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="projectId">Project</Label>
                <select
                  id="projectId"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.projectId}
                  onChange={(event) =>
                    updateForm("projectId", event.target.value)
                  }
                >
                  <option value="">No project</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectCode} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Total Preview</Label>
                <div className="flex h-10 items-center rounded-md border px-3 text-sm font-medium">
                  {formatCurrency(formTotal)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={form.issueDate}
                  onChange={(event) =>
                    updateForm("issueDate", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    updateForm("dueDate", event.target.value)
                  }
                />
              </div>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addLineItem}
                >
                  <Plus className="size-4" />
                  Add Item
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                {form.lineItems.map((item, index) => (
                  <div
                    key={`${item.id ?? "new"}-${index}`}
                    className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_120px_160px_120px_auto]"
                  >
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(event) =>
                          updateLineItem(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                        placeholder="Service / product description"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(event) =>
                          updateLineItem(index, "quantity", event.target.value)
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateLineItem(index, "unitPrice", event.target.value)
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Subtotal</Label>
                      <div className="flex h-10 items-center rounded-md border px-3 text-sm">
                        {formatCurrency(
                          parseNumber(item.quantity) *
                            parseNumber(item.unitPrice),
                        )}
                      </div>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        disabled={form.lineItems.length <= 1}
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="discountAmount">Discount Amount</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  min="0"
                  value={form.discountAmount}
                  onChange={(event) =>
                    updateForm("discountAmount", event.target.value)
                  }
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taxAmount">Tax Amount</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  min="0"
                  value={form.taxAmount}
                  onChange={(event) =>
                    updateForm("taxAmount", event.target.value)
                  }
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paidAmount">Paid Amount</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  min="0"
                  value={form.paidAmount}
                  onChange={(event) =>
                    updateForm("paidAmount", event.target.value)
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Internal/client notes"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>

            <Button type="button" disabled={saving} onClick={handleSave}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Invoice
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPaidDialogOpen}
        onOpenChange={(open) => {
          setIsPaidDialogOpen(open);

          if (!open) {
            setSelectedInvoice(null);
            setPaidAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Masukkan nominal pembayaran yang diterima.
            </p>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <p className="font-medium">
                {selectedInvoice?.invoiceNumber ?? "-"}
              </p>
              <p className="text-muted-foreground">
                Total:{" "}
                {selectedInvoice
                  ? formatCurrency(selectedInvoice.totalAmount)
                  : "-"}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paidAmount">Paid Amount</Label>
              <Input
                id="paidAmount"
                type="number"
                min="0"
                value={paidAmount}
                onChange={(event) => setPaidAmount(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setIsPaidDialogOpen(false);
                  setSelectedInvoice(null);
                  setPaidAmount("");
                }}
              >
                Cancel
              </Button>

              <Button type="button" disabled={saving} onClick={handleMarkPaid}>
                {isPending ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Mark Paid
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
