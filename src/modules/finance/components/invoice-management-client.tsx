"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  createInvoiceAction,
  deleteInvoiceAction,
  getInvoiceByIdAction,
  issueInvoiceAction,
  updateInvoiceAction,
  voidInvoiceAction,
} from "@/modules/finance/actions";
import type { ClientListItem } from "@/types/client";
import type { CompanySetting } from "@/types/company-setting";
import type { InvoiceDetail, InvoiceListItem } from "@/types/invoice";
import type { ProjectListItem } from "@/types/project";
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
import { Textarea } from "@/components/ui/textarea";
import { InvoiceManagementList } from "@/modules/finance/components/invoice-management-list";

type InvoiceManagementClientProps = {
  invoices: InvoiceListItem[];
  clients: ClientListItem[];
  projects: ProjectListItem[];
  companySetting: CompanySetting;
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search: string;
    status: string;
    clientId: string;
    projectId: string;
  };
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

export function InvoiceManagementClient({
  invoices,
  clients,
  projects,
  companySetting,
  pagination,
}: InvoiceManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState(pagination.search);
  const [status, setStatus] = useState(pagination.status);
  const [clientId, setClientId] = useState(pagination.clientId);
  const [projectId, setProjectId] = useState(pagination.projectId);
  const [pageSize, setPageSize] = useState(String(pagination.pageSize));

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

  function updateQuery(next: {
    search?: string;
    status?: string;
    clientId?: string;
    projectId?: string;
    page?: number;
    pageSize?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextStatus = next.status ?? status;
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
      `Hapus tagihan ${invoice.invoiceNumber}? Data akan dinonaktifkan.`,
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


  function handleVoid(invoice: InvoiceListItem) {
    const confirmed = window.confirm(
      `Batalkan tagihan ${invoice.invoiceNumber}? Tindakan ini tidak dapat dibatalkan.`,
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Keuangan
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Tagihan
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola tagihan pelanggan, rincian biaya, status penerbitan, dan pembayaran.
          </p>
        </div>

        <Button onClick={handleCreate} disabled={saving} className="gap-2">
          <Plus className="size-4" />
          Buat Tagihan
        </Button>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <InvoiceManagementList
        invoices={invoices}
        clients={clients}
        projects={projects}
        search={search}
        status={status}
        clientId={clientId}
        projectId={projectId}
        pageSize={pageSize}
        pagination={pagination}
        saving={saving}
        isLoadingDetail={isLoadingDetail}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onClientIdChange={(value) => {
          setClientId(value);
          setProjectId("");
        }}
        onProjectIdChange={setProjectId}
        onPageSizeChange={(value) => {
          setPageSize(value);
          updateQuery({
            page: 1,
            pageSize: value,
          });
        }}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onEdit={handleEdit}
        onIssue={handleIssue}
        onVoid={handleVoid}
        onDelete={handleDelete}
        onPageChange={goToPage}
      />

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);

          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="flex max-h-[92dvh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>
              {selectedInvoice ? "Ubah Tagihan" : "Buat Tagihan"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Lengkapi informasi tagihan dan rincian biaya.
            </p>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="invoiceNumber">Nomor Tagihan</Label>
                <Input
                  id="invoiceNumber"
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    updateForm("invoiceNumber", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientId">Pelanggan</Label>
                <select
                  id="clientId"
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                  value={form.clientId}
                  onChange={(event) => {
                    updateForm("clientId", event.target.value);
                    updateForm("projectId", "");
                  }}
                >
                  <option value="">Pilih pelanggan</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="projectId">Proyek</Label>
                <select
                  id="projectId"
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                  value={form.projectId}
                  onChange={(event) =>
                    updateForm("projectId", event.target.value)
                  }
                >
                  <option value="">Tanpa proyek</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectCode} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Pratinjau Total</Label>
                <div className="flex h-10 items-center rounded-md border px-3 text-sm font-medium">
                  {formatCurrency(formTotal)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="issueDate">Tanggal Terbit</Label>
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
                <Label htmlFor="dueDate">Jatuh Tempo</Label>
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
                <CardTitle className="text-base">Rincian Biaya</CardTitle>
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
                      <Label>Deskripsi</Label>
                      <Input
                        value={item.description}
                        onChange={(event) =>
                          updateLineItem(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                        placeholder="Deskripsi layanan / produk"
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="discountAmount">Nominal Diskon</Label>
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
                <Label htmlFor="taxAmount">Nominal Pajak</Label>
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Catatan internal / pelanggan"
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
              Tutup
            </Button>

            <Button type="button" disabled={saving} onClick={handleSave}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Simpan Tagihan
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
